"use strict";
const [web, lib] = plugin.importMany("web", "lib");

bot.command({
	command: [ "bing", "b" ],
	help: "Bing searches things.",
	syntax: config.command_prefix+"bing Oh god why am I using bing",
	arglen: 1,
	callback: function bing(input) {
		if (!config.api.bing) {
			irc.say(input.context, "You need a bing api key in the config. "+
				"Get one at https://datamarket.azure.com/dataset/bing/searchweb");
			return;
		}
		lib.runCallback(function *main(cb) { try {
			const results = yield web.bingAsync(input.data, 1, cb);
			if (results.notFound) {
				irc.say(input.context, web.notFound());
				return;
			}
			if (config.bing_format) {
				results.items[0].b = "\x02";
				irc.say(input.context, lib.formatOutput(config.bing_format, results.items[0]), false, 1);
			} else {
				irc.say(input.context, `${results.items[0].title} ~ ${results.items[0].url} ~ ${results.items[0].content}`, false, 1);
			}
		} catch (err) {
			logger.error(`;bing - ${err.message}`, err);
		}});
	}
});
