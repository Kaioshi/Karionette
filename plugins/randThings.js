var randDB = new DB.List({filename: "randomThings"});

cmdListen({
	command: "thing",
	help: "add to randThings",
	syntax: config.command_prefix+"thing add <thing> - Example: "+config.command_prefix+
		"thing add ranma's dodgy undies",
	callback: function (input) {
		if (input.args && input.args[0]) {
			// What option is picked
			switch (input.args[0].toLowerCase()) {
			case 'add':
				if (!input.args[1]) {
					irc.say(input.context, cmdHelp("thing", "syntax"));
					return;
				}
				randDB.saveOne(input.args.slice(1).join(" "));
				irc.say(input.context, 'Added :)');
				break;
			default:
				irc.say(input.context, cmdHelp("thing", "syntax"));
				break;
			}
		} else {
			irc.say(input.context, cmdHelp("thing", "syntax"));
		}
	}
});
