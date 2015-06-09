// Commie airtimes - this command is poorly named.
"use strict";
cmdListen({
	command: "airtime",
	help: "Hopefully shows airtimes of Commie things.",
	syntax: config.command_prefix+"airtime <show name>",
	arglen: 1,
	callback: function(input) {
		web.get("http://c.milkteafuzz.com/api/1/search.json?q="+input.data.trim(), function (error, resp, body) {
			body = JSON.parse(body);
			if (body[0] && body[0]._id.$oid) {
				web.get("https://c.milkteafuzz.com/api/1/shows/"+body[0]._id.$oid+".json", function (error, resp, body) {
					var status = "",
						title = "",
						airtime = "",
						date, now,
						eps = "";
					body = JSON.parse(body);
					if (body.status_code) {
						irc.say(input.context, "Couldn't find it. :<");
						return;
					}
					if (body.status) status = " - "+body.status+" - ";
					if (body.airtime) {
						date = new Date(body.airtime.$date).valueOf();
						now = new Date().valueOf();
						if (date > now) airtime = "- The next episode airs in "+lib.duration(now, date)+".";
						else {
							// for some reason they don't increment the episodes as soon as the next one has aired.
							if (body.episodes && body.episodes.current) body.episodes.current++;
							airtime = "- Last aired "+lib.duration(date, now)+" ago.";
						}
					}
					if (body.episodes) eps = body.episodes.current+" episodes ("+body.episodes.total+" total) ";
					if (body.titles) {
						if (body.titles.english) title = body.titles.english;
						if (body.titles.japanese) title = (title ? "["+title+" / "+body.titles.japanese.trim()+"]" : body.titles.japanese);
					}
					irc.say(input.context, title+status+eps+airtime, false);
					body = null; title = null; status = null; eps = null; airtime = null; date = null; now = null;
				});
			} else {
				irc.say(input.context, "Couldn't find it. :<");
			}
		});
	}
});
