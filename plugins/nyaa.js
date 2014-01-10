// I hate XML.
"use strict";
var fs = require("fs"),
	nyaaDB = new DB.Json({filename: "nyaa"}),
	timerAdded,
	ent = require("./lib/entities.js");

function rssToJson(body) {
	var entries = [];
	//globals.body = body;
	body = body.slice(body.indexOf("<item>"), body.lastIndexOf("</item>")+7)
		.replace(/_|\./g, " ")
		.replace(/\n|\t|  /g, "")
		.replace(/<item><title>/g, "{ \"release\": \"")
		.replace(/<\/title>/g, "\", ")
		.replace(/<category>/g, "\"category\": \"")
		.replace(/<\/category>/g, "\", ")
		.replace(/<link>/g, "\"link\": \"")
		.replace(/<\/link>/g, "\", ")
		.replace(/<guid>/g, "\"guid\": \"")
		.replace(/<\/guid>/g, "\", ")
		.replace(/<description>/g, "\"description\": \"")
		.replace(/<\/description>/g, "\", ")
		.replace(/<pubDate>/g, "\"date\": \"")
		.replace(/<\/pubDate>/g, "\"}")
		.replace(/<\!\[CDATA\[/g, "")
		.replace(/\]\]>/g, "")
		.split("</item>").slice(0,-1);
	body.forEach(function (item) {
		entries.push(JSON.parse(item));
	});
	body = null;
	return entries;
}

function checkAllNyaa() {
	var delay = 1000,
		entries = nyaaDB.getAll();
	Object.keys(entries).forEach(function (group) {
		Object.keys(entries[group]).forEach(function (show) {
			setTimeout(function () {
				checkNyaa(group, show);
			}, delay);
			delay += 1000;
		});
	});
}

function checkNyaa(group, show) {
	var entries, entry,
		uri = "http://www.nyaa.se/?page=rss&cats=1_37&filter=2&term="+group+" "+show;
	logger.debug("Checking Nyaa for new "+group+" "+show+" releases.");
	web.get(uri, function (error, response, body) {
		if (body) {
			entry = nyaaDB.getOne(group);
			entries = rssToJson(ent.decode(body));
			//globals.lastNyaa = entries;
			if (entries.length > 0) {
				if (!entry[show].latest || entries[0].release !== entry[show].latest.release) { // must be new! huzzah.
					entry[show].latest = entries[0];
					nyaaDB.saveOne(group, entry);
					//announceNyaa(group, show);
					entry[show].announce.forEach(function (target) {
						irc.say(target, "Nyaa! "+entry[show].latest.release.replace(/ mkv| avi| mp4| mp5/gi, "").trim()+
							" was released "+lib.duration(new Date(entry[show].latest.date).valueOf())+" ago. \\o/", false);
					});
				} else {
					logger.debug("Nothing new, pant su.");
				}
			} else {
				// Nyaa returned nothing - remove it from the list.
				entry[show].announce.forEach(function (target) {
					irc.say(target, "Nyaa returned nothing when I looked for "+group+" "+show+". Removing it from the list.", false);
				});
				delete entry[show];
				if (Object.keys(entry).length === 0) {
					nyaaDB.removeOne(group);
				} else {
					nyaaDB.saveOne(group, entry);
				}
			}
		} else {
			logger.warn("Something has gone awry in checkNyaa - no body. args: "+group+" "+show);
		}
		entries = null; entry = null; body = null;
	}, 1000); // may or may not need to adjust this magic number.
}

function addNyaa(context, group, show) {
	var entry = nyaaDB.getOne(group);
	if (!entry) entry = {};
	if (entry[show]) {
		irc.say(context, "I'm already tracking that.");
		return;
	}
	
	entry[show] = { announce: [ context ] };
	nyaaDB.saveOne(group, entry);
	irc.say(context, "Added "+group+" "+show+" to Nyaa's watch list.", false);
	checkNyaa(group, show);
	startTimer();
}

function startTimer() {
	if (!timerAdded && Object.keys(nyaaDB.getAll()).length > 0) {
		timerAdded = true;
		timers.Add(900000, checkAllNyaa);
	}
}

startTimer();

cmdListen({
	command: [ "nyaawatch", "nw" ],
	help: "Nyaa.. it's a nyaa release watcher!",
	syntax: config.command_prefix+"nyaawatch add/remove/list <group> <show> - Example: "
		+config.command_prefix+"nyaawatch add [UTW] Kyoukai no Kanata - Note: \
		this is filtered to Trusted and higher. Further, there are some naming restrictions. \
		Blame the internet.",
	callback: function (input) {
		var reg, entry, group;
		if (!input.args) {
			irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
			return;
		}
		switch (input.args[0]) {
			case "check":
				if (!input.args[1]) {
					// check all
					checkAllNyaa();
					return;
				}
				break;
			case "add":
				reg = /(\[.*\]) (.*)$/.exec(input.args.slice(1).join(" "));
				if (!reg) {
					irc.say(input.context, "Syntax wasn't right. Needs to be like [Group here] Show Title");
					irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
					return;
				}
				addNyaa(input.context, reg[1], reg[2]);
				break;
			case "remove":
				reg = /(\[.*\]) (.*)$/.exec(input.args.slice(1).join(" "));
				if (!reg) {
					irc.say(input.context, "Syntax wasn't right. Needs to be like [Group here] Show Title");
					irc.say(input.context, cmdHelp("nyaawatch", "syntax"));
					return;
				}
				entry = nyaaDB.getOne(reg[1]);
				if (!entry) {
					irc.say(input.context, "I'm not tracking anything from "+reg[1]+".", false);
					return;
				}
				if (!entry[reg[2]]) {
					irc.say(input.context, "I'm not tracking "+reg[2]+" from "+reg[1]+", though there are entries for them.", false);
					return;
				}
				delete entry[reg[2]];
				if (Object.keys(entry).length === 0) {
					nyaaDB.removeOne(reg[1]);
				} else {
					nyaaDB.saveOne(reg[1], entry);
				}
				irc.say(input.context, "Removed. o7");
				break;
			case "list":
				// by default we'll list groups, and you need to do ;nw list [Group] to show what we're tracking of theirs."
				if (!input.args[1]) {
					irc.say(input.context, "Nyaa. I'm tracking shows from these groups: "+Object.keys(nyaaDB.getAll()).join(", ")+".", false);
					return;
				}
				group = input.args.slice(1).join(" ");
				entry = nyaaDB.getOne(group);
				if (!entry) {
					irc.say(input.context, "I'm not tracking anything by \""+group+"\".", false);
					return;
				}
				irc.say(input.context, "Nyaa! I'm tracking these shows from "+group+": "+Object.keys(entry).join(", ")+".", false);
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
