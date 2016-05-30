// Subreddit announcer
"use strict";

var subDB = new DB.Json({filename: "subreddits"});

function r(sub) {
	return "https://www.reddit.com/r/"+sub+"/new/.rss";
}

function getPostID(link) {
	let reg = /^https:\/\/www\.reddit\.com\/r\/[^\/]+\/comments\/([^\/]+)\/[^\/]+\//.exec(link);
	if (!reg) {
		logger.warn("Couldn't extract PostID from "+link);
		return link;
	}
	return reg[1];
}

function announceReleases(entry, releases) {
	let announce = [];
	releases.forEach(function (post) {
		entry.announce.forEach(function (target) { // ranma is at least half to blame for this format.
			let releaseMsg = "https://redd.it/"+getPostID(post.link)+" - r/"+entry.subreddit+" - "+post.name.slice(3)+" ~ "+post.title;
			if (target[0] === "#")
				announce.push([ "say", target, lib.decode(releaseMsg) ]); // like, 70%. or more. probably more.
			else if (ial.User(target)) // only if they're online
				announce.push([ "notice", target, lib.decode(releaseMsg) ]);
		});
	});
	return announce;
}

function checkSubs() {
	let entries, announcements, size = subDB.size();
	if (!size)
		return;
	entries = subDB.getAll();
	announcements = [];
	Object.keys(entries).forEach(function (sub) {
		if (!entries[sub].announce.length)
			return; // noone to announce to - so we don't care
		web.fetch(r(sub)).then(web.atom2json).then(function (releases) {
			if (!releases.length) // no posts
				return;
			let newPosts = [],
				seen = entries[sub].seen || [];
			for (let i = 0; i < releases.length; i++) {
				let postID = getPostID(releases[i].link);
				if (seen.indexOf(postID) === -1) {// new post
					newPosts.push(releases[i]);
					seen.push(postID);
				}
			}
			if (newPosts.length) {
				announcements = announcements.concat(announceReleases(entries[sub], newPosts));
				entries[sub].seen = seen;
				subDB.saveOne(sub, entries[sub]);
			}
			size--;
			if (size === 0)
				irc.rated(announcements, 1000);
		}).catch(function (error) {
			logger.error(r(sub)+" - "+error, error);
		});
	});
}

function subscribe(nick, sub) {
	let entry = subDB.getOne(sub);
	if (!entry)
		return "I'm not watching r/"+sub;
	entry.announce.push(nick.toLowerCase());
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
		announce: []
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
			ret = [];
		Object.keys(entries).forEach(function (entry) {
			if (entries[entry].announce.indexOf(target) > -1)
				ret.push(entries[entry].subreddit);
		});
		if (!ret.length)
			return "I'm not announcing any subreddit updates to "+target+".";
		return reddits(ret)+" updates are being sent to "+target+".";
	}
	return "I'm announcing updates to "+reddits(subDB.getKeys())+".";
}

timers.startTick(300); // 5 minute ticker

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
				irc.say(input.context, listSubreddits(input.args[1].toLowerCase()));
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
		web.fetch("https://www.reddit.com/r/nocontext/random/.rss")
		.then(web.atom2json).then(function (result) {
			irc.say(input.context, lib.decode(result[0].title));
		});
	}
});
