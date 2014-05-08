// I hate XML.
"use strict";
var fs = require("fs"),
	nyaaDB = new DB.Json({filename: "nyaa"}),
	watching = nyaaDB.getAll(),
	timerAdded,
	ent = require("./lib/entities.js");

function rssToJson(rss) {
	var i, l, entries = [];
	rss = rss.replace(/_|\./g, " ").split("</item>").slice(0, -1); // cruft at the end
	rss[0] = rss[0].slice(rss[0].indexOf("<item>")); // cruft at the start
	for (i = 0, l = rss.length; i < l; i++) {
		entries.push({
			release: rss[i].slice(rss[i].indexOf("<title>")+7, rss[i].indexOf("</title>")),
			date: new Date(rss[i].slice(rss[i].indexOf("<pubDate>")+9, rss[i].indexOf("</pubDate>"))).valueOf()
		});
	}
	rss = null;
	return entries;
}

function tidyRelease(release) {
	return lib.singleSpace(release.replace(/ mkv| avi| mp4| mp5|\[[A-F0-9]{8}\]/gi, ""));
}

function checkNyaa(context) {
	var i, l, results, group, show, term, entry, resolution, msg, updates;
	web.get("http://www.nyaa.se/?page=rss&cats=1_37&filter=2&term=&minage=0&maxage=1", function (error, response, body) {
		if (!body) return;
		results = rssToJson(ent.decode(body));
		for (i = 0, l = results.length; i < l; i++) {
			entry = results[i].release.toLowerCase();
			for (group in watching) {
				for (show in watching[group]) {
					term = group+" "+show; term = term.toLowerCase();
					if (entry.indexOf(term) > -1) {
						if (watching[group][show].resolution &&
							entry.indexOf(watching[group][show].resolution.toLowerCase()) === -1) {
							continue; // wrong resolution
						}
						results[i].date = new Date(results[i].date).valueOf();
						if (!watching[group][show].latest || results[i].date > watching[group][show].latest.date) {
							if (!updates) updates = [];
							watching[group][show].latest = results[i];
							msg = "Nyaa! "+tidyRelease(watching[group][show].latest.release)+" is out! \\o/";
							// announce to current context if it's not in the announce list, if nw check was run
							if (typeof context === 'string' && !lib.hasElement(watching[group][show].announce, context)) {
								updates.push([ "say", context, msg, false ]);
							}
							watching[group][show].announce.forEach(function (target) {
								if (target[0] === "#") {
									if (lib.hasElement(ial.Channels(), target)) {
										updates.push([ "say", target, msg, false ]);
									} else {
										logger.debug("Tried to send a Nyaa update to "+target+", which I'm not on.");
									}
								} else {
									if (ial.Channels(target).length) {
										updates.push([ "notice", target, msg, false ]);
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
		}
		// go through and announce any updated shows
		if (updates && updates.length > 0) {
			irc.rated(updates);
			nyaaDB.saveAll(watching);
			updates = null;
		} else if (typeof context === 'string') {
			irc.say(context, "Nothing new. :\\");
		}
		results = null; msg = null; updates = null;
	});
}

function addNyaa(context, group, show, resolution) {
	if (!watching[group]) watching[group] = {};
	if (watching[group][show]) {
		irc.say(context, "I'm already tracking that.");
		return;
	}
	
	watching[group][show] = { announce: [ context ] };
	if (resolution) {
		watching[group][show].resolution = resolution;
		irc.say(context, "Added "+group+" "+show+" ("+resolution+") to Nyaa's watch list. Note: not all \
			shows release with resolution information. This will break the search if they do not.");
	} else {
		irc.say(context, "Added "+group+" "+show+" to Nyaa's watch list.", false);
	}
	nyaaDB.saveAll(watching);
	checkNyaa();
	startTimer();
}

function startTimer() {
	if (!timerAdded && Object.keys(watching).length > 0) {
		timerAdded = true;
		timers.Add(900000, checkNyaa);
	}
}

startTimer();

cmdListen({
	command: [ "nyaawatch", "nw" ],
	help: "Nyaa.. it's a nyaa release watcher!",
	syntax: config.command_prefix+"nyaawatch add/remove/list <group> <show> - Example: "
		+config.command_prefix+"nyaawatch add [UTW] Kyoukai no Kanata - Note: this is filtered to Trusted and higher.",
	callback: function (input) {
		var reg, entry, group, syntax, line;
		if (!input.args) {
			irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
			return;
		}
		switch (input.args[0]) {
			case "check":
				if (!input.args[1]) {
					checkNyaa(input.context);
					return;
				}
				break;
			case "add":
				line = input.args.slice(1).join(" ");
				reg = /(\[.*\]) (.*) (360p|480p|720p|1080p)/.exec(line);
				if (reg) {
					reg[3] = reg[3].toLowerCase();
				} else {
					reg = /(\[.*\]) (.*)/.exec(line);
					if (!reg) {
						irc.say(input.context, "Syntax wasn't right. Needs to be like [Group here] Show Title");
						irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
						return;
					}
				}
				addNyaa(input.context, reg[1], lib.singleSpace(reg[2]), reg[3]);
				break;
			case "remove":
				line = lib.singleSpace(input.args.slice(1).join(" ").replace(/360p|720p|480p|1080p/i, ""));
				reg = /(\[.*\]) (.*)$/.exec(line);
				if (!reg) {
					irc.say(input.context, "Syntax wasn't right. Needs to be like [Group here] Show Title");
					irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
					return;
				}
				if (!watching[reg[1]]) {
					irc.say(input.context, "I'm not tracking anything from "+reg[1]+".", false);
					return;
				}
				if (!watching[reg[1]][reg[2]]) {
					irc.say(input.context, "I'm not tracking "+reg[2]+" from "+reg[1]+", though there are entries for them.", false);
					return;
				}
				delete watching[reg[1]][reg[2]];
				if (Object.keys(watching[reg[1]]).length === 0) {
					delete watching[reg[1]];
				}
				nyaaDB.saveAll(watching);
				irc.say(input.context, "Removed. o7");
				break;
			case "list":
				// by default we'll list groups, and you need to do ;nw list [Group] to show what we're tracking of theirs."
				syntax = "[Help] "+config.command_prefix+"nyaawatch list [Group Name] - Example: "
					+config.command_prefix+"nyaawatch list [HorribleSubs]";
				if (!input.args[1]) {
					irc.say(input.context, "Nyaa. I'm tracking shows from these groups: "+Object.keys(watching).join(", ")+".", false);
					return;
				}
				reg = /(\[.*\])/i.exec(input.args.slice(1).join(" "));
				if (!reg) {
					irc.say(input.context, syntax);
					return;
				}
				if (!watching[reg[1]]) {
					irc.say(input.context, "I'm not tracking anything by \""+reg[1]+"\".", false);
					return;
				}
				irc.say(input.context, "Nyaa! I'm tracking these shows from "+reg[1]+": "+Object.keys(watching[reg[1]]).join(", ")+".", false);
				break;
			case "announce":
				// ;nw announce add/remove/list <group> <show> [<target>]
				syntax = "[Help] "+config.command_prefix+"nyaawatch announce add/remove/list <group> <show> [<#target>] \
					- Example: "+config.command_prefix+"nyaawatch announce add [Commie] Log Horizon #anime";
				reg = /(\[.*\]) ([^#]+) ?(#[^ ]+)?/.exec(input.data);
				if (!reg || (input.args[1] !== "list" && !reg[3])) {
					irc.say(input.context, syntax);
					return;
				}
				reg[2] = reg[2].trim();
				if (!watching[reg[1]] || !watching[reg[1]][reg[2]]) {
					irc.say(input.context, "I'm not tracking that.");
					return;
				}
				switch (input.args[1]) {
					case "add":
						if (watching[reg[1]][reg[2]].announce.some(function (item) { return (item === reg[3]); })) {
							irc.say(input.context, reg[3]+" is already on the announce list.");
							break;
						}
						if (!ial.ison(reg[3], config.nick)) {
							irc.say(input.context, "I'm not on "+reg[3]+", how could I announce to it?");
							break;
						}
						watching[reg[1]][reg[2]].announce.push(reg[3]);
						nyaaDB.saveAll(watching);
						irc.say(input.context, reg[1]+" "+reg[2]+" releases will now be announced to "+reg[3]+".", false);
						break;
					case "remove":
						if (watching[reg[1]][reg[2]].announce.some(function (item) { return (item === reg[3]); })) {
							if (watching[reg[1]][reg[2]].announce.length === 1) {
								irc.say(input.context, reg[3]+" is the only entry in that announce list, add another before you remove it.");
								break;
							}
							watching[reg[1]][reg[2]].announce = watching[reg[1]][reg[2]].announce.filter(function (item) {
								return (item.toLowerCase() !== reg[3].toLowerCase());
							});
							nyaaDB.saveAll(watching);
							irc.say(input.context, reg[3]+" was removed from "+reg[1]+" "+reg[2]+"'s announce list.", false);
						} else {
							irc.say(input.context, reg[3]+" is not on the announce list for "+reg[1]+" "+reg[2]+".", false);
						}
						break;
					case "list":
						irc.say(input.context, reg[1]+" "+reg[2]+" releases are being announced to: "
							+watching[reg[1]][reg[2]].announce.join(", ")+".", false);
						break;
					default:
						irc.say(input.context, syntax);
						break;
				}
				break;
			default:
				irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
				break;
		}
	}
});

cmdListen({
	command: "nyaa",
	help: "Nyaa.. it's a nyaa searcher!",
	syntax: config.command_prefix+"nyaa [-unfiltered/-raws] <search term>. \
		By default the filter is set to Trusted and higher Anime, which has been subbed. \
		The -raws flag is also filtered to Trusted and higher.",
	callback: function (input) {
		var entries, unfiltered = false;
		if (!input.args) {
			irc.say(input.context, cmdHelp("nyaa", "syntax"));
			return;
		}
		switch (input.args[0]) {
			case "-unfiltered":
				input.term = input.args.slice(1).join(" ");
				input.uri = "http://www.nyaa.se/?page=rss&cats=0_0&term="+input.term;
				unfiltered = true;
				break;
			case "-raws":
				input.term = input.args.slice(1).join(" ");
				input.uri = "http://www.nyaa.se/?page=rss&cats=1_11&filter=2&term="+input.term;
				break;
			default:
				input.uri = "http://www.nyaa.se/?page=rss&cats=1_37&filter=2&term="+input.data;
				break;
		}
		web.get(input.uri, function (error, resp, body) {
			if (body) {
				body = ent.decode(body);
				entries = [];
				body = body.slice(body.indexOf("<item>"), body.lastIndexOf("</item>")+7);
				if (body.length === 0) {
					irc.say(input.context, "There were no matches. I'm not sorry. :>");
					return;
				}
				body = body.replace(/_|\./g, " ")
					.replace(/<item>/g, "{").replace(/<title>/g, " \"release\": \"")
					.replace(/<\/title[^{]+>/g, "\" }OHEYMITCH_").slice(0,-10).split("OHEYMITCH_");
				body.forEach(function (entry) {
					entries.push(JSON.parse(entry).release);
				});
				if (unfiltered) lib.events.emit("Event: processUnfilteredNyaaDone", input, entries);
				else lib.events.emit("Event: processNyaaDone", input, entries);
				entries = null; body = null;
			}
		}, 4000);
	}
});

evListen({
	handle: "handleUnfilteredNyaa",
	event: "processUnfilteredNyaaDone",
	callback: function (input, results) {
		var i, ret = [];
		// show the first 4 hits or less on a single line.
		if (results.length > 4) {
			for (i = 0; i < 4; i++) {
				ret.push(results[i].replace(/ rar| mkv| mp4| avi| mp5/ig, ""));
			}
		} else {
			results.forEach(function (entry) {
				ret.push(entry.replace(/ rar| mkv| mp4| avi| mp5/ig, ""));
			});
		}
		irc.say(input.context, ret.join(" -- "));
	}
});

evListen({
	handle: "handleNyaa",
	event: "processNyaaDone",
	callback: function (input, results) {
		var i, line, reg, rel = {}, tmp;
		if (results.length === 0) {
			irc.say(input.context, "There were no matches, sorry.");
			return;
		}
		for (i = 0; i < results.length; i++) {
			reg = /\[(.*[^\&]+)\] (.*) - (.*) \[(.*)$/.exec(results[i]);
			if (reg) {
				if (!rel[reg[1]]) rel[reg[1]] = {};
				if (!rel[reg[1]][reg[2]]) rel[reg[1]][reg[2]] = [];
				if (!rel[reg[1]][reg[2]].some(function (item) { return (item === reg[3]); })) {
					rel[reg[1]][reg[2]].push(reg[3]);
				}
			} else {
				reg = /\[(.*[^\&]+)\] (.*) (\(|\[)(.*)$/.exec(results[i]);
				if (reg) {
					if (!rel[reg[1]]) rel[reg[1]] = {};
					rel[reg[1]][reg[2]] = [];
				}
			}
		}
		Object.keys(rel).forEach(function (group) {
			tmp = "["+group+"] have released: ";
			Object.keys(rel[group]).forEach(function (show) {
				if (rel[group][show].length > 0) {
					tmp = tmp+show+" - "+rel[group][show].join(", ")+" :: ";
				} else {
					tmp = tmp+show+" :: ";
				}
			});
			irc.say(input.context, tmp.slice(0,-4));
		});
		tmp = null; reg = null; results = null;
	}
});
