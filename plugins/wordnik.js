"use strict";
cmdListen({
	command: "define",
	help: "Defines words or phrases using wordnik.",
	syntax: config.command_prefix+"define <word/phrase> - Example: "+config.command_prefix+"define butt",
	arglen: 1,
	callback: function (input) {
		var uri, i, definitions, query;
		if (!config.api.wordnik) {
			irc.say(input.context, "The wordnik plugin requires an API key to be present in config, go to "+
				"http://developer.wordnik.com to get one.");
			return;
		}
		query = input.data.trim();
		uri = "http://api.wordnik.com:80/v4/word.json/"+query+
			"/definitions?limit=3&includeRelated=true&sourceDictionaries=wordnet,wiktionary&useCanonical=false&includeTags=false&api_key="+
			config.api.wordnik;
		web.json(uri).then(function (resp) {
			if (resp.length === 0) {
				throw Error("Couldn't find it. "+lib.randSelect([
					"You only have yourself to blame.",
					"I'm sorry.",
					"Sorry ;<",
					"I'm not sorry.",
					"I'm not even sorry. >:D",
					";_;",
					"Blame "+(input.context[0] === "#" ? lib.randSelect(ial.Active(input.context))+"." : "yourself.")
				]));
			}
			for (definitions = " -", i = 0; i < resp.length; i++)
				definitions += " "+(i+1)+") ["+resp[i].partOfSpeech+"] "+resp[i].text;
			uri = "http://api.wordnik.com:80/v4/word.json/"+query+"/topExample?useCanonical=false&api_key="+config.api.wordnik;
			return web.json(uri);
		}).then(function (resp) {
			irc.say(input.context, lib.singleSpace(query+definitions), false);
			if (resp.text && resp.title)
				irc.say(input.context, lib.decode(lib.singleSpace(resp.text+" - "+resp.title)), false);
		}, function (error) {
			irc.say(input.context, error.message);
		});
	}
});
