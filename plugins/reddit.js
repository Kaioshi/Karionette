// Subreddit announcer
"use strict";

let subDB = new DB.Json({filename: "subreddits"});

function r(sub) {
	return "https://www.reddit.com/r/"+sub+"/new/.json?limit=10";
}

function shortenRedditLink(link, sub, id) {
	if (link.indexOf("reddituploads.com") > -1)
		return "https://redd.it/"+id;
	if (link.indexOf("www.reddit.com/r/") === -1)
		return link;
	let reg = /https\:\/\/www\.reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)\//.exec(link);
	if (reg && reg[2]) {
		if (reg[1].toLowerCase() !== sub)
			return "https://redd.it/"+reg[2]+" (r/"+reg[1]+")";
		return "https://redd.it/"+reg[2];
	}
	return link;
}

function announceReleases(entry, releases, sub) {
	let announce = [];
	for (let i = 0; i < releases.length; i++) {
		let post = releases[i];
		for (let k = 0; k < entry.announce.length; k++) {
			let target = entry.announce[k],
				releaseMsg = "r/"+sub+" - "+post.title+" ~ "+shortenRedditLink(post.link, entry.subreddit, post.id);
			if (target[0] === "#" && ial.User(config.nick).ison(target))
				announce.push([ "say", target, lib.decode(releaseMsg) ]);
			else {
				if (ial.User(target)) // only if they're online
					announce.push([ "notice", target, lib.decode(releaseMsg) ]);
				else
					bot.queueMessage({ method: "notice", nick: target, message: lib.decode(releaseMsg) });
			}
		}
	}
	return announce;
}

function findNewPosts(fetched, entries) {
	let announcements = [];
	for (let i = 0; i < fetched.length; i++) {
		if (!fetched[i].posts.length) // no posts
			continue;
		let release = fetched[i],
			newPosts = [],
			sub = release.sub.toLowerCase(),
			seen = entries[sub].seen || [];
		for (let k = 0; k < release.posts.length; k++) {
			let post = release.posts[k];
			if (seen.indexOf(post.id) === -1) {// new post
				newPosts.push(post);
				seen.push(post.id);
			}
		}
		if (newPosts.length) {
			announcements = announcements.concat(announceReleases(entries[sub], newPosts, release.sub));
			if (seen.length > 10) // don't need more than the last 10 entries since we only fetch 10
				seen = seen.slice(seen.length-10);
			entries[sub].seen = seen;
		}
	}
	if (announcements.length) {
		subDB.saveAll(entries);
		irc.rated(announcements, 1000);
	}
}

function trimJson(res) {
	let ret = [],
		hits = res.data.children;
	for (let i = 0; i < hits.length; i++) {
		ret.push({
			id: hits[i].data.id,
			title: hits[i].data.title,
			link: hits[i].data.url
		});
	}
	res = null;
	return { sub: hits[0].data.subreddit, posts: ret };
}

function fetchJson(sub) {
	return web.json(r(sub)).then(trimJson);
}

function getSubsToCheck(entries) {
	let keys = Object.keys(entries),
		ret = [];
	for (let i = 0; i < keys.length; i++) {
		if (entries[keys[i]].announce && entries[keys[i]].announce.length)
			ret.push(fetchJson(keys[i]));
	}
	return ret;
}

function checkSubs() {
	if (!subDB.size())
		return;
	let entries = subDB.getAll();
	Promise.all(getSubsToCheck(entries))
	.then(function (fetched) {
		findNewPosts(fetched, entries);
	}).catch(function (error) {
		logger.error("checkSubs: "+error, error);
	});
}

function subscribe(nick, sub) {
	let entry = subDB.getOne(sub),
		lnick;
	if (!entry)
		return "I'm not watching r/"+sub;
	lnick = nick.toLowerCase();
	if (entry.announce.indexOf(lnick) > -1)
		return "You're already on the announce list for r/"+sub;
	entry.announce.push(lnick);
	if (entry.announce.length === 1) // first entry!
		checkSubs();
	subDB.saveOne(sub, entry);
	return "Added! o7";
}

function unsubscribe(nick, sub) {
	let entry = subDB.getOne(sub);
	if (!entry)
		return "I'm not watching r/"+sub;
	let lnick = nick.toLowerCase(),
		index = entry.announce.indexOf(lnick);
	if (index === -1)
		return "You're not on the announce list for r/"+sub;
	entry.announce.splice(index, 1);
	subDB.saveOne(sub, entry);
	return "Removed. o7";
}

function addSubreddit(sub, user) {
	subDB.saveOne(sub, {
		subreddit: sub,
		addedBy: user,
		announce: [],
		seen: []
	});
	return "Added! To get announcements from r/"+sub+", users need to "+config.command_prefix+"subreddit subscribe "+sub;
}

function removeSubreddit(sub) {
	if (subDB.hasOne(sub)) {
		subDB.removeOne(sub);
		return "Removed. o7";
	}
	return "I'm not watching r/"+sub;
}

function reddits(subs) {
	return lib.commaList(subs.map(sub => "r/"+sub));
}

function listSubreddits(target) {
	if (!subDB.size())
		return "I'm not announcing updates to any subreddits.";
	if (target) { // go through the entries and list them if they're announced to target
		let entries = subDB.getAll(),
			ltarget = target.toLowerCase(),
			ret = [];
		Object.keys(entries).forEach(function (entry) {
			if (entries[entry].announce.indexOf(ltarget) > -1)
				ret.push(entries[entry].subreddit);
		});
		if (!ret.length)
			return "I'm not announcing any subreddit updates to "+target+".";
		return reddits(ret)+" updates are being sent to "+target+".";
	}
	return "I'm announcing updates to "+reddits(subDB.getKeys())+".";
}

ticker.start(300); // 5 minute ticker

bot.event({
	handle: "subredditCheck",
	event: "Ticker: 300s tick",
	callback: checkSubs
});

bot.event({
	handle: "subredditCheckOnStart",
	event: "autojoinFinished",
	callback: checkSubs
});

bot.command({
	command: "subreddit",
	help: "Subreddit announcer.",
	syntax: `${config.command_prefix}subreddit <add/remove/subscribe/unsubscribe/list> [subreddit] [target] - Example: ${config.command_prefix}subreddit add aww - add and remove are admin only.`,
	arglen: 1,
	callback: function subreddit(input) {
		switch (input.args[0].toLowerCase()) {
		case "list":
			if (input.args[1] !== undefined)
				irc.say(input.context, listSubreddits(input.args[1]));
			else
				irc.say(input.context, listSubreddits());
			break;
		case "add":
			if (!logins.isAdmin(input.nick)) {
				irc.say(input.context, "You need to be an admin to add or remove subreddits I track. See subscribe if you want announcements from a tracked subreddit.");
				return;
			}
			if (input.args[1] === undefined) {
				irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
				return;
			}
			let lsub = input.args[1].toLowerCase();
			if (subDB.hasOne(lsub)) {
				irc.say(input.context, "I'm already watching for updates to r/"+lsub);
				return;
			} // need to check if the sub exists
			web.fetch(r(lsub)).then(function (body) {
				if (body.indexOf("https://www.reddit.com/subreddits/search?q=") > -1) {
					irc.say(input.context, "r/"+input.args[1]+" doesn't seem to be a thing.");
					return;
				}
				if (body.indexOf(": banned</title>") > -1) {
					irc.say(input.context, "r/"+input.args[1]+" is a banned subreddit.");
					return;
				}
				irc.say(input.context, addSubreddit(lsub, input.user, input.context));
			}).catch(function (error) {
				logger.error(error, error);
				irc.say(input.context, "Something has gone awry.");
			});
			break;
		case "remove":
			if (!logins.isAdmin(input.nick)) {
				irc.say(input.context, "You need to be an admin to add or remove subreddits I track. See subscribe if you want announcements from a tracked subreddit.");
				return;
			}
			if (input.args[1] === undefined) {
				irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
				return;
			}
			irc.say(input.context, removeSubreddit(input.args[1].toLowerCase()));
			break;
		case "subscribe":
			if (input.args[1] === undefined) {
				irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
				return;
			}
			irc.say(input.context, subscribe(input.nick, input.args[1].toLowerCase()));
			break;
		case "unsubscribe":
			if (input.args[1] === undefined) {
				irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
				return;
			}
			irc.say(input.context, unsubscribe(input.nick, input.args[1].toLowerCase()));
			break;
		case "check":
			checkSubs();
			break;
		default:
			irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
			break;
		}
	}
});

// ;nocontext - pulls a random nocontext
bot.command({
	command: "nocontext",
	help: "Pulls a random r/nocontext title.",
	syntax: `${config.command_prefix}nocontext`,
	callback: function nocontext(input) {
		web.json("https://www.reddit.com/r/nocontext/random/.json").then(function (result) {
			irc.say(input.context, result[0].data.children[0].data.title);
		}).catch(function (error) {
			logger.error(";nocontext: "+error, error);
		});
	}
});
