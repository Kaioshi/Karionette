// Urban dictionary look-up
cmdListen({
	command: "ud",
	help: "Look up something from Urban dictionary!",
	syntax: config.command_prefix+"ud <term> - Example: "+config.command_prefix+
		"ud scrobble",
	callback: function (input) {
		var result, i, tmp, def;
		if (!input.args) {
			irc.say(input.context, cmdHelp("ud", "syntax"));
			return;
		}
		web.get("http://api.urbandictionary.com/v0/define?term="+input.data, function (error, response, body) {
			result = JSON.parse(body);
			if (result.result_type === "no_results" || result.list.length === 0) {
				irc.say(input.context, "Pantsu.");
			} else {
				tmp = "1) "+lib.singleSpace(result.list[0].definition.replace(/\n|\r|\t/g, " "));
				if (result.list.length > 1) {
					for (i = 1; i < result.list.length; i++) {
						if (tmp.length >= 300) break;
						def = lib.singleSpace(result.list[i].definition.replace(/\n|\r|\t/g, " "));
						if (def.length <= (300-tmp.length)) {
							tmp += " "+(i+1)+") "+def;
						}
					}
				}
				irc.say(input.context, tmp, false);
			}
		});
	}
});

