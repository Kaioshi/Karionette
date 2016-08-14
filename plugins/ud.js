// Urban dictionary look-up
"use strict";

const [web, lib] = plugin.importMany("web", "lib");

bot.command({
	command: "ud",
	help: "Looks up things on Urban Dictionary! Often NSFW.",
	syntax: config.command_prefix+"ud <term> - Example: "+config.command_prefix+"ud the big lebowski",
	arglen: 1,
	callback: function ud(input) {
		lib.runCallback(function *main(cb) { try {
			const json = JSON.parse(yield web.fetchAsync("http://api.urbandictionary.com/v0/define?term="+input.data, null, cb));
			const results = json.list.filter(entry => entry.thumbs_down > entry.thumbs_up || entry.thumbs_down > (entry.thumbs_up/2))
				.sort((a, b) => { if (a.thumbs_up > b.thumbs_up) return 1; if (a.thumbs_up < b.thumbs_up) return -1; return 0; })
				.map(entry => lib.singleSpace(entry.definition.replace(/\r|\n/g, " "))).join(" -- ") || "Pantsu.";
			irc.say(input.context, results, true, 2);
		} catch (error) {
			logger.error("ud - "+error.message, error);
		}});
	}
});
