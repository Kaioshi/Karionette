"use strict";
bot.command({
	command: [ "bing", "b" ],
	help: "Bing searches things.",
	syntax: config.command_prefix+"bing Oh god why am I using bing",
	arglen: 1,
	callback: function (input) {
		if (!config.api.bing) {
			irc.say(input.context, "You need a bing api key in the config. "+
				"Get one at https://datamarket.azure.com/dataset/bing/searchweb");
			return;
		}
		web.bing(input.data).then(function (results) {
			if (config.bing_format) {
				results[0].b = '\x02';
				irc.say(input.context, lib.formatOutput(config.bing_format, results[0]), false, 1);
			} else {
				irc.say(input.context, lib.formatOutput("{title} ~ {url} ~ {content}", results[0]), false, 1);
			}
		}, function (error) {
			irc.say(input.context, error.message);
		});
	}
});
