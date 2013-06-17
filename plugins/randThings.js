var randDB = new listDB("randomThings");
listen({
	handle: "randThing",
	regex: regexFactory.startsWith("randThing"),
	command: {
		root: "randthing",
		options: "add",
		help: "add to randThings"
	},
	callback: function (input) {
		var keys,
			args = input.match[1].split(" "),
			opt = args[0],
			txt = args.slice(1).join(" ");
		if (opt) {
			// What option is picked
			switch (opt) {
				case 'add':
					if (txt) {
						randDB.store(txt);
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