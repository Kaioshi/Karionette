"use strict";
const [ial, lib, web] = plugin.importMany("ial", "lib", "web");

function notFound(context) {
	return lib.randSelect([
		"You only have yourself to blame.",
		"I'm sorry.",
		"Sorry ;<",
		"I'm not sorry.",
		"I'm not even sorry. >:D",
		";_;",
		"Blame "+(context[0] === "#" ? lib.randSelect(ial.Active(context))+"." : "yourself.")
	])
}

bot.command({
	command: "define",
	help: "Defines words or phrases using wordnik.",
	syntax: config.command_prefix+"define <word/phrase> - Example: "+config.command_prefix+"define butt",
	arglen: 1,
	callback: function define(input) {
		if (!config.api.wordnik) {
			irc.say(input.context, "The wordnik plugin requires an API key to be present in config, go to http://developer.wordnik.com to get one.");
			return;
		}
		lib.runCallback(function *main(cb) { try {
			const query = input.data.trim();
			let uri = `http://api.wordnik.com:80/v4/word.json/${query}/definitions?limit=3&includeRelated=true&sourceDictionaries=wordnet,wiktionary&useCanonical=false&includeTags=false&api_key=${config.api.wordnik}`,
				resp = JSON.parse(yield web.fetchAsync(uri, null, cb));
			if (!Array.isArray(resp)) {
				irc.say(input.context, "Invalid wordnik API key.");
				return;
			}
			if (!resp.length)
				throw Error("Couldn't find it. "+notFound(input.context));
			irc.say(input.context, resp.map((def, i) => `${i+1}) [${def.partOfSpeech}] ${def.text}`).join(", "));
			uri = `http://api.wordnik.com:80/v4/word.json/${query}/topExample?useCanonical=false&api_key=${config.api.wordnik}`;
			resp = JSON.parse(yield web.fetchAsync(uri, null, cb));
			if (resp.text && resp.title)
				irc.say(input.context, lib.decode(lib.singleSpace(`${resp.text} ${resp.title}`)));
		} catch (err) {
			irc.say(input.context, err.message);
		}});
	}
});
