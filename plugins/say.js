// When someone says something that starts with "say", she repeats what was to be said. Eg:
//  <MrDoe> say it again bitch
//  <Mari> it again bitch

listen({
	handle: 'say',
	regex: regexFactory.startsWith("say", "optional"),
	command: {
		root: "say",
		options: "[What you want me to say]",
		help: "Makes me say something. Duh!"
	},
	callback: function(input) {
		irc.say(input.context, input.match[1]);
	}
});

listen({
	handle: 'sayuni',
	regex: regexFactory.startsWith("sayuni", "optional"),
	callback: function(input) {
		irc.say(input.context, input.match[1], false);
	}
});

listen({
	handle: 'action',
	regex: regexFactory.startsWith("action"),
	command: {
		root: "action",
		options: "[What you want me to do]",
		help: "Makes me do something. Duh!"
	},
	callback: function(input) {
		irc.action(input.context, input.match[1]);
	}
});
