// Urban dictionary look-up
cmdListen({
	command: "ud",
	help: "Look up something from Urban dictionary!",
	syntax: config.command_prefix+"ud <term> - Example: "+config.command_prefix+
		"ud scrobble",
	callback: function (input) {
		var result, uri, resp, i, tmp;
		if (!input.args) {
			irc.say(input.context, cmdHelp("ud", "syntax"));
			return;
		}
		uri = 'http://api.urbandictionary.com/v0/define?term=' + input.data;
		web.get(uri, function (error, response, body) {
			result = JSON.parse(body);
			if (result.result_type === "no_results" || result.list.length === 0) {
				irc.say(input.context, "Pantsu.");
			} else {
				tmp = "1) "+result.list[0].definition.replace(/\n|\r/g, " ").trim();
				if (result.list.length > 1) {
					for (i = 1; i < result.list.length; i++) {
						if (tmp.length <= 300 && result.list[i].definition.trim().length <= (300-tmp.length)) {
							tmp += " "+(i+1)+") "+result.list[i].definition.replace(/\n|\r/g, " ").trim();
						} else {
							break;
						}
					}
				}
				// remove double spaces
				resp = [];
				tmp.split(" ").forEach(function (item) {
					if (item.length > 0) resp.push(item);
				});
				irc.say(input.context, resp.join(" "), false);
			}
		});
	}
});

