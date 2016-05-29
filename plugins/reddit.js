// Subreddit announcer
"use strict";

var subDB = new DB.Json({filename: "subreddits"});

function r(sub) {
	return "https://www.reddit.com/r/"+sub+"/new/.rss";
}

function shortenURL(link) {
	let reg = /^https:\/\/www\.reddit\.com\/r\/[^\/]+\/comments\/([^\/]+)\/[^\/]+\//.exec(link);
	if (!reg)
		return link;
	return "https://redd.it/"+reg[1];
}

function announceReleases(entry, releases) {
	let announce = [];
	releases.forEach(function (post) {
		entry.announce.forEach(function (target) { // ranma is at least half to blame for this format.
			let releaseMsg = shortenURL(post.link)+" - r/"+entry.subreddit+" - "+post.name.slice(3)+" ~ "+post.title;
			announce.push([ "say", target, lib.decode(releaseMsg) ]); // like, 70%. or more. probably more.
		});
	});
	if (announce.length)
		irc.rated(announce);
}

function checkSubs() {
	if (!subDB.size())
		return;
	let entries = subDB.getAll(),
		delay = 2000;
	Object.keys(entries).forEach(function (sub) {
		setTimeout(function () {
			web.fetch(r(sub)).then(web.atom2json).then(function (releases) {
				if (!releases.length) // no posts
					return;
				if (entries[sub].lastAnnounced === releases[0].updated) // nothing new
					return;
				let index = -1;
				for (let i = 0; i < releases.length; i++) {
					if (releases[i].updated === entries[sub].lastAnnounced)
						index = i;
				} // either lastAnnounced is unset or there were way too many new posts since last announce
				if (index === -1 || index > 5) {
					let n = (releases.length > 5 ? 5 : releases.length);
					announceReleases(entries[sub], releases.slice(0, n));
				} else {
					announceReleases(entries[sub], releases.slice(0, index));
				}
				entries[sub].lastAnnounced = releases[0].updated;
				subDB.saveOne(sub, entries[sub]);
			}).catch(function (error) {
				logger.error(r(sub)+" - "+error, error);
			});
		}, delay);
		delay += 2000;
	});
}

function addSub(sub, user, channel) {
	var entry, lchan = channel.toLowerCase(), lsub = sub.toLowerCase();

	if (subDB.hasOne(lsub)) {
		entry = subDB.getOne(lsub);
		if (entry.announce.indexOf(lchan) > -1)
			return "I'm already watching r/"+sub+" in here.";
		entry.announce.push(lchan);
		subDB.saveOne(lsub, entry);
		return "Added "+channel+" to the announce list for r/"+sub;
	}

	subDB.saveOne(lsub, {
		subreddit: lsub,
		addedBy: user,
		addedIn: lchan,
		announce: [ lchan ]
	});
	checkSubs();
	return "Added. o7";
}

function removeSub(sub) {
	var lsub = sub.toLowerCase();
	if (subDB.hasOne(lsub)) {
		subDB.removeOne(lsub);
		return "Removed. o7";
	}
	return "I'm not watching r/"+sub;
}

function reddits(subs) {
	return lib.commaList(subs.map(sub => "r/"+sub));
}

function listSubs(target) {
	var ltarget, entries, ret;
	if (target) { // go through the entries and list them if they're announced to target
		ltarget = target.toLowerCase();
		entries = subDB.getAll();
		ret = [];
		Object.keys(entries).forEach(function (entry) {
			if (entries[entry].announce.indexOf(ltarget) > -1)
				ret.push(entries[entry].subreddit);
		});
		if (!ret.length)
			return "I'm not announcing any subreddit updates to "+target+".";
		return reddits(ret)+" updates are being sent to "+target+".";
	}
	if (!subDB.size())
		return "I'm not announcing updates to any subreddits.";
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
	syntax: `${config.command_prefix}subreddit <add/remove/list> [subreddit] - Example: ${config.command_prefix}subreddit add aww`,
	admin: true,
	arglen: 1,
	callback: function subreddit(input) {
		var lsub;
		switch (input.args[0].toLowerCase()) {
		case "list":
			if (input.args[1] !== undefined)
				irc.say(input.context, listSubs(input.args[1]));
			else
				irc.say(input.context, listSubs());
			break;
		case "add":
			if (input.args[1] === undefined) {
				irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
				return;
			}
			lsub = input.args[1].toLowerCase();
			if (subDB.hasOne(lsub)) { // don't need to check if it's already tracked
				irc.say(input.context, addSub(lsub, input.user, input.context));
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
				irc.say(input.context, addSub(lsub, input.user, input.context));
			}).catch(function (error) {
				logger.error(error, error);
				irc.say(input.context, "Something has gone awry.");
			});
			break;
		case "remove":
			if (input.args[1] === undefined) {
				irc.say(input.context, bot.cmdHelp("subreddit", "syntax"));
				return;
			}
			irc.say(input.context, removeSub(input.args[1]));
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
