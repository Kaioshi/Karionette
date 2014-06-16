'use strict';

cmdListen({
	command: "shorten",
	help: "Shortens URLs!",
	syntax: config.command_prefix+"shorten <url> - Example: "
		+config.command_prefix+"shorten http://mitch_.likesbuttse.xxx",
	callback: function (input) {
		web.get("http://is.gd/create.php?format=simple&url="+input.data.trim(), function (error, response, body) {
			irc.say(input.context, body);
		});
	}
});
