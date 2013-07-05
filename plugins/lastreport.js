// shows the last recorded error.
listen({
	plugin: "lastreport",
	handle: "last",
	regex: regexFactory.startsWith("last"),
	command: {
		root: "last",
		options: "error, warning",
		help: "Shows the last error /warning, if there is one."
	},
	callback: function (input, match) {
		var args = match[1].split(" ");
		if (args[0]) {
			switch (args[0]) {
				case "err":
				case "error":
					if (globals.lastError) {
						irc.say(input.context, "The last recorded error was: "+globals.lastError);
					} else {
						irc.say(input.context, "There haven't been any errors.");
					}
					break;
				case "warn":
				case "warning":
					if (globals.lastWarning) {
						irc.say(input.context, "The last recorded warning was: "+globals.lastWarning);
					} else {
						irc.say(input.context, "There haven't been any warnings.");
					}
					break;
				default:
					irc.say(input.context, "[Help] Syntax: last "+this.command.options);
					break;
			}
		} else {
			irc.say(input.context, "[Help] Syntax: last "+this.command.options);
		}
	}
});
