// Urban dictionary look-up
listen({
	handle: "ud",
	regex: regexFactory.startsWith("ud"),
	command: {
		root: "ud",
		options: "No options",
		help: "Look up something from Urban dictionary!"
	},
	callback: function (input, match) {
		var result,
			uri = 'http://api.urbandictionary.com/v0/define?term=' + match[1];
		web.get(uri, function (error, response, body) {
			result = JSON.parse(body).list;
			if (result[0]) {
				irc.say(input.context, result[0].definition, false);
			} else {
				irc.say(input.context, "Pantsu.", false);
			}
		});
	}
});