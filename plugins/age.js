// Get Mari's age

listen({
	plugin: "age",
	handle: "age",
	regex: regexFactory.startsWith("age"),
	command: {
		root: "age",
		help: "Tells you how old Mari is!"
	},
	callback: function (input) {
		irc.say(input.context, "I am " 
			+ lib.duration(new Date("1 May 2013 18:40:00 GMT"))	+ " old, but always sweet as sugar.");
	}
});

