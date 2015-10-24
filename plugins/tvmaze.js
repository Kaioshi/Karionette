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
			var resp, show;
			if (!json.length) {
				irc.say(input.context, "Couldn't find \""+showName+"\".");
				return;
			}
			show = json[0].show;
			resp = [
				show.name+(show.genres.length ? " ["+show.genres.join(", ")+"]" : ""),
				"Type: "+show.type,
				"Premiered: "+show.premiered,
				"Status: "+(show.status === "Running" ? "Ongoing" : show.status),
				"Runtime: "+show.runtime,
				"Network: "+show.network.name+" ("+show.network.country.name+")"
			];
			if (show.status === "Running")
				resp.push("Schedule: "+show.schedule.time+" on "+lib.commaList(show.schedule.days));
			irc.say(input.context, resp.join(" - "));
			if (showSummary)
				irc.say(input.context, "Summary: "+lib.stripHtml(show.summary), 1);
		}).catch(function (err) {
			irc.say(input.context, "Somethin' done broke.");
			logger.error(err, err);
		});
	}
});
