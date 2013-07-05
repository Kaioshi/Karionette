// across the universe
var varsDB = new DB.Json({ filename: "alias/vars" });

listen({
	plugin: "regexen",
	handle: "regexen",
	regex: regexFactory.startsWith("regexen"),
	command: {
		root: "regexen",
		help: "[Help] Syntax: regexen <variable> <regex to run on it>"
	},
	callback: function (input, match) {
		var args = match[1].split(" ");
		if (args && args[1]) {
			var entry = varsDB.getOne("{"+args[0]+"}");
			if (entry) {
				var regex = new RegExp(args.slice(1).join(" ")),
					entries = entry.split("|");
				entries.forEach(function (item) {
					irc.say(input.context, regex.exec(item).join(" "));
				});
			} else irc.say(input.context, "No such variable.");
		} else {
			irc.say(input.context, this.command.help);
		}
	}
});

