// Idea from 'this for that'
"use strict";
cmdListen({
	command: "idea",
	help: "Random idea for you to ponder!",
	callback: function (input) {
		web.json("http://itsthisforthat.com/api.php?json").then(function (result) {
			irc.say(input.context, result["this"] + " for " + result.that, false);
		});
	}
});
