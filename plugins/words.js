// word motherflipper!
listen({
	plugin: "words",
	handle: "word",
	regex: regexFactory.startsWith(["word", "words"]),
	command: {
		root: "word",
		help: "verb add, remove, get, count",
		syntax: "[Help] Syntax: "+config.command_prefix+
			"word verb add/remove/get/count/random - Example: "+config.command_prefix+
			"word verb add mitch mitches mitched mitching - word verb remove mitch"
	},
	callback: function (input, match) {
		var entry, reg, verb,
			args = match[1].split(" ");
		switch (args[0]) {
			case "verb":
				switch (args[1].toLowerCase()) {
					case "count":
						irc.say(input.context, "I know of "+words.verb.list.length+" verbs.");
						break;
					case "random":
						entry = words.verb.random();
						irc.say(input.context, entry.base+" - "+entry.s+" - "+entry.ed+" - "+entry.ing);
						break;
					case "get":
						entry = words.verb.get(args[2]);
						if (!entry) irc.say(input.context, "I don't know it.");
						else irc.say(input.context, entry.base+" - "+entry.s+" - "+entry.ed+" - "+entry.ing);
						break;
					case "remove":
						if (!permissions.isAdmin(input.user)) {
							irc.say(input.context, "Admins only.");
							return;
						}
						irc.say(input.context, words.verb.remove(args[2]));
						break;
					case "add":
						if (!permissions.isAdmin(input.user)) {
							irc.say(input.context, "Admins only.");
							return;
						}
						irc.say(input.context, words.verb.add(args.slice(2).join(" ")));
						break;
					case "correct":
						if (!permissions.isAdmin(input.user)) {
							irc.say(input.context, "Admins only.");
							return;
						}
						irc.say(input.context, words.verb.change(args.slice(2).join(" ")));
						break;
					default:
						irc.say(input.context, "I'm only doing verbs at the moment.");
						break;
				}
				break;
			default:
				irc.say(input.context, this.command.syntax);
				break;
		}
	}
});

