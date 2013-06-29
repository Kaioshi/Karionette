var randDB = new DB.List({filename: "randomThings"});
listen({
	handle: "randThing",
	regex: regexFactory.startsWith("thing"),
	command: {
		root: "thing",
		options: "add",
		help: "add to randThings"
	},
	callback: function (input, match) {
		var keys,
			args = match[1].split(" "),
			opt = args[0],
			txt = args.slice(1).join(" ");

		if (opt) {
			// What option is picked
			switch (opt) {
			case 'add':
				if (txt) {
					randDB.saveOne(txt);
					irc.say(input.context, 'Added :)');
				} else {
					irc.say(input.context, '[Help] You should really give me something to add');
				}
				break;
			default:
				irc.say(input.context, '[Help] Options are: add');
				break;
			}
		} else {
			irc.say(input.context, '[Help] Options are: add');
		}
	}
});