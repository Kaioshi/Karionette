/* global web, irc, bot, logger, lib, config */
// Returns first Google search result
"use strict";

bot.command({
	command: [ "g", "google" ],
	help: "Google search - returns the first hit.",
	syntax: `${config.command_prefix}g <search term> - Example: ${config.command_prefix}g puppies`,
	arglen: 1,
	callback: function googleSearch(input) {
		web.google(input.data.trim()).then(function (results) {
			if (config.google_format) {
				results[0].b = "\x02";
				irc.say(input.context, lib.formatOutput(config.google_format, results[0]), 1);
			} else {
				irc.say(input.context, lib.formatOutput("{title} ~ {url} ~ {content}", results[0]), 1);
			}
		}, function (error) {
			irc.say(input.context, error.message);
		}).catch(function (error) {
			logger.error("Error in ;google -> ", error);
		});
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
            let url = results[0].url,
                questionIndex = url.lastIndexOf("?");
            if (url.lastIndexof(".") < questionIndex) {
                results[0].url = url.substring(0, questionIndex);
            }
			irc.say(input.context, lib.formatOutput("{title} ~ {url}", results[0]), 1);
		}, function (error) {
			irc.say(input.context, error.message);
		}).catch(function (error) {
			logger.error("Error in ;google -> ", error);
		});
	}
});
