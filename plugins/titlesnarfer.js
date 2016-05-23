// url title snarfer
"use strict";
var url = require("url"),
	fs = require("fs"),
	titleFilterDB = new DB.Json({filename: "titlefilters"}),
	ytReg = /v=([^ &\?]+)/i,
	ytBReg = /^\/([^ &\?]+)/,
	recentURLs = {},
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
			if (!reg || !reg[1]) {
				if (record)
					recordURL(record[0], record[1], record[2]);
				return;
			}
			title = lib.singleSpace(lib.decode(reg[1]));
			if (record)
				recordURL(record[0], record[1], record[2], title);
			if (!isFilteredTitle(title))
				irc.say(context, trimTitle(title)+" ~ "+uri.host.replace("www.", "")+(old ? " ("+old+")" : ""));
		});
	};
} else {
	sayTitle = function (context, uri, imgur, old, record) {
		var title, now = Date.now();
		if (recentURLs[uri.href]) {
			if ((now - recentURLs[uri.href]) < 10000) { // announced in the last 10 seconds
				logger.debug("Announced "+uri.href+" within the last 10 seconds, not announcing.");
				if (record)
					recordURL(record[0], record[1], record[2]);
				return;
			}
		}
		recentURLs[uri.href] = now;
		web.json("http://felt.ninja:5036/?singlespace=1&uri="+uri.href).then(function (result) { // THIS PROMISE NEEDS AN ERROR FUNCTION
			if (result.error) {
				if (record)
					recordURL(record[0], record[1], record[2]);
				return;
			}
			title = lib.decode(result.title);
			if (record)
				recordURL(record[0], record[1], record[2], title);
			if (!isFilteredTitle(title))
				irc.say(context, trimTitle(title)+" ~ "+uri.host.replace("www.", "")+(old ? " ("+old+")" : ""));
		}).catch(function (err) {
			logger.error("sayTitle failed: "+err, err);
		});
	};
}

function lastUrl(channel, nick, match) {
	var i, urls, mostRecent, index, entry, lnick,
		fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn))
		return "I haven't seen any URLs here.";
	urls = fs.readFileSync(fn).toString().split("\n");
	i = urls.length;
	if (match)
		match = match.toLowerCase();
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
	} else if (i >= 1) {
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
	if (!fs.existsSync(fn))
		return "I haven't seen any URLs here.";
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
	if (!fs.existsSync(fn))
		fs.writeFileSync(fn, "");
	fs.appendFileSync(fn, url+" "+nick+" "+Date.now()+(title ? " "+title+"\n" : "\n"));
}

function getURL(channel, url) { // make this less bad.
	var i, l, urls, entry,
		fn = "data/urls/"+channel.toLowerCase()+".txt";
	if (!fs.existsSync(fn))
		return;
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
		// probably a wrong link past here, we don't care
	}).catch(function (error) {
		logger.error("youtubeIt failed: "+error, error);
	});
}

function findURL(line) {
	var ret, end, httpIndex, httpsIndex,
		lowerLine = line.toLowerCase();
	if ((httpIndex = lowerLine.indexOf("http://")) === -1 && (httpsIndex = lowerLine.indexOf("https://")) === -1)
		return;
	if (httpIndex > -1 && httpsIndex > -1) // both exist, pick the first one
		ret = line.slice((httpIndex > httpsIndex ? httpsIndex : httpIndex));
	else
		ret = line.slice((httpIndex > -1 ? httpIndex : httpsIndex));
	if ((end = ret.indexOf(" ")) !== -1)
		ret = ret.slice(0, end);
	ret = url.parse(ret);
	if (!ret.protocol || !ret.host)
		return;
	return ret;
}

bot.event({
	handle: "titleSnarfer",
	event: "PRIVMSG",
	condition: function (input) {
		if (input.args !== undefined)
			return false;
		input.url = findURL(input.message);
		if (!input.url)
			return false;
		return true;
	},
	callback: function titlesnarfer(input) {
		var ext, old, record, videoID, domain;

		old = getURL(input.channel, input.url.href) || false;
		if (!old)
			record = [ input.nick, input.channel, input.url.href ];
		domain = input.url.host.replace(/www\./gi, "");
		// check domain filter
		if (isFilteredDomain(domain)) {
			if (record)
				recordURL(record[0], record[1], record[2]);
			return;
		}
		switch (domain) {
		case "youtube.com":
			if (!config.api.youtube)
				break;
			videoID = ytReg.exec(input.url.path);
			if (videoID) {
				youtubeIt(input.context, videoID[1], old, record);
				return;
			}
			break;
		case "youtu.be":
			if (!config.api.youtube)
				break;
			videoID = ytBReg.exec(input.url.path);
			if (videoID) {
				youtubeIt(input.context, videoID[1], old, record);
				return;
			}
			break;
		case "i.imgur.com":
			ext = input.url.href.slice(input.url.href.lastIndexOf("."));
			if (ext.match(/\.gif|\.gifv|\.jpg|\.jpeg|\.png|\.webm/i)) {
				input.url.path = input.url.path.slice(0, -ext.length);
				input.url.href = input.url.href.slice(0, -ext.length);
			}
			break;
		default:
			if (input.url.path.length > 1 && input.url.path.indexOf(".") > -1) {
				ext = input.url.path.slice(input.url.path.lastIndexOf(".")+1);
				if (ext.length <= 4 && !ext.match(/htm|html|asp|aspx|php|php3|php5/i))
					return; // avoid trying to grab mp4s etc.
			}
			break;
		}
		sayTitle(input.context, input.url, false, old, record, 10000);
	}
});

bot.command({
	command: "lasturl",
	help: "Shows the last URLs people posted!",
	syntax: config.command_prefix+"lasturl [<nick>] [<term>] - Example: "+
		config.command_prefix+"lasturl ranma goatse",
	callback: function lasturl(input) {
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
	callback: function urlstats(input) {
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

bot.command({
	command: "tsfilter",
	help: "Add or remove titlesnarfer filters. Doesn't apply to processed YouTube results.",
	syntax: config.command_prefix+"tsfilter <add/remove> <trim / title / domain> <string> or "+
		config.command_prefix+"tsfilter list [titles / trims / domains] - Example: "+
		config.command_prefix+"tsfilter add title Imgur: The most awesome images on the Internet - or "+
		config.command_prefix+"tsfilter add trim Wikipedia, the free encyclopedia",
	admin: true,
	arglen: 1,
	callback: function titlefilter(input) {
		switch (input.args[0].toLowerCase()) {
		case "add":
			if (input.args.length >= 3)
				tsfilterAdd(input);
			else
				irc.say(input.context, bot.cmdHelp("tsfilter", "syntax"));
			break;
		case "remove":
			if (input.args.length >= 3)
				tsfilterRemove(input);
			else
				irc.say(input.context, bot.cmdHelp("tsfilter", "syntax"));
			break;
		case "list":
			tsfilterList(input);
			break;
		default:
			irc.say(input.context, bot.cmdHelp("tsfilter", "syntax"));
			break;
		}
	}
});

function isFilteredDomain(domain) {
	var i, domains = titleFilterDB.getOne("domains") || [];
	if (domains.indexOf(domain) > -1)
		return true;
	for (i = 0; i < domains.length; i++) {
		if (domain.indexOf(domains[i]) > -1 && domain.slice(domain.length-domains[i].length) === domains[i])
			return true;
	}
}

function isFilteredTitle(title) {
	var titles = titleFilterDB.getOne("titles") || [];
	return titles.indexOf(title) > -1;
}

function trimTitle(title) {
	var i, trims = titleFilterDB.getOne("trims");
	if (trims === undefined || !trims.length)
		return title;
	for (i = 0; i < trims.length; i++)
		if (title.indexOf(trims[i]) > -1)
			title = title.replace(trims[i], "");
	return lib.singleSpace(title);
}

function tsfilterAdd(input) {
	var domains, titles, trims,
		args = input.args.slice(1),
		data = input.data.slice(input.data.indexOf(" ")+1);
	switch (args[0].toLowerCase()) {
	case "domain":
		domains = titleFilterDB.getOne("domains") || [];
		if (domains.indexOf(args[1]) > -1) {
			irc.say(input.context, "That domain is already being filtered.");
			break;
		}
		domains.push(args[1]);
		titleFilterDB.saveOne("domains", domains);
		irc.say(input.context, "Added. o7");
		break;
	case "title":
		data = data.slice(data.indexOf(" ")+1);
		titles = titleFilterDB.getOne("titles") || [];
		if (titles.indexOf(data) > -1) {
			irc.say(input.context, "That title is already being filtered.");
			break;
		}
		titles.push(data);
		titleFilterDB.saveOne("titles", titles);
		irc.say(input.context, "Added. o7");
		break;
	case "trim":
		data = data.slice(data.indexOf(" ")+1);
		trims = titleFilterDB.getOne("trims") || [];
		if (trims.indexOf(data) > -1) {
			irc.say(input.context, "That's already being trimmed.");
			break;
		}
		trims.push(data);
		titleFilterDB.saveOne("trims", trims);
		irc.say(input.context, "Added. o7");
		break;
	default:
		irc.say(input.context, bot.cmdHelp("tsfilter", "syntax"));
		break;
	}
}

function tsfilterRemove(input) {
	var index, domains, titles, trims,
		args = input.args.slice(1),
		data = input.data.slice(input.data.indexOf(" ")+1);
	switch (args[0].toLowerCase()) {
	case "domain":
		domains = titleFilterDB.getOne("domains") || [];
		if ((index = domains.indexOf(args[1])) === -1) {
			irc.say(input.context, "That domain is not being filtered.");
			break;
		}
		domains.splice(index, 1);
		titleFilterDB.saveOne("domains", domains);
		irc.say(input.context, "Removed. o7");
		break;
	case "title":
		data = data.slice(data.indexOf(" ")+1);
		titles = titleFilterDB.getOne("titles") || [];
		if ((index = titles.indexOf(data)) === -1) {
			irc.say(input.context, "That title is not being filtered.");
			break;
		}
		titles.splice(index, 1);
		titleFilterDB.saveOne("titles", titles);
		irc.say(input.context, "Removed. o7");
		break;
	case "trim":
		data = data.slice(data.indexOf(" ")+1);
		trims = titleFilterDB.getOne("trims") || [];
		if ((index = trims.indexOf(data)) === -1) {
			irc.say(input.context, "That isn't being trimmed.");
			break;
		}
		trims.splice(index, 1);
		titleFilterDB.saveOne("trims", trims);
		irc.say(input.context, "Removed. o7");
		break;
	default:
		irc.say(input.context, bot.cmdHelp("tsfilter", "syntax"));
		break;
	}
}

function tsfilterList(input) {
	var trims, trimsCount, titles, titlesCount, domains, domainsCount;
	switch (input.args[1]) {
	case "titles":
		titles = titleFilterDB.getOne("titles");
		if (titles && titles.length)
			irc.say(input.context, "Filtered titles: "+titles.map(function (title) { return "\""+title+"\""; }).join(" || "));
		else
			irc.say(input.context, "No titles are being filtered.");
		break;
	case "trims":
		trims = titleFilterDB.getOne("trims");
		if (trims && trims.length)
			irc.say(input.context, "Bits trimmed from titles: "+trims.map(function (trim) { return "\""+trim+"\""; }).join(" || "));
		else
			irc.say(input.context, "Nothing is being trimmed.");
		break;
	case "domains":
		domains = titleFilterDB.getOne("domains");
		if (domains && domains.length)
			irc.say(input.context, "Filtered domains: "+lib.commaList(domains));
		else
			irc.say(input.context, "No titles are being filter via domain match.");
		break;
	default: // summary
		titles = titleFilterDB.getOne("titles");
		titlesCount = (titles && titles.length ? titles.length : 0);
		trims = titleFilterDB.getOne("trims");
		trimsCount = (trims && trims.length ? trims.length : 0);
		domains = titleFilterDB.getOne("domains");
		domainsCount = (domains && domains.length ? domains.length : 0);
		irc.say(input.context, "The titlesnarfer is filtering "+titlesCount+" titles, "+domainsCount+" domains and trimming "+
			trimsCount+" items from reported titles.");
		break;
	}
}
