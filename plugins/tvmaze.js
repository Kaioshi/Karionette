// http://api.tvmaze.com/search/shows?q=girls
"use strict";

function zero(n) {
	if (n <= 9)
		return "0"+n;
	return n.toString();
}

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
		web.fetch("http://api.tvmaze.com/singlesearch/shows?q="+showName+"&embed=nextepisode").then(function (body) {
			var resp, show, next;
			if (!body.length) {
				irc.say(input.context, "Couldn't find \""+showName+"\".");
				return;
			}
			show = JSON.parse(body);
			resp = [
				show.name+(show.genres.length ? " ["+show.genres.join(", ")+"]" : ""),
				"Type: "+show.type,
				"Premiered: "+show.premiered,
				"Status: "+(show.status === "Running" ? "Ongoing" : show.status),
				"Runtime: "+show.runtime,
				"Network: "+show.network.name+" ("+show.network.country.name+")"
			];
			if (show.status === "Running" && show._embedded !== undefined) {
				next = show._embedded.nextepisode;
				resp.push("Next episode: S"+zero(next.season)+"E"+zero(next.number)+" \""+next.name+"\" airs on "+next.airdate+" at "+next.airtime);
			}
			irc.say(input.context, resp.join(" - "));
			if (showSummary)
				irc.say(input.context, "Summary: "+lib.stripHtml(show.summary), 1);
		}).catch(function (err) {
			irc.say(input.context, "Somethin' done broke.");
			logger.error(err, err);
		});
	}
});
