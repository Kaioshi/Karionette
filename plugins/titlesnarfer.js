// url title snarfer
"use strict";
var url = require("url"),
	fs = require("fs"),
	ytReg = /v=([^ &\?]+)/i,
	ytBReg = /^\/([^ &\?]+)/,
	titleReg, sayTitle;

if (config.titlesnarfer_inline) {
	titleReg = /<title?[^>]+>([^<]+)<\/title>/i;
	sayTitle = function (context, uri, imgur, old, record, length) {
		var reg, title;
		web.fetch(uri.href, length).then(function (body) {
			if (!body) {
				logger.warn(uri.href + " - returned no body.");
				return;
			}
			reg = titleReg.exec(body.replace(/\n|\t|\r/g, ""));
			if (!reg || !reg[1])
				return;
			title = lib.singleSpace(lib.decode(reg[1]));
			if (title.toLowerCase().indexOf(uri.host) > -1) {
				reg = new RegExp(" "+uri.host+" ?", "ig");
				title = title.replace(reg, "");
			}
			if (imgur) { // I know there are a lot of imgur corner cases, but it's really common.
				if (title.slice(-8) === " - Imgur") // deal with it
					title = title.slice(0,-8);
				if (title === "imgur: the simple image sharer")
					return;
			}
			irc.say(context, title+" ~ "+uri.host.replace("www.", "")+(old ? " ("+old+")" : ""));
			if (record)
				recordURL(record[0], record[1], record[2], title);
		});
	};
} else {
	sayTitle = function (context, uri, imgur, old, record) {
		var title;
		web.json("http://felt.ninja:5036/?singlespace=1&uri="+uri.href).then(function (result) {
			if (result.error) {
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
			irc.say(context, title + " ~ " + uri.host.replace("www.", "")+(old ? " (" + old + ")" : ""));
			if (record)
				recordURL(record[0], record[1], record[2], title);
		});
	};
}

if (fs.existsSync("data/urls.json")) {
	convertUrls();
}

function convertUrls() {
	var db = JSON.parse(fs.readFileSync("data/urls.json").toString()),
		i, fn;
	if (!fs.existsSync("data/urls/"))
		fs.mkdirSync("data/urls/");
	Object.keys(db).forEach(function (channel) {
		Object.keys(db[channel]).forEach(function (nick) {
			fn = "data/urls/"+channel.toLowerCase()+".txt";
			for (i = 0; i < db[channel][nick].length; i++) {
				fs.appendFileSync(fn, db[channel][nick][i][0]+" "+nick+" "+new Date(db[channel][nick][i][1]).valueOf()+"\n");
			}
		});
	});
	fs.unlinkSync("data/urls.json");
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
		return mostRecent[1]+" linked "+mostRecent[0]+" "+
			(mostRecent[3] ? "("+mostRecent.slice(3).join(" ")+") " : "")+
			lib.duration(mostRecent[2], null, true)+" ago.";
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

function youtubeIt(context, id, old, record) {
	var resp;
	web.youtubeByID(id).then(function (yt) {
		yt.date = yt.date.split("T")[0];
		yt.views = lib.commaNum(yt.views);
		if (config.titlesnarfer_youtube_format !== undefined) {
			yt.b = "\x02";
			resp = lib.formatOutput(config.titlesnarfer_youtube_format, yt);
		} else {
			resp = lib.formatOutput("{title} - [{duration}] {date} - {channel} - {views} views", yt);
		}
		irc.say(context, resp+(old ? " ("+old+")" : ""));
		if (record)
			recordURL(record[0], record[1], record[2], yt.title);
	}, function (error) {
		if (error.reason === "keyInvalid")
			irc.say(context, "You need a youtube API key in the config. See https://developers.google.com/youtube/v3/getting-started");
		else
			irc.say(context, error.message+": "+error.reason);
	});
}

bot.event({
	handle: "titleSnarfer",
	event: "PRIVMSG",
	regex: /^:[^ ]+ PRIVMSG #[^ ]+ :.*((?:https?:\/\/)[^\x01 ]+)/i,
	callback: function (input) {
		var uri, ext, old, record, videoID;

		if (input.args)
			return; // don't process urls in commands
		old = getURL(input.channel, input.match[1]) || false;
		if (!old)
			record = [ input.nick, input.channel, input.match[1] ];
		uri = url.parse(input.match[1]);
		switch (uri.host.replace(/www\./gi, "")) {
		case "youtube.com":
			if (!config.api.youtube)
				break;
			videoID = ytReg.exec(uri.path);
			if (videoID) {
				youtubeIt(input.context, videoID[1], old, record);
				return;
			}
			break;
		case "youtu.be":
			if (!config.api.youtube)
				break;
			videoID = ytBReg.exec(uri.path);
			if (videoID) {
				youtubeIt(input.context, videoID[1], old, record);
				return;
			}
			break;
		case "i.imgur.com":
			ext = uri.href.slice(uri.href.lastIndexOf("."));
			if (ext.match(/\.gif|\.gifv|\.jpg|\.jpeg|\.png|\.webm/i)) {
				uri.path = uri.path.slice(0, -ext.length);
				uri.href = uri.href.slice(0, -ext.length);
			}
		/* fall through */
		case "imgur.com":
			sayTitle(input.context, uri, true, old, record, 10000);
			return;
		}
		if (uri.path.length > 1 && uri.path.indexOf(".") > -1) {
			ext = uri.path.slice(uri.path.lastIndexOf(".")+1);
			if (ext.length <= 4 && !ext.match(/htm|html|asp|aspx|php|php3|php5/i))
				return; // avoid trying to grab mp4s etc.
		}
		sayTitle(input.context, uri, false, old, record, 10000);
	}
});

bot.command({
	command: "lasturl",
	help: "Shows the last URLs people posted!",
	syntax: config.command_prefix+"lasturl [<nick>] [<term>] - Example: "+
		config.command_prefix+"lasturl ranma goatse",
	callback: function (input) {
		var searchTerm, target;
		if (!input.channel) {
			irc.say(input.context, "This can only be used in channels.");
			return;
		}
		target = (input.args ? input.args[0] : null);
		searchTerm = (input.args && input.args.length > 1 ? input.args.slice(1).join(" ") : null);
		irc.say(input.context, lastUrl(input.channel, target, searchTerm));
	}
});

bot.command({
	command: "urlstats",
	help: "Shows URL stats!",
	syntax: config.command_prefix+"urlstats [<nick>] [<term>] - Example: "+
		config.command_prefix+"urlstats ranma imgur",
	callback: function (input) {
		var searchTerm, target;
		if (!input.channel) {
			irc.say(input.context, "This can only be used in channels.");
			return;
		}
		target = (input.args ? input.args[0] : null);
		searchTerm = (input.args && input.args.length > 1 ? input.args.slice(1).join(" ") : null);
		irc.say(input.context, urlStats(input.channel, target, searchTerm));
	}
});
