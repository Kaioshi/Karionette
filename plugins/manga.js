// combined mangafox / mangastream
"use strict";
var	mangaDB = {
		mangafox: new fragDB("mangafox"),
		mangastream: new fragDB("mangastream"),
		batoto: new fragDB("batoto")
	},
	watched = {
		mangafox: mangaDB.mangafox.getKeysObj(),
		mangastream: mangaDB.mangastream.getKeysObj(),
		batoto: mangaDB.batoto.getKeysObj()
	},
	check = {
		all: function (notify) {
			var all = [ "mangafox", "mangastream", "batoto" ]
				.filter(function (m) { return Object.keys(watched[m]).length; });
			web.json("http://felt.ninja:5667/").then(function (resp) {
				all.forEach(function (type) {
					findUpdates(resp.filter(function (rel) { return rel.source === type; }), type, notify);
				});
			}).catch(function (err) {
				logger.error("check.all(): "+err, err);
			});
		},
		one: function (type, notify) {
			if (!watched[type] || !Object.keys(watched[type]).length) {
				if (notify)
					irc.say(notify, "I'm not tracking any releases on "+type+".");
				return;
			}
			web.json("http://felt.ninja:5667/?source="+type).then(function (resp) {
				findUpdates(resp, type, notify);
			}).catch(function (err) {
				logger.error("check."+type+": "+err, err);
			});
		}
	};

timers.startTick(300); // start a 5 minute ticker

function updateAnnouncements(announce, msg, updates) {
	for (var i = 0; i < announce.length; i++) {
		if (announce[i][0] === "#") {
			if (lib.hasElement(ial.Channels(), announce[i]))
				updates.push([ "say", announce[i], msg ]);
			else
				logger.debug("Tried to send a manga update to "+announce[i]+", but I'm not on it.");
		} else {
			if (ial.Channels(announce[i]).length) {
				updates.push([ "notice", announce[i], msg ]); // notice users
			} else { // user not found :S
				emitEvent("Event: queueMessage", {
					method: "notice",
					nick: announce[i],
					message: msg
				});
			}
		}
	}
}

function isNewRelease(date, latest, title) {
	var i, newest;
	if (!latest || !Array.isArray(latest) || !latest.length)
		return true;
	for (i = 0, newest = 0; i < latest.length; i++) {
		if (latest[i].title === title)
			return false;
		if (latest[i].date > newest)
			newest = latest[i].date;
	}
	if (date > newest)
		return true;
	return false;
}

function setLatest(type, title, release, date) {
	if (!Array.isArray(watched[type][title].latest)) // old format
		watched[type][title].latest = [];
	watched[type][title].latest.push({ title: release.title, link: release.link, date: date });
	if (watched[type][title].latest.length > 5)
		watched[type][title].latest.shift();
}

function findUpdates(releases, type, notify) {
	var updates = [], hits = [],
		index, date, reltitle, msg;
	Object.keys(releases).forEach(function (r) {
		Object.keys(watched[type]).forEach(function (title) {
			index = releases[r].title.toLowerCase().indexOf(title);
			if (index === -1)
				return; // NEXT!
			if (!lib.hasElement(hits, title))
				hits.push(title);
			reltitle = releases[r].title.slice(index, index+title.length);
			date = new Date(releases[r].date).valueOf();
			if (!watched[type][title].title)
				watched[type][title] = mangaDB[type].getOne(title);
			if (isNewRelease(date, watched[type][title].latest, releases[r].title)) { // new release~
				watched[type][title].title = reltitle; // make the case nice if the user put in something weird.
				index = releases[r].link.indexOf("?"); // weird unrequired trailing ?foo=butts&butts=foo stuff.
				if (index > -1)
					releases[r].link = releases[r].link.slice(0, index);
				setLatest(type, title, releases[r], date);
				mangaDB[type].saveOne(title, watched[type][title]);
				msg = lib.decode(releases[r].title)+" is out! \\o/ ~ "+releases[r].link;
				updateAnnouncements(watched[type][title].announce, msg, updates);
			}
		});
	});
	if (hits.length) {
		hits.forEach(function (title) {
			mangaDB[type].clearCache(title);
			watched[type][title] = "";
		});
	}
	if (updates.length) {
		irc.rated(updates);
	} else if (typeof notify === "string") {
		irc.say(notify, "Nothing new. :\\");
	}
}

bot.event({
	handle: "mangaCheck",
	event: "Ticker: 300s tick", // check for updates every 5 min
	callback: check.all
});

bot.event({ // check for updates when we start and joins are done
	handle: "mangaCheckOnStart",
	event: "autojoinFinished",
	callback: check.all
});

bot.command({
	command: "batoto",
	help: "Batoto RSS watcher",
	syntax: config.command_prefix+"batoto <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] -"+
		" Example: "+config.command_prefix+"batoto add One Piece",
	callback: parseMangaCmd
});

bot.command({
	command: [ "mf", "mangafox" ],
	help: "Mangafox RSS watcher",
	syntax: config.command_prefix+"mangafox <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] -"+
		" Example: "+config.command_prefix+"mangafox add One Piece",
	callback: parseMangaCmd
});

bot.command({
	command: [ "ms", "mangastream" ],
	help: "MangaStream RSS watcher",
	syntax: config.command_prefix+"mangastream <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] -"+
		" Example: "+config.command_prefix+"mangastream add One Piece",
	callback: parseMangaCmd
});

function parseMangaCmd(input) {
	var type, title, ltitle, titles, target, ltarget, i, l;

	switch (input.command) {
	case "mf":
	case "mangafox":
		type = [ "mf", "mangafox", "MangaFox" ];
		break;
	case "ms":
	case "mangastream":
		type = [ "ms", "mangastream", "MangaStream" ];
		break;
	case "batoto":
		type = [ "batoto", "batoto", "Batoto" ];
		break;
	}

	if (!input.args || input.args[0].toLowerCase() === "announce" && !input.args[1]) {
		irc.say(input.context, bot.cmdHelp(type[0], "syntax"));
		return;
	}
	switch (input.args[0].toLowerCase()) {
	case "announce":
		switch (input.args[1].toLowerCase()) {
		case "add":
			if (input.args.length < 4) {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce add <manga title> <target> - Example: "+
					config.command_prefix+type[1]+" announce add One Piece #pyoshi");
				return;
			}
			title = input.args.slice(2,-1).join(" ");
			ltitle = title.toLowerCase();
			if (watched[type[1]][ltitle] === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			target = input.args[input.args.length-1];
			watched[type[1]][ltitle] = mangaDB[type[1]].getOne(ltitle);
			if (lib.hasElement(watched[type[1]][ltitle].announce, target)) {
				irc.say(input.context, "I'm already announcing "+title+" releases to "+target+".");
				return;
			}
			watched[type[1]][ltitle].announce.push(target);
			mangaDB[type[1]].saveOne(ltitle, watched[type[1]][ltitle]);
			watched[type[1]][ltitle] = "";
			irc.say(input.context, "Added! o7");
			break;
		case "remove":
			if (input.args.length < 4) {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce remove <manga title> <target> - Example: "+
					config.command_prefix+type[1]+" announce remove Fairy Tail #pyoshi");
				return;
			}
			title = input.args.slice(2,-1).join(" ");
			ltitle = title.toLowerCase();
			if (watched[type[1]][ltitle] === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			target = input.args[input.args.length-1];
			ltarget = target.toLowerCase();
			watched[type[1]][ltitle] = mangaDB[type[1]].getOne(ltitle);
			i = 0; l = watched[type[1]][ltitle].announce.length;
			for (; i < l; i++) {
				if (watched[type[1]][ltitle].announce[i].toLowerCase() === ltarget) {
					if (l === 1) {
						irc.say(input.context, "Removed ~ "+title+" now has an empty announce list, so I'm removing it from the watch list.");
						delete watched[type[1]][ltitle];
					} else {
						watched[type[1]][ltitle].announce.splice(i, 1);
						irc.say(input.context, "Removed. o7");
					}
					mangaDB[type[1]].saveOne(ltitle, watched[type[1]][ltitle]);
					break;
				}
			}
			watched[type[1]][ltitle] = "";
			mangaDB[type[1]].clearCache();
			irc.say(input.context, target+" isn't on the announce list for "+title+".");
			break;
		case "list":
			if (input.args.length < 3) {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce list <manga title> - Example: "+
					config.command_prefix+type[1]+" announce list One Piece");
				return;
			}
			title = input.args.slice(2).join(" ");
			ltitle = title.toLowerCase();
			if (watched[type[1]][ltitle] === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			watched[type[1]][ltitle] = mangaDB[type[1]].getOne(ltitle);
			irc.say(input.context, watched[type[1]][ltitle].title+" releases are announced to "+
				lib.commaList(lib.sort(watched[type[1]][ltitle].announce))+".");
			watched[type[1]][ltitle] = "";
			mangaDB[type[1]].clearCache();
			break;
		default:
			irc.say(input.context, "[Help] "+config.command_prefix+type[1]+
				" announce <add/remove/list> <manga title> [<target>] - Example: "+config.command_prefix+type[1]+
				" announce add One Piece #pyoshi");
			break;
		}
		break;
	case "add":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" add <manga title> - Example: "+
				config.command_prefix+type[1]+" add One Piece - Check "+
				(type[0] === "mf" ? "http://mangafox.me/directory/" : "http://mangastream.com/manga")+" to see what's available.");
			return;
		}
		title = input.args.slice(1).join(" ");
		ltitle = title.toLowerCase();
		if (watched[type[1]][ltitle] !== undefined) {
			irc.say(input.context, "I'm already tracking "+title+" updates.");
			return;
		}
		watched[type[1]][ltitle] = { title: title, announce: [ input.context ] };
		mangaDB[type[1]].saveOne(ltitle, watched[type[1]][ltitle]);
		irc.say(input.context, "Added! o7");
		check.one(type[1]);
		break;
	case "remove":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+"mangafox remove <manga title> - Example: "+
				config.command_prefix+"mangafox remove Fairy Tail");
			return;
		}
		ltitle = input.args.slice(1).join(" ").toLowerCase();
		if (watched[type[1]][ltitle] === undefined) {
			irc.say(input.context, "I'm not tracking "+input.args.slice(1).join(" ")+".");
			return;
		}
		delete watched[type[1]][ltitle];
		mangaDB[type[1]].removeOne(ltitle);
		irc.say(input.context, "Removed. o7");
		break;
	case "list":
		titles = [];
		watched[type[1]] = mangaDB[type[1]].getAll();
		for (title in watched[type[1]]) {
			if (watched[type[1]].hasOwnProperty(title))
				titles.push(watched[type[1]][title].title);
		}
		if (titles.length > 0) {
			irc.say(input.context, "I'm tracking releases of "+lib.commaList(lib.sort(titles))+" from "+type[2]+".");
		} else {
			irc.say(input.context, "I'm not tracking any "+type[2]+" releases right now. Add some!");
		}
		titles = null;
		watched[type[1]] = mangaDB[type[1]].getKeysObj();
		mangaDB[type[1]].clearCache();
		break;
	case "check":
		check.one(type[1], input.context);
		break;
	default:
		irc.say(input.context, bot.cmdHelp(type[0], "syntax"));
		break;
	}
}
