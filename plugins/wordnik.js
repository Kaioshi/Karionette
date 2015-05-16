cmdListen({
	command: "define",
	help: "Defines words or phrases using wordnik.",
	syntax: config.command_prefix+"define <word/phrase> - Example: "+config.command_prefix+"define butt",
	arglen: 1,
	callback: function (input) {
		var uri, i, l, definitions, example, query;
		if (!config.api.wordnik) {
			irc.say(input.context, "The wordnik plugin requires an API key to be present in config, \
				go to http://developer.wordnik.com to get one.");
			return;
		}
		query = input.data.trim();
		uri = "http://api.wordnik.com:80/v4/word.json/"+query+
			"/definitions?limit=3&includeRelated=true&sourceDictionaries=wordnet,wiktionary&useCanonical=false&includeTags=false&api_key="
			+config.api.wordnik;
		web.get(uri, function (error, response, body) {
			try {
				body = JSON.parse(body);
			} catch (e) {
				globals.lastFailedWordnik = body;
				logger.warn("Wordnik returned non-JSON");
				return;
			}
			if (body.length === 0) {
				irc.say(input.context, "Couldn't find it. "+lib.randSelect([
					"You only have yourself to blame.",
					"I'm sorry.",
					"Sorry ;<",
					"I'm not sorry.",
					"I'm not even sorry. >:D",
					";_;",
					"Blame "+(input.context[0] === "#" ? lib.randSelect(ial.Active(input.context))+"." : "yourself.")
				]));
				return;
			}
			for (definitions = " -", i = 0, l = body.length; i < l; i++)
				definitions += " "+(i+1)+") ["+body[i].partOfSpeech+"] "+body[i].text;
			uri = "http://api.wordnik.com:80/v4/word.json/"+query+"/topExample?useCanonical=false&api_key="+config.api.wordnik;
			web.get(uri, function (error, response, body) {
				try {
					body = JSON.parse(body);
				} catch (e) {
					globals.lastFailedWordnik = body;
					logger.warn("Wordnik returned non-JSON");
					return;
				}
				irc.say(input.context, lib.singleSpace(query+definitions), false);
				if (body.text && body.title)
					irc.say(input.context, lib.decode(lib.singleSpace(body.text+" - "+body.title)), false);
			});
		});
	}
});
