// Get Mari's age

listen({
	handle: "age",
	regex: regexFactory.startsWith("age"),
	command: {
		root: "age",
		help: "Tells you how old Mari is!"
	},
	callback: function (input) {
		irc.say(input.context, "I am " 
			+ lib.duration(new Date("1 May 2013 18:40:00 GMT")) 
			+ " old, but always sweet as sugar.");
	}
});

// get uptime

listen({
	handle: "uptime",
	regex: regexFactory.startsWith("uptime"),
	command: {
		root: "uptime",
		help: "Shows uptime since the bot was started."
	},
	callback: function (input) {
		irc.say(input.context, "I've been running for " + lib.duration(globals.startTime) + ".");
	}
});

