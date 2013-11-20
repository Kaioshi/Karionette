// url title snarfer - THIS ONLY WORKS ON UNIX - must have wget, head and egrep installed.
"use strict";
var ent = require("./lib/entities.js"),
	sys = require("sys"),
	url = require("url"),
	urlDB = new DB.Json({ filename: "urls" });

function zero(n) {
	return (n > 9 ? n : "0" + n);
}

function lastUrl(opts) {
	var i, k, date, keys,
		match = false,
		mostrecent = [ 0, "" ],
		entry = urlDB.getOne(opts.channel);
	if (!entry) return -1;
	if (opts.nick) {
		if (!entry[opts.nick]) return -1;
		if (opts.match) {
			entry = entry[opts.nick];
			for (i = 0; i < entry.length; i++) {
				if (entry[i][0].indexOf(opts.match) > -1) {
					date = new Date(entry[i][1]).valueOf();
					if (date > mostrecent[0]) {
						mostrecent = [ date, entry[i][0], opts.nick ];
						match = true;
					}
				}
			}
			if (match) return mostrecent;
			return -1;
		} else {
			entry = entry[opts.nick][entry[opts.nick].length-1];
			return [ new Date(entry[1]).valueOf(), entry[0], opts.nick ];
		}
	}
	keys = Object.keys(entry);
	for (i = 0; i < keys.length; i++) {
		for (k = 0; k < entry[keys[i]].length; k++) {
			if (opts.match) {
				if (entry[keys[i]][k][0].indexOf(opts.match) > -1) {
					date = new Date(entry[keys[i]][k][1]).valueOf();
					if (date > mostrecent[0]) {
						mostrecent = [ date, entry[keys[i]][k][0], keys[i] ];
					}
					match = true;
				}
			} else {
				date = new Date(entry[keys[i]][k][1]).valueOf();
				if (date > mostrecent[0]) {
					mostrecent = [ date, entry[keys[i]][k][0], keys[i] ];
				}
			}
		}
	}
	keys = null; entry = null; date = null;
	if (opts.match) {
		if (match) return mostrecent;
		return -1;
	}
	return mostrecent;
}

function urlStats(nick, channel, match) {
	var i,
		count = 0,
		entry = urlDB.getOne(channel);
	if (!entry || !entry[nick]) return -1;
	if (match) {
		for (i = 0; i < entry[nick].length; i++) {
			if (entry[nick][i][0].indexOf(match) > -1) {
				count++;
			}
		}
		return count;
	}
	count = entry[nick].length;
	entry = null;
	return count;
}

function recordUrl(nick, channel, url) {
	var entry = urlDB.getOne(channel) || {};
	if (!entry[nick]) entry[nick] = [];
	entry[nick].push([ url, new Date() ]);
	urlDB.saveOne(channel, entry);
	entry = null;
}

function getUrl(nick, channel, url) {
	var keys, i, k, ret = "",
		entry = urlDB.getOne(channel);
	if (!entry) return;
	keys = Object.keys(entry);
urlSearch:	for (i = 0; i < keys.length; i++) {
				for (k = 0; k < entry[keys[i]].length; k++) {
					if (entry[keys[i]][k][0] === url) {
						ret = "Old! " + (keys[i] === nick ? "You" :
							keys[i]) + " linked this " + lib.duration(new Date(entry[keys[i]][k][1])) + " ago.";
						break urlSearch;
					}
				}
			}
	entry = null, keys = null;
	return ret;
}

function youtubeIt(context, id, host) {
	var uri = "https://gdata.youtube.com/feeds/api/videos/"+id+"?v=2&alt=json";
	web.get(uri, function (error, response, body) {
		var date,
			views = "",
			rating = " - ";
		if (error) {
			logger.error("[titlesnarfer[youtubeIt("+id+")]] error: "+error);
			irc.say(context, "Something has gone awry.");
			return;
		}
		body = JSON.parse(body).entry;
		if (body["gd$rating"] && body["gd$rating"].average) {
			rating = rating+"["+body["gd$rating"].average.toString().slice(0,3)+"/5] ";
		}
		if (body["yt$statistics"] && body["yt$statistics"].viewCount) {
			views = " - "+lib.commaNum(body["yt$statistics"].viewCount)+" views";
		}
		date = new Date(body["media$group"]["yt$uploaded"]["$t"]);
		date = zero(date.getDate())+"/"+zero(date.getMonth()+1)+"/"+date.getYear().toString().slice(1);
		irc.say(context, body.title["$t"]+rating+date+views, false); //+" ~ "+host.replace("www.",""), false);
		date = null; rating = null; views = null; body = null; response = null; error = null;
	});
}

function sayTitle(context, uri, length, imgur) {
	var reg, title;
	web.get(uri.href, function (error, response, body) {
		if (error) {
			logger.warn("error fetching "+uri.href+": "+error);
			return;
		}
		if (!body) {
			logger.warn(uri.href + " - curl returned no body.");
			return;
		}
		reg = /<title?[^>]+>([^<]+)<\/title>/i.exec(body.replace(/\n|\t|\r/g, ""));
		if (!reg || !reg[1]) return;
		title = reg[1].trim();
		if (title.toLowerCase().indexOf(uri.host) > -1) {
			reg = new RegExp(" "+uri.host+" ?", "ig");
			title = title.replace(reg, "");
		}
		if (title.slice(-8) === " - Imgur") title = title.slice(0,-8);
		if (imgur) { // I know there are a lot of imgur corner cases, but it's really common.
			if (title === "imgur: the simple image sharer") return; // deal with it
		}
		irc.say(context, ent.decode(title.trim()) + " ~ " + uri.host.replace("www.", ""), false);
		reg = null; title = null; body = null; response = null; error = null;
	}, length);
}

evListen({
	handle: "titleSnarfer",
	event: "PRIVMSG",
	regex: /^:[^ ]+ PRIVMSG #[^ ]+ :.*((?:https?:\/\/)[^ ]+)/i,
	callback: function (input) {
		var uri, ext, allow,
			old = getUrl(input.nick, input.context, input.match[1]),
			length = 10000;
		
		if (input.args) return; // don't process urls in commands
		if (old) irc.say(input.context, old);
		else recordUrl(input.nick, input.context, input.match[1]);
		uri = url.parse(input.match[1]);
		if (uri.host.indexOf("youtube.com") > -1 && uri.path.indexOf("v=") > -1) {
			youtubeIt(input.context, /v=([^ &\?]+)/i.exec(uri.path)[1], uri.host);
			return;
		}
		if (uri.host.indexOf("youtu.be") > -1 && uri.path.length > 1) {
			youtubeIt(input.context, /^\/([^ &\?]+)/.exec(uri.path)[1], uri.host);
			return;
		}
		if (uri.host === "imgur.com") {
			sayTitle(input.context, uri, length, true);
			return;
		}
		if (uri.host === "i.imgur.com" && uri.href.slice(-4).match(/\.jpg|\.png|\.gif/i)) {
			uri.path = uri.path.slice(0,-4);
			uri.href = uri.href.slice(0,-4);
			sayTitle(input.context, uri, length, true);
			return;
		}
		ext = /.*\.([a-zA-Z0-9]+)$/.exec(uri.path);
		allow = [ 'htm', 'html', 'asp', 'aspx', 'php', 'php3', 'php5' ];
		if (ext && !ext[0].match(/&|\?/)) {
			if (!allow.some(function (item) { return (ext[1] === item); })) {
				return;
			}
		}
		// ton of garbage in the first 15000 characters. o_O
		if (uri.host.indexOf("kotaku") > -1) length = 20000;
		sayTitle(input.context, uri, length);
	}
});

cmdListen({
	command: "lasturl",
	help: "Shows the most recent URL, optionally from a person.",
	syntax: config.command_prefix+"lasturl [-f <search string>] [<nick>] - Example: "+
		config.command_prefix+"lasturl -f imgur ranma",
	callback: function (input) {
		var result,
			opts = {};
		if (!input.channel) {
			irc.say(input.context, "You need to use this in the channel you want the URL from.");
			return;
		}
		if (input.args) {
			if (input.args[0] === "-f") {
				if (!input.args[1]) {
					irc.say(input.context, cmdHelp("lasturl", "syntax"));
					return;
				}
				opts.match = input.args[1];
				if (input.args[2]) opts.nick = input.args[2];
			} else {
				opts.nick = input.args[0];
			}
		}
		opts.channel = input.channel;
		result = lastUrl(opts);
		if (opts.match) {
			if (result === -1) {
				irc.say(input.context, (opts.nick ? opts.nick+" hasn't linked anything matching \""+opts.match+"\"." :
					"I haven't seen any URLs matching \""+opts.match+"\" here."), false);
			} else {
				irc.say(input.context, result[2]+" posted "+highlightMatch(result[1], opts.match)+" "
					+lib.duration(new Date(result[0]).valueOf())+" ago.", false);
			}
		} else {
			if (result === -1) {
				irc.say(input.context, (opts.nick ? opts.nick+" hasn't linked anything." : "I haven't seen any URLs linked here."));
				return;
			}
			irc.say(input.context, result[2]+" posted "+result[1]+" "+lib.duration(new Date(result[0]).valueOf())+" ago.", false);
		}
		opts = null; result = null;
	}
});

function highlightMatch(str, match) {
	return str.replace(new RegExp(match, "g"), "\x02"+match+"\x02");
}

cmdListen({
	command: "urlstats",
	help: "Shows how many URLs a person has posted.",
	syntax: config.command_prefix+"urlstats <nick> [<string to match>] - Example: "
		+config.command_prefix+"urlstats ranma imgur",
	callback: function (input) {
		var result,
			match = false;
		if (!input.args || !input.args[0]) {
			irc.say(input.context, cmdHelp("urlstats", "syntax"));
			return;
		}
		if (!input.channel) {
			irc.say(input.context, "You need to use this in the channel you want the stats from.");
			return;
		}
		if (input.args[1]) {
			match = input.args[1];
			result = urlStats(input.args[0], input.channel, match);
			if (result === -1) {
				irc.say(input.context, "I haven't seen any URLs form "+input.args[0]+", \
					let alone any matching \""+match+"\".", false);
			} else if (result === 0) {
				irc.say(input.context, "I haven't seen any URLs containing \""+match+"\" from "+input.args[0]+".", false);
			} else {
				irc.say(input.context, "I've seen "+result+" URLs containing \""+match+"\" from "+input.args[0]+".", false);
			}
		} else {
			result = urlStats(input.args[0], input.channel);
			if (result === -1) {
				irc.say(input.context, "I haven't seen any URLs from "+input.args[0]+".");
			} else {
				irc.say(input.context, "I've seen "+result+" URLs from "+input.args[0]+".");
			}
		}
	}
});

