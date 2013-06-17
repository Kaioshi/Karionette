// Handles Help
listen({
	handle: "help",
	regex: regexFactory.startsWith("help"),
	command: {
		root: "help",
		options: "{command you're interested in}",
		help: "Seriously?"
	},
	callback: function (input) {
		var i,
			args = input.match[1].split(" "),
			cmdArr = irc.help(),
			cmdList = "",
			notFound = true;
		if (args[0]) {
cmdChek:	for (i = 0; i < cmdArr.length; i += 1) {
				if (cmdArr[i].root === args[0]) {
					if (cmdArr[i].options) { irc.say(input.context, "Options: " + cmdArr[i].options); }
					if (cmdArr[i].help) { irc.say(input.context, cmdArr[i].help); }
					notFound = false;
					break cmdChek;
				}
			}
			if (notFound) { irc.say(input.context, "[Help] Didn't find that command. Check the list again."); }
		} else {
			cmdList = cmdArr.map(function (element) {
				return element.root;
			}).join(", ");
			irc.say(input.context, "Commands: " + cmdList);
		}
	}
});