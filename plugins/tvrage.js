cmdListen({
	command: "tvrage",
	help: "Shows the next airtime for a 3Dpd TV show.",
	syntax: config.command_prefix+"tvrage <show name> - Example: "+
		config.command_prefix+"tvrage Sherlock",
	callback: function (input) {
		var uri, show, last, next, timeUntil, runtime;
		if (!input.args) {
			irc.say(input.context, cmdHelp("tvrage", "syntax"));
			return;
		}
		uri = "http://services.tvrage.com/tools/quickinfo.php?show="+input.data;
		web.get(uri, function (error, response, body) {
			globals.lastResp = body;
			body = body.split("\n").slice(0,-1);
			show = body[1].split("@")[1];
			//last = body[6].split("@")[1]; last = last.split("^"); last = last[0]+" - "+last[1];
			next = body[7].split("@")[1]; next = next.split("^"); next = next[0]+" - "+next[1];
			timeUntil = lib.duration(new Date(), new Date(body[9].split("@")[1]*1000+3600000)); // this is bad. sorry. no daylight shavings here..
			runtime = body[16].split("@")[1]+" minutes.";
			irc.say(input.context, "\""+show+" - "+next+"\" airs in "+timeUntil+" and has a runtime of "+runtime, false);
		});
	}
});
