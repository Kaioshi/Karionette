// url title snarfer
"use strict";
var url = require("url"),
	fs = require('fs'),
	ytReg = /v=([^ &\?]+)/i,
	ytBReg = /^\/([^ &\?]+)/;
//	titleReg = /<title?[^>]+>([^<]+)<\/title>/i;

if (fs.existsSync("data/urls.json")) {
	convertUrls();
}

function convertUrls() {
	var db = JSON.parse(fs.readFileSync("data/urls.json").toString()),
		channel, nick, i, l, fn;
	if (!fs.existsSync("data/urls/")) fs.mkdirSync("data/urls/");
	for (channel in db) {
		for (nick in db[channel]) {
			i = 0; l = db[channel][nick].length;
			fn = "data/urls/"+channel.toLowerCase()+".txt";
			for (; i < l; i++) {
				fs.appendFileSync(fn, db[channel][nick][i][0]+" "+nick+" "+new Date(db[channel][nick][i][1]).valueOf()+"\n");
			}
		}
	}
	fs.unlinkSync("data/urls.json");
}

function zero(n) {
	return (n > 9 ? n : "0" + n);
}

function dura(secs) {
	var mins = Math.floor(secs/60),
		hours = Math.floor(mins/60),
		ret = [];
		secs = (secs % 60);
		mins = (mins % 60);
		hours = (hours % 24);
	if (hours)
		ret.push(zero(hours));
	if (mins)
		ret.push(zero(mins));
	ret.push(zero(secs));
	return ret.join(":");
}

function lastUrl(channel, nick, match) {
	var i, urls, mostRecent, index, entry, lnick,
		fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn))
		return "I haven't seen any URLs here.";
	urls = fs.readFileSync(fn).toString().split("\n");
	i = urls.length;
	if (match) match = match.toLowerCase();
	if (nick) {
		lnick = nick.toLowerCase();
		while (i > 1) { // start from the bottom up since they're more recent.
			i--;
			if (urls[i].toLowerCase().indexOf(" "+lnick+" ") > -1) {
				entry = urls[i].split(" ");
				if (match && entry[0].toLowerCase().indexOf(match) === -1) {
					continue;
				}
				if (!mostRecent || entry[2] > mostRecent) {
					index = i;
					mostRecent = entry[2];
				}
			}
		}
	} else {
		index = i-1; // lowest entry, probably.
		while (!urls[index])
			index--; // mmm tailing newlines
	}
	if (index !== undefined) {
		mostRecent = urls[index].split(" ");
		urls = null; entry = null;
		return mostRecent[1]+" linked "+mostRecent[0]+" "
			+(mostRecent[3] ? "("+mostRecent.slice(3).join(" ")+") " : "")
			+lib.duration(mostRecent[2], null, true)+" ago.";
	}
	return "Can't see any.";
}

function urlStats(channel, nick, match) {
	var i, urls, count, lnick, entry,
		fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn)) return "I haven't seen any URLs here.";
	urls = fs.readFileSync(fn).toString().split("\n");
	i = urls.length; count = 0;
	if (nick) {
		lnick = nick.toLowerCase();
		while (i > 1) {
			i--;
			if (urls[i].toLowerCase().indexOf(" "+lnick+" ") > -1) {
				entry = urls[i].split(" ");
				if (match && entry[0].toLowerCase().indexOf(match) === -1) {
					continue;
				}
				count++;
			}
		}
		return (match ? "I've seen "+lib.commaNum(count)+" URLs containing \""+match+"\" from "+nick+" here." :
			"I've seen "+lib.commaNum(count)+" URLs from "+nick+" here.");
	}
	return "I've seen "+lib.commaNum(i)+" URLs here.";
}

function recordURL(nick, channel, url, title) {
	var fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn)) fs.writeFileSync(fn, "");
	fs.appendFileSync(fn, url+" "+nick+" "+new Date().valueOf()+(title ? " "+title+"\n" : "\n"));
}

function getURL(channel, url) {
	var i, l, urls, entry,
		fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn)) return;
	urls = fs.readFileSync(fn).toString().split("\n");
	l = urls.length; i = 0;
	for (;i < l; i++) {
		if (urls[i].indexOf(url) > -1) { // at least a partial match
			entry = urls[i].split(" ");
			if (entry[0] === url) {
				urls = null;
				return "Old! "+entry[1]+" linked this "+lib.duration(entry[2], null, true)+" ago";
			}
		}
	}
	urls = null;
}

function youtubeIt(context, id, host, old, record) {
	var uri = "https://gdata.youtube.com/feeds/api/videos/"+id+"?v=2&alt=json";
	web.get(uri, function (error, response, body) {
		var date, duration, title,
			views = "";
		if (error) {
			logger.error("[titlesnarfer[youtubeIt("+id+")]] error: "+error);
			irc.say(context, "Something has gone awry.");
			return;
		}
		try {
			body = JSON.parse(body).entry;
			if (body["yt$statistics"] && body["yt$statistics"].viewCount) {
				views = " - " + lib.commaNum(body.yt$statistics.viewCount);
				if (body.gd$rating && body.gd$rating.numRaters && body.gd$rating.numRaters > body.yt$statistics.viewCount)
					views = views + "+ views";
				else
					views = views + " views";
			}
			duration = dura(parseInt(body.media$group.yt$duration.seconds, 10));
			date = new Date(body["media$group"]["yt$uploaded"]["$t"]);
			date = zero(date.getDate())+"/"+zero(date.getMonth()+1)+"/"+date.getYear().toString().slice(1);
			title = body.title["$t"]+" - ["+duration+"] "+date+views;
			irc.say(context, title+(old ? " ("+old+")" : ""), false);
		} catch (err) { // failed to JSON.parse
			if (typeof body === "string" && body.indexOf("Private video") > -1) {
				title = "Private video.";
				irc.say(context, title);
			} else {
				logger.error("Parsed youtube response but something wasn't right -> " + err);
			}
		}
		if (record) {
			recordURL(record[0], record[1], record[2], title);
		}
		date = null; views = null; body = null; response = null; error = null;
	});
}

function sayTitle(context, uri, imgur, old, record) {
	var title, result;
	web.get("http://felt.ninja:5036/?singlespace=1&uri="+uri.href, function (error, response, body) {
		result = JSON.parse(body);
		if (result.error) {
			logger.error("titleSnarfer (sayTitle) API error: " + result.error);
			if (record)
				recordURL(record[0], record[1], record[2]);
			return;
		}
		title = lib.decode(result.title);
		if (imgur) {
			if (title === "imgur: the simple image sharer")
				return;
			if (title.slice(-8) === " - Imgur")
				title = title.slice(0, -8);
		} else if (title.toLowerCase().indexOf(uri.host) > -1) {
			title = title.replace(new RegExp(" " + uri.host + " ?", "ig"), "");
		}
		irc.say(context, title + " ~ " + uri.host.replace("www.", "")+(old ? " (" + old + ")" : ""), false);
		if (record)
			recordURL(record[0], record[1], record[2], title);
	});
}

evListen({
	handle: "titleSnarfer",
	event: "PRIVMSG",
	regex: /^:[^ ]+ PRIVMSG #[^ ]+ :.*((?:https?:\/\/)[^\x01 ]+)/i,
	callback: function (input) {
		var uri, ext, allow, old, record;
		
		if (input.args)
			return; // don't process urls in commands
		old = getURL(input.channel, input.match[1]) || false;
		if (!old)
			record = [ input.nick, input.channel, input.match[1] ];
		uri = url.parse(input.match[1]);
		switch (uri.host.replace(/www\./gi, "")) {
		case "youtube.com":
			youtubeIt(input.context, ytReg.exec(uri.path)[1], uri.host, old, record);
			return;
		case "youtu.be":
			youtubeIt(input.context, ytBReg.exec(uri.path)[1], uri.host, old, record);
			return;
		case "i.imgur.com":
			ext = uri.href.slice(uri.href.lastIndexOf("."));
			if (ext.match(/\.gif|\.gifv|\.jpg|\.jpeg|\.png|\.webm/i)) {
				uri.path = uri.path.slice(0, -ext.length);
				uri.href = uri.href.slice(0, -ext.length);
			}
		case "imgur.com":
			sayTitle(input.context, uri, true, old, record);
			return;
		}
		if (uri.path.length > 1 && uri.path.indexOf(".") > -1) {
			ext = uri.path.slice(uri.path.lastIndexOf(".")+1);
			if (ext.length <= 4 && !ext.match(/htm|html|asp|aspx|php|php3|php5/i))
				return; // avoid trying to grab mp4s etc.
		}
		sayTitle(input.context, uri, false, old, record);
	}
});

cmdListen({
	command: "lasturl",
	help: "Shows the last URLs people posted!",
	syntax: config.command_prefix+"lasturl [<nick>] [<term>] - Example: "
		+config.command_prefix+"lasturl ranma goatse",
	callback: function (input) {
		var searchTerm, target;
		if (!input.channel) {
			irc.say(input.context, "This can only be used in channels.");
			return;
		}
		target = (input.args ? input.args[0] : null);
		searchTerm = (input.args && input.args.length > 1 ? input.args.slice(1).join(" ") : null);
		irc.say(input.context, lastUrl(input.channel, target, searchTerm), false);
	}
});

cmdListen({
	command: "urlstats",
	help: "Shows URL stats!",
	syntax: config.command_prefix+"urlstats [<nick>] [<term>] - Example: "
		+config.command_prefix+"urlstats ranma imgur",
	callback: function (input) {
		var searchTerm, target;
		if (!input.channel) {
			irc.say(input.context, "This can only be used in channels.");
			return;
		}
		target = (input.args ? input.args[0] : null);
		searchTerm = (input.args && input.args.length > 1 ? input.args.slice(1).join(" ") : null);
		irc.say(input.context, urlStats(input.channel, target, searchTerm), false);
	}
});
