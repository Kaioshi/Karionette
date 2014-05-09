function parseTvRage(resp) {
	var i, data,
		ret = {};
	resp = resp.replace("<pre>", "").split("\n").slice(0,-1);
	for (i = 0; i < resp.length; i++) {
		data = resp[i].split("@");
		ret[data[0]] = data[1];
	}
	return ret;
}

cmdListen({
	command: "tvrage",
	help: "Shows the next airtime for a show. Note that TvRage does a search based on your input and \
		returns that result, so you may get something random sometimes, if it didn't know about the show.",
	syntax: config.command_prefix+"tvrage <show name> - Example: "+
		config.command_prefix+"tvrage Sherlock",
	callback: function (input) {
		var uri, show, resp, showtime, now;
		if (!input.args) {
			irc.say(input.context, cmdHelp("tvrage", "syntax"));
			return;
		}
		uri = "http://services.tvrage.com/tools/quickinfo.php?show="+input.data;
		web.get(uri, function (error, response, body) {
			if (body.indexOf("\n") === -1) {
				// this is tvrage's version of an error.
				// sort of.
				irc.say(input.context, "Not found, I guess? TvRage replied with: "+body, false);
				return;
			}
			show = parseTvRage(body);
			if (!show["Next Episode"]) {
				irc.say(input.context, "TvRage has no information about the next episode of "
					+show["Show Name"]+" - Status: "+show["Status"]+".");
				return;
			}
			resp = show["Show Name"]+" - "+show["Next Episode"].split("^").slice(0,-1).join(" - ");
			// HELLO FUTURE! How do I test for daylight savings?! This currently adds an hour because
			// the timezone it's written in doesn't practice daylight savings so the result is off by one hour.
			// Blame timezones. And Deide for not being helpful. Bastard. Linked me to a youtube video about
			// how timezones are annoying. I already knew that! - Grumposhi.
			showtime = show["GMT+0 NODST"]*1000+3600000;
			now = new Date().valueOf();
			if (now > showtime) {
				resp = resp+" aired "+lib.duration(showtime, now, true)+" ago and had a runtime of "+show.Runtime+" minutes.";
			} else {
				resp = resp+" airs in "+lib.duration(now, showtime, true)+" and has a runtime of "+show.Runtime+" minutes.";
			}
			irc.say(input.context, resp, false);
		});
	}
});
