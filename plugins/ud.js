// Urban dictionary look-up
cmdListen({
	command: "ud",
	help: "Look up something from Urban dictionary!",
	syntax: config.command_prefix+"ud <term> - Example: "+config.command_prefix+
		"ud scrobble",
	callback: function (input) {
		var result,
			uri = 'http://api.urbandictionary.com/v0/define?term=' + input.data;
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

