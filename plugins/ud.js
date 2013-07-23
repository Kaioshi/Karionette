// Urban dictionary look-up
listen({
	plugin: "ud",
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
			result = JSON.parse(body);
			if (result.result_type === "no_results" || result.list.length === 0) {
				irc.say(input.context, "Pantsu.");
			} else {
				result.list[0].definition = result.list[0].definition
					.replace(/\n/g, ' ')
					.replace(/\r/g, ' ');
				irc.say(input.context, result.list[0].definition, false);
			}
		});
	}
});

