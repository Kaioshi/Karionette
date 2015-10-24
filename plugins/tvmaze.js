// http://api.tvmaze.com/search/shows?q=girls
"use strict";

bot.command({
	command: [ "tvmaze", "tvr" ],
	help: "Looks up broadcast times etc.",
	syntax: config.command_prefix+"tvmaze [-s] <show name> - Example: "+config.command_prefix+"tvmaze -s Heroes Reborn",
	arglen: 1,
	callback: function tvmaze(input) {
		var showName, showSummary = false;
		if (input.args[0].toLowerCase() === "-s") {
			showName = input.args.slice(1).join(" ");
			showSummary = true;
		} else {
			showName = input.data;
		}
		web.json("http://api.tvmaze.com/search/shows?q="+showName).then(function (json) {
			var show, genres, schedule, status, type, network, runtime, prem;
			if (!json.length) {
				irc.say(input.context, "Couldn't find \""+showName+"\".");
				return;
			}
			show = json[0].show;
			genres = " ["+lib.commaList(show.genres)+"]";
			type = "Type: "+show.type;
			prem = "Premiered: "+show.premiered;
			status = "Status: "+show.status;
			runtime = "Runtime: "+show.runtime;
			network = "Network: "+show.network.name+" ("+show.network.country.name+")";
			schedule = "Schedule: "+show.schedule.time+" on "+lib.commaList(show.schedule.days);
			irc.say(input.context, [ show.name+genres, status, type, prem, network, schedule ].join(" - "));
			if (showSummary)
				irc.say(input.context, "Summary: "+lib.stripHtml(show.summary), 1);
		}).catch(function (err) {
			irc.say(input.context, "Somethin' done broke.");
			logger.error(err, err);
		});
	}
});
