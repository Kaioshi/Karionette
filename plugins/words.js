// word motherflipper!

function tokenizeLine(line) {
	var i,
		ret = [], hit = false,
		type = [ "noun", "verb", "adjective", "adverb", "preposition", "pronoun", "personalPronoun" ];
	line = line.toLowerCase().split(" ");
	line.forEach(function (word) {
		type.forEach(function (type) {
			if (words[type].get(word, true)) {
				ret.push("{"+type+"}");
				hit = true;
			}
		});
		if (!hit) ret.push(word);
		hit = false;
	});
	return ret.join(" ");
}

listen({
	plugin: "words",
	handle: "word",
	regex: regexFactory.startsWith(["word", "words"]),
	command: {
		root: "word",
		help: "verb add, remove, get, count",
		syntax: "[Help] Syntax: "+config.command_prefix+
			"word verb/adverb/noun/adjective add/remove/get/count/random [word] - Example: "+config.command_prefix+
			"word noun add apple - "+config.command_prefix+
			"word adjective remove overconfident"
	},
	callback: function (input, match) {
		var entry, reg, verb,
			args = match[1].toLowerCase().split(" ");
		if (args[0].match(/^adjective$|^adverb$|^noun$/)) {
			switch (args[1]) {
				case "random":
					irc.say(input.context, words[args[0]].random());
					break;
				case "count":
					irc.say(input.context, "I know of "+words[args[0]].list.length+" "+args[0]+"s.");
					break;
				case "get":
					irc.say(input.context, words[args[0]].get(args[2]));
					break;
				case "add":
					if (!permissions.isAdmin(input.user)) {
						irc.say(input.context, "Admins only sucka.");
						return;
					}
					irc.say(input.context, words[args[0]].add(args[2]));
					break;
				case "remove":
					if (!permissions.isAdmin(input.user)) {
						irc.say(input.context, "Admins only sucka!");
						return;
					}
					irc.say(input.context, words[args[0]].remove(args[2]));
					break;
				default:
					break; // never happens
			}
			return;
		}
		switch (args[0]) {
			case "analyze":
				irc.say(input.context, tokenizeLine(args.slice(1).join(" ")));
				break;
			case "verb":
				switch (args[1]) {
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
						irc.say(input.context, this.command.syntax);
						break;
				}
				break;
			default:
				irc.say(input.context, this.command.syntax);
				break;
		}
	}
});

