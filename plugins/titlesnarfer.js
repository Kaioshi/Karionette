// url title snarfer - THIS ONLY WORKS ON UNIX - must have wget, head and egrep installed.
var ent = require("./lib/entities.js"),
	sys = require("sys"),
	url = require("url"),
	urlDB = new DB.Json({ filename: "urls" });

function zero(n) {
	return (n > 9 ? n : "0" + n);
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
						ret = "Old! " + (keys[i] === nick ? "You" : keys[i]) + " linked this " + lib.duration(new Date(entry[keys[i]][k][1])) + " ago.";
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
		var uri, title, reg, ext, allow,
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

