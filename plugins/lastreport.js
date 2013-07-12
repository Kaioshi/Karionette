// shows the last recorded error.
listen({
	plugin: "lastreport",
	handle: "last",
	regex: regexFactory.startsWith("last"),
	command: {
		root: "last",
		options: "error, warning",
		help: "Shows the last error/warning, if there is one.",
		syntax: "[Help] Syntax: " + config.command_prefix + "last <warning/error> [clear]"
	},
	callback: function (input, match) {
		var args = match[1].split(" ");
		if (args[0]) {
			switch (args[0]) {
				case "err":
				case "error":
					if (globals.lastError) {
						if (args[1]) { 
							if (args[1] === "clear") {
								globals.lastError = "";
								irc.say(input.context, "Last error cleared.");
								break;
							}
							irc.say(input.context, this.command.syntax);
							break;
						}
						irc.say(input.context, "The last recorded error was: "+globals.lastError);
						break;
					}
					irc.say(input.context, "There haven't been any errors.");
					break;
				case "warn":
				case "warning":
					if (globals.lastWarning) {
						if (args[1]) { 
							if (args[1] === "clear") {
								globals.lastWarning = "";
								irc.say(input.context, "Last warning cleared.");
								break;
							}
							irc.say(input.context, this.command.syntax);
							break;
						}
						irc.say(input.context, "The last recorded warning was: "+globals.lastWarning);
						break;
					}
					irc.say(input.context, "There haven't been any warnings.");
					break;
				default:
					irc.say(input.context, this.command.syntax);
					break;
			}
		} else {
			irc.say(input.context, this.command.syntax);
		}
	}
});

