// TvRage fondler
"use strict";
function parseTvRage(resp) {
	var i, l, data, ret = {};
	resp = resp.replace("<pre>", "").split("\n").slice(0, -1);
	i = 0; l = resp.length;
	for (; i < l; i++) {
		data = parseEntry(resp[i].split("@"));
		if (data)
			ret[data[0]] = data[1];
	}
	return ret;
}

function parseEntry(entry) {
	if (!entry[1])
		return;
	switch (entry[0]) {
	case "Latest Episode":
		entry[1] = entry[1].split("^");
		return [ entry[0], { title: entry[1][0]+" - "+entry[1][1], release: "Aired: "+entry[1][2] } ];
	case "Next Episode":
		entry[1] = entry[1].split("^");
		return [ entry[0], { title: entry[1][0]+" - "+entry[1][1], release: "Airs: "+entry[1][2] } ];
	case "Genres":
		return [ entry[0], entry[1].split(" | ").join(", ") ];
	default:
		return entry;
	}
}

function getShowDuration(show) {
	var years;
	if (show.Started && show.Ended) {
		years = (parseInt(show.Ended.slice(show.Ended.length-4), 10) -
			parseInt(show.Started.slice(show.Started.length-4), 10));
		years = years || 1;
		return " ~ Ran for "+years+" "+(years > 1 ? "years" : "year");
	}
	return "";
}

function getShowtime(show) {
	var type = (show["Next Episode"] ? "Next Episode" : "Latest Episode");
	if (!show[type] || !show[type].title)
		return (show.Premiered ? "Premiered in "+show.Premiered : show.Started+"->"+show.Ended);
	return show[type].title+" ~ "+show[type].release;
}

function getGenres(show) {
	return (show.Genres ? " - ["+show.Genres+"]" : "");
}

function getShowInfo(show) {
	return show["Show Name"]+" - "+getShowtime(show)+getShowDuration(show)+getGenres(show)+" ~ Status: "+show.Status;
}

bot.command({
	command: "tvrage",
	help: "Shows the next airtime for a show. Note that TvRage does a search based on your input and returns that result, "+
		"so you may get something random sometimes, if it didn't know about the show.",
	syntax: config.command_prefix+"tvrage <show name> - Example: "+config.command_prefix+"tvrage Sherlock",
	arglen: 1,
	callback: function (input) {
		var uri = "http://services.tvrage.com/tools/quickinfo.php?show="+input.data;
		web.fetch(uri).then(function (body) {
			if (body.indexOf("\n") === -1)// this is tvrage's version of an error.
				irc.say(input.context, "Couldn't find it."); // sort of.
			else
				irc.say(input.context, getShowInfo(parseTvRage(body)), false);
		});
	}
});
