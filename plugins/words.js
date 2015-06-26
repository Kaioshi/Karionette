// word motherflipper!
"use strict";
function tokenizeLine(line) {
	var ret = [], hit = false,
		type = [
			"noun", "verb", "adjective", "adverb", "preposition",
			"pronoun", "possessivePronoun", "personalPronoun"
		];
	line = line.toLowerCase().split(" ");
	line.forEach(function (word) {
		type.forEach(function (type) {
			if (words[type].get(word, true)) {
				ret.push("{"+type+"}");
				hit = true;
			}
			if (!hit && word.slice(-1) === "s") {
				if (words[type].get(word.slice(0,-1), true)) {
					ret.push("{"+type+"}");
					hit = true;
				}
			}
		});
		if (!hit) ret.push(word);
		hit = false;
	});
	return ret.join(" ");
}

bot.command({
	command: "word",
	help: "Word list management",
	syntax: config.command_prefix+"word verb/adverb/noun/adjective/pronoun add/remove/get/count/random/correct(verbs only) "+
		"[word] - Example: "+config.command_prefix+"word noun add apple - "+config.command_prefix+"word adjective remove overconfident - "+
		config.command_prefix+"word verb correct fondle fondles fondled fondling",
	arglen: 1,
	callback: function (input) {
		var entry;
		if (input.args[0] === "personalpronoun") input.args[0] = "personalPronoun";     // ugliest hack
		if (input.args[0] === "possessivepronoun") input.args[0] = "possessivePronoun"; // ever.
		if (input.args[0].match(/^adjective$|^adverb$|^pronoun$|^possessivePronoun$|^personalPronoun$/)) {
			if (!input.args[1]) {
				irc.say(input.context, bot.cmdHelp("word", "syntax"));
				return;
			}
			switch (input.args[1]) {
			case "random":
				irc.say(input.context, words[input.args[0]].random());
				break;
			case "count":
				irc.say(input.context, "I know of "+words[input.args[0]].list.length+" "+input.args[0]+"s.");
				break;
			case "get":
				irc.say(input.context, words[input.args[0]].get(input.args[2]));
				break;
			case "add":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only sucka.");
					return;
				}
				irc.say(input.context, words[input.args[0]].add(input.args[2]));
				break;
			case "remove":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only sucka!");
					return;
				}
				irc.say(input.context, words[input.args[0]].remove(input.args[2]));
				break;
			default:
				break; // never happens
			}
			return;
		}
		switch (input.args[0]) {
		case "analyze":
			irc.say(input.context, tokenizeLine(input.args.slice(1).join(" ")));
			break;
		case "noun":
			switch (input.args[1]) {
			case "count":
				irc.say(input.context, "I know of " + words.noun.list.length + " nouns.");
				break;
			case "random":
				entry = words.noun.random();
				irc.say(input.context, entry.base + " - " + entry.s);
				break;
			case "get":
				entry = words.noun.get(input.args[2]);
				if (!entry)
					irc.say(input.context, "I don't know it.");
				else
					irc.say(input.context, entry.base + " - " + entry.s);
				break;
			case "remove":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only.");
					break;
				}
				irc.say(input.context, words.noun.remove(input.args[2]));
				break;
			case "add":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only.");
					break;
				}
				entry = input.args.slice(2);
				if (entry.length !== 2) {
					irc.say(input.context, "[Help] "+config.command_prefix+"word noun add <noun> <plural> - Example: "+
						config.command_prefix+"word noun add banana bananas");
					break;
				}
				irc.say(input.context, words.noun.add(entry.join(" ")));
				break;
			default:
				irc.say(input.context, bot.cmdHelp("word", "syntax"));
				break;
			}
			break;
		case "verb":
			switch (input.args[1]) {
			case "count":
				irc.say(input.context, "I know of "+words.verb.list.length+" verbs.");
				break;
			case "random":
				entry = words.verb.random();
				irc.say(input.context, entry.base+" - "+entry.s+" - "+entry.ed+" - "+entry.ing);
				break;
			case "get":
				entry = words.verb.get(input.args[2]);
				if (!entry) irc.say(input.context, "I don't know it.");
				else irc.say(input.context, entry.base+" - "+entry.s+" - "+entry.ed+" - "+entry.ing);
				break;
			case "remove":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only.");
					return;
				}
				irc.say(input.context, words.verb.remove(input.args[2]));
				break;
			case "add":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only.");
					return;
				}
				irc.say(input.context, words.verb.add(input.args.slice(2).join(" ")));
				break;
			case "correct":
				if (!userLogin.isAdmin(input.user)) {
					irc.say(input.context, "Admins only.");
					return;
				}
				irc.say(input.context, words.verb.change(input.args.slice(2).join(" ")));
				break;
			default:
				irc.say(input.context, bot.cmdHelp("word", "syntax"));
				break;
			}
			break;
		default:
			irc.say(input.context, bot.cmdHelp("word", "syntax"));
			break;
		}
	}
});
