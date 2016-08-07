"use strict";
const [DB, lib] = plugin.importMany("DB", "lib"),
	randDB = new DB.List({filename: "randomThings"});

bot.command({
	command: "random",
	help: "Picks a random element from your comma separated list.",
	syntax: config.command_prefix+"random list, of, things, to select, from",
	arglen: 1,
	callback: function (input) {
		if (input.data.indexOf(",") === -1)
			irc.say(input.context, bot.cmdHelp("random", "syntax"));
		else
			irc.say(input.context, lib.randSelect(input.data.split(",")).trim());
	}
});

bot.command({
	command: "thing",
	help: "add to randThings",
	syntax: config.command_prefix+"thing <add/remove> <thing> - Example: "+config.command_prefix+
		"thing add ranma's dodgy undies",
	arglen: 2,
	callback: function (input) {
		let entry;
		switch (input.args[0].toLowerCase()) {
		case "add":
			randDB.saveOne(input.args.slice(1).join(" "));
			irc.say(input.context, "Added :)");
			break;
		case "remove":
			entry = randDB.getOne(input.args.slice(1).join(" "));
			if (entry) {
				randDB.removeOne(entry);
				irc.say(input.context, "Removed :S");
			} else {
				irc.say(input.context, "I know of no such thing.");
			}
			break;
		default:
			irc.say(input.context, bot.cmdHelp("thing", "syntax"));
			break;
		}
	}
});
