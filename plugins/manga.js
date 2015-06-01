// combined mangafox / mangastream
"use strict";
var	mangaDB = {
		mangafox: new fragDB("mangafox", "data/mangafox.json"),
		mangastream: new fragDB("mangastream", "data/mangastream.json"),
		batoto: new fragDB("batoto", "data/batoto.json")
	},
	watched = {
		mangafox: mangaDB.mangafox.getKeysObj(),
		mangastream: mangaDB.mangastream.getKeysObj(),
		batoto: mangaDB.batoto.getKeysObj()
	},
	check = {
		mangafox: function (notify) {
			if (Object.keys(watched.mangafox).length > 0) {
				web.get("http://felt.ninja:5667/?source=mangafox", function (error, response, body) {
					findUpdates(JSON.parse(body), "mangafox", notify);
				});
			}
		},
		mangastream: function (notify) {
			if (Object.keys(watched.mangastream).length > 0) {
				web.get("http://felt.ninja:5667/?source=mangastream", function (error, response, body) {
					findUpdates(JSON.parse(body), "mangastream", notify);
				});
			}
		},
		batoto: function (notify) {
			var rss, i, l, engReleases;
			if (Object.keys(watched.batoto).length > 0) {
				web.get("http://bato.to/recent_rss", function (err, resp, body) {
					rss = body.replace(/\n|<\!\[CDATA\[|\]\]>/g, "");
					rss = rss.slice(rss.indexOf("<item>"), rss.lastIndexOf("</item>")).replace(/<item>/g, "").split("</item>");
					engReleases = [];
					for (i = 0, l = rss.length; i < l; i++) {
						rss[i] = JSON.parse("{"+rss[i].replace(/<\/([^<]+)>/g, "").replace(/<([^<]+)>([^<]+)/g, "\"$1\":\"$2\",").slice(0,-1)+"}");
						if (rss[i].title.indexOf("- English -") > -1) {
							rss[i].title = rss[i].title.replace("- English - ", "").trim();
							rss[i].pubDate = new Date(rss[i].pubDate).valueOf();
							delete rss[i].guid;
							delete rss[i].description;
							engReleases.push(rss[i]);
						}
					}
					findUpdates(engReleases, "batoto", notify);
				});
			}
		},
		all: function (notify) {
			check.mangafox(notify);
			check.mangastream(notify);
			check.batoto(notify);
		}
	};

timers.startTick(300); // start a 5 minute ticker

function findUpdates(releases, type, notify) {
	var i = 0, l = releases.length, updates, hits = [],
		index, date, release, title, reltitle, msg;
	for (; i < l; i++) {
		for (title in watched[type]) {
			index = releases[i].title.toLowerCase().indexOf(title);
			if (index > -1) {
				if (!lib.hasElement(hits, title))
					hits.push(title);
				reltitle = releases[i].title.slice(index, index+title.length);
				release = releases[i].title.slice(index+title.length+1);
				date = new Date(releases[i].date).valueOf();
				if (!watched[type][title].title)
					watched[type][title] = mangaDB[type].getOne(title);
				if (!watched[type][title].latest || date > watched[type][title].latest.date) {
					// new release~
					if (!updates)
						updates = [];
					// make the case nice if the user put in something weird.
					if (watched[type][title].title !== reltitle)
						watched[type][title].title = reltitle;
					// sometimes there's weird unrequired trailing ?foo=butts&butts=foo stuff.
					index = releases[i].link.indexOf("?");
					watched[type][title].latest = {
						title: releases[i].title,
						link: (index > -1 ? releases[i].link.slice(0, index) : releases[i].link), // we dun wannit.
						release: release,
						date: date
					};
					mangaDB[type].saveOne(title, watched[type][title]);
					msg = lib.decode(releases[i].title)+" is out! \\o/ ~ "+watched[type][title].latest.link;
					watched[type][title].announce.forEach(function (target) {
						if (target[0] === "#") {
							if (lib.hasElement(ial.Channels(), target))
								updates.push([ "say", target, msg, false ]);
							else
								logger.debug("Tried to send a "+type+" update to "+target+", but I'm not on it.");
						} else {
							if (ial.Channels(target).length) {
								updates.push([ "notice", target, msg, false ]); // notice users
							} else { // user not found :S
								lib.events.emit("Event: queueMessage", {
									method: "notice",
									nick: target,
									message: msg,
									sanitise: false
								});
							}
						}
					});
				}
			}
		}
	}
	if (hits.length) {
		hits.forEach(function (title) {
			mangaDB[type].clearCache(title);
			watched[type][title] = "";
		});
		hits = null;
	}
	if (updates) {
		irc.rated(updates);
		updates = null;
	} else if (typeof notify === 'string') {
		irc.say(notify, "Nothing new. :\\");
	}
}

evListen({
	handle: "mangaCheck",
	event: "300s tick", // check for updates every 5 min
	callback: check.all
});

evListen({ // check for updates when we start and joins are done
	handle: "mangaCheckOnStart",
	event: "autojoinFinished",
	callback: check.all
});

cmdListen({
	command: "batoto",
	help: "Batoto RSS watcher",
	syntax: config.command_prefix+"batoto <add/remove/list/check> [<manga title>] / \
		<announce add/remove/list> <manga title> [<target>] - Example: "
		+config.command_prefix+"batoto add One Piece",
	callback: parseMangaCmd
});

cmdListen({
	command: [ "mf", "mangafox" ],
	help: "Mangafox RSS watcher",
	syntax: config.command_prefix+"mangafox <add/remove/list/check> [<manga title>] / \
		<announce add/remove/list> <manga title> [<target>] - Example: "
		+config.command_prefix+"mangafox add One Piece",
	callback: parseMangaCmd
});

cmdListen({
	command: [ "ms", "mangastream" ],
	help: "MangaStream RSS watcher",
	syntax: config.command_prefix+"mangastream <add/remove/list/check> [<manga title>] / \
		<announce add/remove/list> <manga title> [<target>] - Example: "
		+config.command_prefix+"mangastream add One Piece",
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
		irc.say(input.context, cmdHelp(type[0], "syntax"));
		return;
	}
	switch (input.args[0].toLowerCase()) {
	case "announce":
		switch (input.args[1].toLowerCase()) {
		case "add":
			if (input.args.length >= 4) {
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
			} else {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce add <manga title> <target> - Example: "
					+config.command_prefix+type[1]+" announce add One Piece #pyoshi");
			}
			break;
		case "remove":
			if (input.args.length >= 4) {
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
			} else {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce remove <manga title> <target> - Example: "
					+config.command_prefix+type[1]+" announce remove Fairy Tail #pyoshi");
			}
			break;
		case "list":
			if (input.args.length >= 3) {
				title = input.args.slice(2).join(" ");
				ltitle = title.toLowerCase();
				if (watched[type[1]][ltitle] === undefined) {
					irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
					return;
				}
				watched[type[1]][ltitle] = mangaDB[type[1]].getOne(ltitle);
				irc.say(input.context, watched[type[1]][ltitle].title+" releases are announced to "+lib.commaList(lib.sort(watched[type[1]][ltitle].announce))+".");
				watched[type[1]][ltitle] = "";
				mangaDB[type[1]].clearCache();
			} else {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce list <manga title> - Example: "
					+config.command_prefix+type[1]+" announce list One Piece");
			}
			break;
		default:
			irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce <add/remove/list> <manga title> [<target>]\
				- Example: "+config.command_prefix+type[1]+" announce add One Piece #pyoshi");
			break;
		}
		break;
	case "add":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" add <manga title> - Example: "
				+config.command_prefix+type[1]+" add One Piece - \
				Check "+(type[0] === "mf" ? "http://mangafox.me/directory/" : "http://mangastream.com/manga")+" to see what's available.");
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
		check[type[1]]();
		break;
	case "remove":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+"mangafox remove <manga title> - Example: "
				+config.command_prefix+"mangafox remove Fairy Tail");
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
		check[type[1]](input.context);
		break;
	default:
		irc.say(input.context, cmdHelp(type[0], "syntax"));
		break;
	}
}

