"use strict";
cmdListen({
	command: [ "bing", "b" ],
	help: "Bing searches things.",
	syntax: config.command_prefix+"bing Oh god why am I using bing",
	arglen: 1,
	callback: function (input) {
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
