// url title snarfer
"use strict";
var url = require("url"),
	fs = require('fs');

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
	if (hours) ret.push(zero(hours));
	if (mins) ret.push(zero(mins));
	ret.push(zero(secs));
	return ret.join(":");
}

function recordURL(nick, channel, url) {
	var fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn)) fs.writeFileSync(fn, "");
	fs.appendFileSync(fn, url+" "+nick+" "+new Date().valueOf()+"\n");
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

function youtubeIt(context, id, host, old) {
	var uri = "https://gdata.youtube.com/feeds/api/videos/"+id+"?v=2&alt=json";
	web.get(uri, function (error, response, body) {
		var date, duration,
			views = "";
		if (error) {
			logger.error("[titlesnarfer[youtubeIt("+id+")]] error: "+error);
			irc.say(context, "Something has gone awry.");
			return;
		}
		body = JSON.parse(body).entry;
		if (body["yt$statistics"] && body["yt$statistics"].viewCount) {
			views = " - "+lib.commaNum(body["yt$statistics"].viewCount)+" views";
		}
		duration = dura(parseInt(body.media$group.yt$duration.seconds, 10));
		date = new Date(body["media$group"]["yt$uploaded"]["$t"]);
		date = zero(date.getDate())+"/"+zero(date.getMonth()+1)+"/"+date.getYear().toString().slice(1);
		irc.say(context, body.title["$t"]+" - ["+duration+"] "+date+views+(old ? " ("+old+")" : ""), false);
		date = null; views = null; body = null; response = null; error = null;
	});
}

function sayTitle(context, uri, length, imgur, old) {
	var reg, title;
	web.get(uri.href, function (error, response, body) {
		if (error) {
			logger.warn("error fetching "+uri.href+": "+error);
			return;
		}
		if (!body) {
			logger.warn(uri.href + " - returned no body.");
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
		irc.say(context, lib.singleSpace(lib.decode(title))+
			" ~ "+uri.host.replace("www.", "")+(old ? " ("+old+")" : ""), false);
		reg = null; title = null; body = null; response = null; error = null;
	}, length);
}

evListen({
	handle: "titleSnarfer",
	event: "PRIVMSG",
	regex: /^:[^ ]+ PRIVMSG #[^ ]+ :.*((?:https?:\/\/)[^\x01 ]+)/i,
	callback: function (input) {
		var uri, ext, allow, old, length = 10000;
		
		if (input.args) return; // don't process urls in commands
		old = getURL(input.channel, input.match[1]);
		if (!old) recordURL(input.nick, input.channel, input.match[1]);
		uri = url.parse(input.match[1]);
		if (uri.host.indexOf("youtube.com") > -1 && uri.path.indexOf("v=") > -1) {
			youtubeIt(input.context, /v=([^ &\?]+)/i.exec(uri.path)[1], uri.host, old);
			return;
		}
		if (uri.host.indexOf("youtu.be") > -1 && uri.path.length > 1) {
			youtubeIt(input.context, /^\/([^ &\?]+)/.exec(uri.path)[1], uri.host, old);
			return;
		}
		if (uri.host === "imgur.com") {
			sayTitle(input.context, uri, length, true, old);
			return;
		}
		if (uri.host === "i.imgur.com" && uri.href.slice(-4).match(/\.jpg|\.png|\.gif/i)) {
			uri.path = uri.path.slice(0,-4);
			uri.href = uri.href.slice(0,-4);
			sayTitle(input.context, uri, length, true, old);
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
		sayTitle(input.context, uri, length, false, old);
	}
});

