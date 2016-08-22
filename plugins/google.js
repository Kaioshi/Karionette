"use strict";

const [web, lib] = plugin.importMany("web", "lib");

bot.command({
	command: [ "g", "google" ],
	help: "Google search - returns the first hit.",
	syntax: `${config.command_prefix}g <search term> - Example: ${config.command_prefix}g puppies`,
	arglen: 1,
	callback: function googleSearch(input) {
		lib.runCallback(function *main(cb) { try {
			const results = yield web.googleAsync(input.data.trim(), 1, cb);
			if (results.notFound) {
				irc.say(input.context, web.notFound());
				return;
			}
			irc.say(input.context, `${results.items[0].title} ~ ${results.items[0].url} ~ ${results.items[0].content}`, false, 1);
		} catch (err) {
			logger.error(";g - "+err.message, err);
		}});
	}
});


bot.command({// for ranmabutts
	command: "gr",
	help: "Constructs a google query",
	syntax: `${config.command_prefix}gr <search term> - Example: ${config.command_prefix}gr puppies vs. kittens?`,
	arglen: 1,
	callback: function googleSearchForRanma(input) {
		irc.say(input.context, `https://google.com/search?q=${encodeURIComponent(input.data.trim())}`);
	}
});

bot.command({
	command: "gi",
	help: "Google image search - returns the first hit.",
	syntax: `${config.command_prefix}gi puppies`,
	arglen: 1,
	callback: function googleImageSearch(input) {
		web.googleImage(input.data.trim()).then(function (results) {
			if (results.notFound) {
				irc.say(input.context, web.notFound());
				return;
			}
			let url = results.items[0].url,
				questionIndex = url.lastIndexOf("?");
			if (url.lastIndexOf(".") < questionIndex)
				results.items[0].url = url.substring(0, questionIndex);
			irc.say(input.context, `${results.items[0].title} ~ ${results.items[0].url}`, false, 1);
		}).catch(function (err) {
			logger.error(";gi - "+err.message, err);
		});
	}
});
