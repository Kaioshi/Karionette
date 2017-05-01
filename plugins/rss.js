"use strict";

/* ;rss add <handle> <link> - allow multiple URLs under one handle
 * ;rss remove <handle> [<link>]
 * ;rss subscribe <handle> [<method>]
 * ;rss unsubscribe <handle>
 * ;rss list
 */

const [ticker, lib, ial, logins, DB, web] = plugin.importMany("ticker", "lib", "ial", "logins", "DB", "web");

const rssDB = DB.Json({filename: "RSS"});
const help = {
	add: `${config.command_prefix}rss add <handle> <http://link.to/feed.rss> - Example: ${config.command_prefix}rss add guardian https://www.theguardian.com/international/rss`,
	remove: `${config.command_prefix}rss remove <handle> - Example: ${config.command_prefix}rss remove guardian`,
	subscribe: `${config.command_prefix}rss subscribe <handle> [<msg|notice>]- Example: ${config.command_prefix}rss subscribe guardian notice - msg is the default`,
	unsubscribe: `${config.command_prefix}rss unsubscribe <handle> - Example: ${config.command_prefix}rss unsubscribe guardian`
};

ticker.start(300); // 5 minute ticker

bot.event({
	handle: "rssUpdateCheck",
	event: "Ticker: 300s tick",
	callback: checkForUpdates
});

bot.event({
	handle: "rssCheckOnStart",
	event: "autojoinFinished",
	callback: checkForUpdates
});

function trimFeed(feed) {
	return feed.items.map(item => {
		return {
			title: lib.decode(item.title),
			date: item.pubDate,
			link: item.link.includes("feedproxy.google.com") && item.guid && isLink(item.guid) ? item.guid : item.link
		};
	});
}

function announceUpdate(method, nicks, message) {
	for (let i = 0; i < nicks.length; i++) {
		if (ial.User(nicks[i])) // not online? too bad, so sad
			irc[method](nicks[i], message, true);
	}
}

async function checkForUpdates() {
	const feedgroups = rssDB.getKeys();
	for (let i = 0; i < feedgroups.length; i++) {
		const feedgroup = feedgroups[i];
		const feed = rssDB.getOne(feedgroup);
		const links = Object.keys(feed.links);
		let changed = false;
		if (!links.length || (!feed.announce.msg.length && !feed.announce.notice.length))
			continue; // nothing to do
		for (let k = 0; k < links.length; k++) {
			const link = links[k];
			const res = await web.rss2json(link);
			if (res.status !== "ok")
				continue;
			const posts = trimFeed(res);
			for (let n = 0; n < posts.length; n++) {
				const post = posts[n];
				if (feed.links[link].seen.includes(post.link))
					continue;
				feed.links[link].seen.push(post.link);
				const message = `${post.title} ~ ${post.link}`;
				if (feed.announce.msg.length)
					announceUpdate("say", feed.announce.msg, message);
				if (feed.announce.notice.length)
					announceUpdate("notice", feed.announce.notice, message);
				changed = true;
			} // rss2json.com returns 20 at a time, should give a safe buffer
			if (changed && feed.links[link].seen.length > 25)
				feed.links[link].seen = feed.links[link].seen.slice(-25);
		}
		if (changed)
			rssDB.saveOne(feedgroup, feed);
	}
}

function getAnnounceMethod(feed, target) {
	if (feed.announce.msg.includes(target))
		return "msg";
	if (feed.announce.notice.includes(target))
		return "notice";
}

async function testLink(link) {
	const result = await web.rss2json(link);
	if (result.status === "ok")
		return true;
	return false;
}

async function addFeed(handle, link) {
	const feed = rssDB.getOne(handle) || {
		links: {},
		announce: {
			msg: [],
			notice: []
		}
	};
	if (feed.links[link])
		return `The ${handle} feed group is already checking that link for updates.`;
	const validLink = await testLink(link);
	if (!validLink)
		return "That doesn't seem to be a valid rss/atom link.";
	feed.links[link] = { seen: [] };
	rssDB.saveOne(handle, feed);
	return `Added! o7 To get announcements, users need to subscribe: ${help.subscribe.replace("guardian", handle)}`;
}

function removeFeed(handle, link) {
	const feed = rssDB.getOne(handle);
	if (!feed)
		return `There is no "${handle}" feed group.`;
	if (!link) {
		rssDB.removeOne(handle);
		return "Removed. o7";
	}
	if (!feed.links[link])
		return `The ${handle} feed group isn't checking that link for updates.`;
	delete feed.links[link];
	if (!Object.keys(feed.links).length) {
		rssDB.removeOne(handle);
		return `Removed the ${handle} feed group entirely since that was its last link.`;
	}
	rssDB.saveOne(handle, feed);
	return "Removed. o7";
}

function subscribe(target, handle, method) {
	const feed = rssDB.getOne(handle);
	if (!feed)
		return `There is no ${handle} feed group to subscribe to, feed groups: ${rssDB.getKeys().join(", ") || "none"}`;
	const existingMethod = getAnnounceMethod(feed, target);
	if (existingMethod)
		return `I'm already announcing ${handle} updates to ${target} via ${existingMethod}`;
	feed.announce[method || "msg"].push(target);
	rssDB.saveOne(handle, feed);
	checkForUpdates();
	return "Subscribed! o7";
}

function unsubscribe(target, handle) {
	const feed = rssDB.getOne(handle);
	if (!feed)
		return `There is no ${handle} feed group to unsubscribe from, feed groups: ${rssDB.getKeys().join(", ") || "none"}`;
	const msgIndex = feed.announce.msg.indexOf(target);
	const noticeIndex = feed.announce.notice.indexOf(target);
	if (msgIndex > -1) {
		feed.announce.msg.splice(msgIndex, 1);
		rssDB.saveOne(handle, feed);
		return "Unsubscribed. o7";
	}
	if (noticeIndex > -1) {
		feed.announce.notice.splice(noticeIndex, 1);
		rssDB.saveOne(handle, feed);
		return "Unsubscribed. o7";
	}
	return `I'm not announcing ${handle} updates to ${target}.`;
}

function isLink(text) {
	return text !== undefined && (text.startsWith("http://") || text.startsWith("https://"));
}

function parseArgs(args) {
	let method;
	let link;
	const type = args[0].toLowerCase();
	const handle = args[1];
	if (args[2] !== undefined) {
		if (isLink(args[2]))
			link = args[2];
		else
			method = /msg|notice/i.test(args[2]) ? args[2] : "msg";
	}
	if (!handle)
		return { error: bot.cmdHelp("rss", "syntax") };
	if (type === "add" && !link)
		return { error: help.add };
	return { type, handle, link, method };
}

bot.command({
	command: "rss",
	help: "RSS feed reader",
	syntax: `${config.command_prefix}rss <add/remove/update/list/subscribe/unsubscribe> <handle> [<link>] - each handle can have multiple links - ${config.command_prefix}rss add <existing handle> <new link>`,
	arglen: 1,
	callback: async function (input) {
		if (input.args[0].toLowerCase() === "list") { // special case
			if (!input.args[1]) {
				const handles = rssDB.getKeys();
				return irc.say(input.context, handles.length ? `I'm announcing updates from: ${handles.join(", ")}` : `There are no feed groups added. Add one! ${help.add}`);
			}
			const handle = input.args[1].toLowerCase();
			const feed = rssDB.getOne(handle);
			if (!feed)
				return irc.say(input.context, `There is no ${input.args[1]} feed group.`);
			return irc.say(input.context, `The ${input.args[1]} feed group is announcing updates from these links: ${Object.keys(feed.links).join(", ")}`);
		}
		const args = parseArgs(input.args);
		if (args.error)
			return irc.say(input.context, args.error);

		switch (args.type) {
		case "add": {
			if (!logins.isAdmin(input.nick))
				return irc.say(input.context, "You need to be an admin to add feed groups/links.");
			return irc.say(input.context, await addFeed(args.handle, args.link));
		}
		case "remove":
			if (!logins.isAdmin(input.nick))
				return irc.say(input.context, "You need to be an admin to remove feed groups/links.");
			return irc.say(input.context, removeFeed(args.handle, args.link));
		case "subscribe":
			return irc.say(input.context, subscribe(input.nick, args.handle, args.method));
		case "unsubscribe":
			return irc.say(input.context, unsubscribe(input.nick, args.handle));
		default: // shouldn't reach this
			return irc.say(input.context, bot.cmdHelp("rss", "syntax"));
		}
	}
});
