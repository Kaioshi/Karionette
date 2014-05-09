"use strict";
var mfDB = new DB.Json({filename: "mangafox"}),
	watched = mfDB.getAll(), timerAdded;

function rssToJson(rss) {
	var ret = [], i, l;
	rss = lib.decode(rss.replace(/\n|\t|\r/g, "")).split("<item>").slice(1);
	i = 0; l = rss.length;
	for (; i < l; i++) {
		ret.push({
			title: rss[i].slice(rss[i].indexOf("<title>")+7, rss[i].indexOf("</title>")),
			link: rss[i].slice(rss[i].indexOf("<feedburner:origLink>")+21, rss[i].indexOf("</feedburner:origLink>")),
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
								logger.debug("Tried to send a mangafox update to "+target+", but I'm not on it.");
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
		mfDB.saveAll(watched);
		updates = null;
	} else if (typeof notify === 'string') {
		irc.say(notify, "Nothing new. :\\");
	}
}

function checkMangafox(notify) {
	web.get("http://feeds.feedburner.com/mangafox/latest_manga_chapters?format=xml", function (error, response, body) {
		findUpdates(rssToJson(body), notify);
	})
}
if (!timerAdded) {
	timers.Add(900000, checkMangafox);
	timerAdded = true;
}

cmdListen({
	command: [ "mf", "mangafox" ],
	help: "Mangafox RSS watcher",
	syntax: config.command_prefix+"mangafox <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] - Example: "
		+config.command_prefix+"mangafox add One Piece",
	callback: function (input) {
		var title, ltitle, titles, target, ltarget, i, l;
		if (!input.args || input.args[0].toLowerCase() === "announce" && !input.args[1]) {
			irc.say(input.context, cmdHelp("mf", "syntax"));
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
							mfDB.saveAll(watched);
							irc.say(input.context, "Added! o7");
						} else {
							irc.say(input.context, "[Help] "+config.command_prefix+"mangafox announce add <manga title> <target> - Example: "
								+config.command_prefix+"mangafox announce add One Piece #pyoshi");
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
									mfDB.saveAll(watched);
									return;
								}
							}
							irc.say(input.context, target+" isn't on the announce list for "+title+".");
						} else {
							irc.say(input.context, "[Help] "+config.command_prefix+"mangafox announce remove <manga title> <target> - Example: "
								+config.command_prefix+"mangafox announce remove Fairy Tail #pyoshi");
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
							irc.say(input.context, watched[ltitle].title+" releases are announced to "+lib.commaList(lib.sort(watched[ltitle].announce))+".");
						} else {
							irc.say(input.context, "[Help] "+config.command_prefix+"mangafox announce list <manga title> - Example: "
								+config.command_prefix+"mangafox announce list One Piece");
						}
						break;
					default:
						irc.say(input.context, "[Help] "+config.command_prefix+"mangafox announce <add/remove/list> <manga title> [<target>]\
							- Example: "+config.command_prefix+"mangafox announce add One Piece #pyoshi");
						break;
				}
				break;
			case "add":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] "+config.command_prefix+"mangafox add <manga title> - Example: "
						+config.command_prefix+"mangafox add One Piece - \
						Check http://mangafox.me/directory/ to see what's available.");
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
				mfDB.saveAll(watched);
				irc.say(input.context, "Added! o7");
				checkMangafox();
				break;
			case "remove":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] "+config.command_prefix+"mangafox remove <manga title> - Example: "
						+config.command_prefix+"mangafox remove Fairy Tail");
					return;
				}
				ltitle = input.args.slice(1).join(" ").toLowerCase();
				if (!watched[ltitle]) {
					irc.say(input.context, "I'm not tracking "+input.args.slice(1).join(" ")+".");
					return;
				}
				delete watched[ltitle];
				mfDB.saveAll(watched);
				irc.say(input.context, "Removed. o7");
				break;
			case "list":
				titles = [];
				for (title in watched) {
					titles.push(watched[title].title);
				}
				if (titles.length > 1) {
					irc.say(input.context, "I'm tracking releases of "+lib.commaList(lib.sort(titles))+" from Mangafox.");
				} else {
					irc.say(input.context, "I'm not tracking any Mangafox releases right now. Add some!");
				}
				titles = null;
				break;
			case "check":
				checkMangafox(input.context);
				break;
			default:
				irc.say(input.context, cmdHelp("mf", "syntax"));
				break;
		}
	}
});

