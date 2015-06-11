// Returns first Google search result
"use strict";

cmdListen({
	command: [ "g", "google" ],
	help: "Google search - returns the first hit.",
	syntax: config.command_prefix+"g <search term> - Example: "+config.command_prefix+"g puppies",
	arglen: 1,
	callback: function (input) {
		web.google(input.data.trim()).then(function (results) {
			if (config.google_format) {
				results[0].b = '\x02';
				irc.say(input.context, lib.formatOutput(config.google_format, results[0]), false, 1);
			} else {
				irc.say(input.context, lib.formatOutput("{title} ~ {url} ~ {content}", results[0]), false, 1);
			}
		}, function (error) {
			irc.say(input.context, error.message, false);
		}).catch(function (error) {
			logger.error("Error in ;google -> ", error);
		});
	}
});

cmdListen({ // for ranmabutts
	command: "gr",
	help: "Constructs a google query",
	syntax: config.command_prefix+"gr <search term> - Example: "+config.command_prefix+"gr puppies vs. kittens?",
	arglen: 1,
	callback: function (input) {
		irc.say(input.context, "https://google.com/search?q="+encodeURIComponent(input.data.trim()));
	}
});

cmdListen({ // this will stop working soon~
	command: "gi",
	help: "Google image search - returns the first hit.",
	syntax: config.command_prefix+"gi puppies",
	arglen: 1,
	callback: function (input) {
		web.fetch("http://ajax.googleapis.com/ajax/services/search/images?v=1.0&safe=moderate&rsz=1&q="+input.data)
		.then(function (body) {
			var data = JSON.parse(body);
			if (data && data.responseData && data.responseData.results && data.responseData.results[0]) {
				data = data.responseData.results[0];
				irc.say(input.context, lib.decode(data.titleNoFormatting)+
					" ("+data.width+"x"+data.height+"): "+data.url, false);
			} else {
				irc.say(input.context, "No image found. :<");
			}
		}, function (error) {
			irc.say(input.context, "Something has gone awry.");
			logger.error("[google-images] error looking up " + input.data + " -> " + error);
		});
	}
});
