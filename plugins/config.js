// config fondler

cmdListen({
	command: "saveconfig",
	admin: true,
	help: "Saves changes to the config file.",
	syntax: config.command_prefix+"saveconfig",
	callback: function (input) {
		irc.say(input.context, "Done - "+config.saveChanges()+" changes were made.");
	}
});
