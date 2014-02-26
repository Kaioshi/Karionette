cmdListen({
	command: "define",
	help: "Defines words or phrases using wordnik.",
	syntax: config.command_prefix+"define <word/phrase> - Example: "+config.command_prefix+"define butt",
	callback: function (input) {
		var uri, i, definitions;
		if (!input.args) {
			irc.say(input.context, cmdHelp("define", "syntax"));
			return;
		}
		if (!config.api.wordnik) {
			irc.say(input.context, "The wordnik plugin requires an API key to be present in config.js, go to http://developer.wordnik.com to get one.");
			return;
		}
		uri = "http://api.wordnik.com:80/v4/word.json/"+input.data.trim()+"/definitions?limit=3&includeRelated=true&useCanonical=true&includeTags=false&api_key="+config.api.wordnik;
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body);
			globals.lastBody = body;
			if (body.length === 0) {
				irc.say(input.context, "Couldn't find it. "+lib.randSelect([
					"You only have yourself to blame.",
					"I'm sorry.",
					"Sorry ;<",
					"I'm not sorry.",
					"I'm not even sorry. >:D",
					";_;",
					"Blame "+lib.randSelect(ial.Active(input.context))+"."
				]));
				return;
			}
			for (definitions = " ~", i = 0; i < body.length; i++) {
				definitions += " "+(i+1)+") ["+body[i].partOfSpeech+"] "+body[i].text;
			}
			irc.say(input.context, body[0].word+definitions, false);
		});
	}
});
