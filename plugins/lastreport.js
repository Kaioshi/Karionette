// shows the last recorded error.
cmdListen({
	command: "last",
	help: "Shows the last error/warning, if there is one.",
	syntax: config.command_prefix + "last <warning/error> [clear]",
	admin: true,
	arglen: 1,
	callback: function (input) {
		var messages;
		switch (input.args[0]) {
			case "err":
			case "error":
				if (globals.lastError) {
					if (input.args[1] === "clear") {
						delete globals.lastError;
						if (globals.lastErrstack) delete globals.lastErrstack;
						irc.say(input.context, "Last error cleared.");
						break;
					}
					irc.say(input.context, "The last recorded error was: "+globals.lastError);
					if (globals.lastErrstack) {
						messages = [];
						globals.lastErrstack.split("\n").forEach(function (err) {
							messages.push([ "say", input.context, err, false ]);
						});
						irc.rated(messages);
					}
					break;
				}
				irc.say(input.context, "There haven't been any errors.");
				break;
			case "warn":
			case "warning":
				if (globals.lastWarning) {
					if (input.args[1] === "clear") { 
						delete globals.lastWarning;
						irc.say(input.context, "Last warning cleared.");
						break;
					}
					irc.say(input.context, "The last recorded warning was: "+globals.lastWarning);
					break;
				}
				irc.say(input.context, "There haven't been any warnings.");
				break;
			default:
				irc.say(input.context, cmdHelp("last", "syntax"));
				break;
		}
	}
});

