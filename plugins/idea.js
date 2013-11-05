// Idea from 'this for that'
cmdListen({
	command: "idea",
	help: "Random idea for you to ponder!",
	callback: function (input) {
		var result,
			uri = "http://itsthisforthat.com/api.php?json";
		web.get(uri, function (error, response, body) {
			result = JSON.parse(body);
			irc.say(input.context, result["this"] + " for " + result.that, false);
		});
	}
});
