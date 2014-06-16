'use strict';

cmdListen({
	command: "shorten",
	help: "Shortens URLs!",
	syntax: config.command_prefix+"shorten [-p(review)] <url> - Example: "
		+config.command_prefix+"shorten http://mitch_.likesbuttse.xxx",
	callback: function (input) {
		var gd, url;
		if (!input.args) {
			irc.say(input.context, cmdHelp("shorten", "syntax"));
			return;
		}
		switch (input.args[0].toLowerCase()) {
		case "-p":
		case "-preview":
			if (!input.args[1]) {
				irc.say(input.context, cmdHelp("shorten", "syntax"));
				return;
			}
			gd = "v.gd";
			url = input.args.slice(1).join(" ");
			break;
		default:
			gd = "is.gd";
			url = input.data;
			break;
		}
		web.get("http://"+gd+"/create.php?format=simple&url="+url.trim(), function (error, response, body) {
			irc.say(input.context, body);
		});
	}
});
