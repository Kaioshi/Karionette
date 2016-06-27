// Commie airtimes - this command is poorly named.
"use strict";
bot.command({
	command: "airtime",
	help: "Hopefully shows airtimes of Commie things.",
	syntax: config.command_prefix+"airtime <show name>",
	arglen: 1,
	callback: function(input) {
		web.json("http://c.milkteafuzz.com/api/1/search.json?q="+input.data.trim()).then(function (resp) {
			if (resp[0] && resp[0]._id.$oid)
				return web.json("https://c.milkteafuzz.com/api/1/shows/"+resp[0]._id.$oid+".json");
			else
				throw Error("Couldn't find it. :\\");
		}).then(function (resp) {
			let status = "", title = "", airtime = "", date, now, eps = "";
			if (resp.status_code)
				throw Error("Couldn't find it. :<");
			if (resp.status)
				status = " - "+resp.status+" - ";
			if (resp.airtime) {
				date = new Date(resp.airtime.$date).valueOf();
				now = new Date().valueOf();
				if (date > now)
					airtime = "- The next episode airs in "+lib.duration(now, date)+".";
				else { // for some reason they don't increment the episodes as soon as the next one has aired.
					if (resp.episodes && resp.episodes.current)
						resp.episodes.current++;
					airtime = "- Last aired "+lib.duration(date, now)+" ago.";
				}
			}
			if (resp.episodes)
				eps = resp.episodes.current+" episodes ("+resp.episodes.total+" total) ";
			if (resp.titles) {
				if (resp.titles.english)
					title = resp.titles.english;
				if (resp.titles.japanese)
					title = (title ? "["+title+" / "+resp.titles.japanese.trim()+"]" : resp.titles.japanese);
			}
			irc.say(input.context, title+status+eps+airtime);
			resp = null; title = null; status = null; eps = null; airtime = null; date = null; now = null;
		}).catch(function (error) {
			irc.say(input.context, error.message);
		});
	}
});
