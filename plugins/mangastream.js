"use strict";
var ent = require("./lib/entities.js"),
	msDB = new DB.Json({filename: "mangastream"}),
	watched = msDB.getAll(), timerAdded;

function rssToJson(rss) {
	var ret = [], i, l;
	rss = ent.decode(rss.replace(/\n|\t|\r/g, "")).split("<item>").slice(1);
	i = 0; l = rss.length;
	for (; i < l; i++) {
		ret.push({
			title: rss[i].slice(rss[i].indexOf("<title>")+7, rss[i].indexOf("</title>")),
			link: rss[i].slice(rss[i].indexOf("<link>")+6, rss[i].indexOf("</link>")),
			date: new Date(rss[i].slice(rss[i].indexOf("<pubDate>")+9, rss[i].indexOf("</pubDate>"))).valueOf()
		});
	}
	return ret;
}

function findUpdates(releases, notify) {
	var i = 0, l = releases.length, updates,
		index, date, release, title, reltitle, msg;
	for (; i < l; i++) {
		for (title in watched) {
			index = releases[i].title.toLowerCase().indexOf(title);
			if (index > -1) {
				reltitle = releases[i].title.slice(index, index+title.length);
				release = releases[i].title.slice(index+title.length+1);
				date = new Date(releases[i].date).valueOf();
				if (!watched[title].latest || date > watched[title].latest.date) {
					// new release~
					if (!updates) updates = [];
					// make the case nice if the user put in something weird.
					if (watched[title].title !== reltitle) watched[title].title = reltitle;
					// sometimes there's weird unrequired trailing ?foo=butts&butts=foo stuff.
					index = releases[i].link.indexOf("?");
					watched[title].latest = {
						title: releases[i].title,
						link: (index > -1 ? releases[i].link.slice(0, index) : releases[i].link), // we dun wannit.
						release: release,
						date: date
					};
					msg = releases[i].title+" is out! \\o/ ~ "+watched[title].latest.link;
					watched[title].announce.forEach(function (target) {
						if (target[0] === "#") {
							if (lib.hasElement(ial.Channels(), target)) {
								updates.push([ "say", target, msg, false ]);
							} else {
								logger.debug("Tried to send a mangastream update to "+target+", but I'm not on it.");
							}
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
	if (updates) {
		irc.rated(updates);
		msDB.saveAll(watched);
		updates = null;
	} else if (typeof notify === 'string') {
		irc.say(notify, "Nothing new. :\\");
	}
}

function checkMangaStream(notify) {
	web.get("http://mangastream.com/rss", function (error, response, body) {
		findUpdates(rssToJson(body), notify);
	})
}
if (!timerAdded) {
	timers.Add(900000, checkMangaStream);
	timerAdded = true;
}

cmdListen({
	command: [ "ms", "mangastream" ],
	help: "MangaStream RSS watcher",
	syntax: config.command_prefix+"mangastream <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] - Example: "
		+config.command_prefix+"mangastream add One Piece",
	callback: function (input) {
		var title, ltitle, titles, target, ltarget, i, l;
		if (!input.args || input.args[0].toLowerCase() === "announce" && !input.args[1]) {
			irc.say(input.context, cmdHelp("ms", "syntax"));
			return;
		}
		switch (input.args[0].toLowerCase()) {
			case "announce":
				switch (input.args[1].toLowerCase()) {
					case "add":
						if (input.args.length >= 4) {
							title = input.args.slice(2,-1).join(" ");
							ltitle = title.toLowerCase();
							if (!watched[ltitle]) {
								irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
								return;
							}
							target = input.args[input.args.length-1];
							if (lib.hasElement(watched[ltitle].announce, target)) {
								irc.say(input.context, "I'm already announcing "+title+" releases to "+target+".");
								return;
							}
							watched[ltitle].announce.push(target);
							msDB.saveAll(watched);
							irc.say(input.context, "Added! o7");
						} else {
							irc.say(input.context, "[Help] "+config.command_prefix+"mangastream announce add <manga title> <target> - Example: "
								+config.command_prefix+"mangastream announce add One Piece #pyoshi");
						}
						break;
					case "remove":
						if (input.args.length >= 4) {
							title = input.args.slice(2,-1).join(" ");
							ltitle = title.toLowerCase();
							if (!watched[ltitle]) {
								irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
								return;
							}
							target = input.args[input.args.length-1];
							ltarget = target.toLowerCase();
							i = 0; l = watched[ltitle].announce.length;
							for (; i < l; i++) {
								if (watched[ltitle].announce[i].toLowerCase() === ltarget) {
									if (l === 1) {
										irc.say(input.context, "Removed ~ "+title+" now has an empty announce list, so I'm removing it from the watch list.");
										delete watched[ltitle];
									} else {
										watched[ltitle].announce.splice(i, 1);
										irc.say(input.context, "Removed. o7");
									}
									msDB.saveAll(watched);
									return;
								}
							}
							irc.say(input.context, target+" isn't on the announce list for "+title+".");
						} else {
							irc.say(input.context, "[Help] "+config.command_prefix+"mangastream announce remove <manga title> <target> - Example: "
								+config.command_prefix+"mangastream announce remove Fairy Tail #pyoshi");
						}
						break;
					case "list":
						if (input.args.length >= 3) {
							title = input.args.slice(2).join(" ");
							ltitle = title.toLowerCase();
							if (!watched[ltitle]) {
								irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
								return;
							}
							irc.say(input.context, watched[ltitle].title+" releases are announced to "+lib.commaList(watched[ltitle].announce)+".");
						} else {
							irc.say(input.context, "[Help] "+config.command_prefix+"mangastream announce list <manga title> - Example: "
								+config.command_prefix+"mangastream announce list One Piece");
						}
						break;
					default:
						irc.say(input.context, "[Help] "+config.command_prefix+"mangastream announce <add/remove/list> <manga title> [<target>]\
							- Example: "+config.command_prefix+"mangastream announce add One Piece #pyoshi");
						break;
				}
				break;
			case "add":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] "+config.command_prefix+"mangastream add <manga title> - Example: "
						+config.command_prefix+"mangastream add One Piece - \
						Check http://mangastream.com/manga to see what's available.");
					return;
				}
				title = input.args.slice(1).join(" ");
				ltitle = title.toLowerCase();
				if (watched[ltitle]) {
					irc.say(input.context, "I'm already tracking "+title+" updates.");
					return;
				}
				watched[ltitle] = {
					title: title,
					announce: [ input.context ]
				};
				msDB.saveAll(watched);
				irc.say(input.context, "Added! o7");
				checkMangaStream();
				break;
			case "remove":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] "+config.command_prefix+"mangastream remove <manga title> - Example: "
						+config.command_prefix+"mangastream remove Fairy Tail");
					return;
				}
				ltitle = input.args.slice(1).join(" ").toLowerCase();
				if (!watched[ltitle]) {
					irc.say(input.context, "I'm not tracking "+input.args.slice(1).join(" ")+".");
					return;
				}
				delete watched[ltitle];
				msDB.saveAll(watched);
				irc.say(input.context, "Removed. o7");
				break;
			case "list":
				titles = [];
				for (title in watched) {
					titles.push(watched[title].title);
				}
				if (titles.length > 1) {
					irc.say(input.context, "I'm tracking releases of "+lib.commaList(titles)+" from MangaStream.");
				} else {
					irc.say(input.context, "I'm not tracking any MangaStream releases right now. Add some!");
				}
				titles = null;
				break;
			case "check":
				checkMangaStream(input.context);
				break;
			default:
				irc.say(input.context, cmdHelp("ms", "syntax"));
				break;
		}
	}
});

