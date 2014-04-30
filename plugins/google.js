// Returns first Google search result
"use strict";
var ent = require("./lib/entities.js");

cmdListen({
	command: [ "g", "google" ],
	help: "Google search - returns the first hit.",
	syntax: config.command_prefix+"g <search term> - Example: "+config.command_prefix+"g puppies",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("g", "syntax"));
			return;
		}
		web.google(input.data.trim(), function (error, hits, results) {
			if (hits > 0) {
				irc.say(input.context, results[0].title+" ~ "+results[0].url+" ~ "+results[0].content, false, 1);
			} else {
				irc.say(input.context, "Couldn't find it. :<");
			}
		});
	}
});

cmdListen({
	command: "gi",
	help: "Google image search - returns the first hit.",
	syntax: config.command_prefix+"gi puppies",
	callback: function (input) {
		var uri;
		if (input.args) {
			uri = "http://ajax.googleapis.com/ajax/services/search/images?v=1.0&safe=moderate&rsz=1&q="+input.data;
			web.get(uri, function (error, response, body) {
				if (error) {
					irc.say(input.context, "Something has gone awry.");
					logger.error("[google-images] error looking up " + input.data + " -> " + error);
					return;
				}
				body = JSON.parse(body);
				if (body && body.responseData && body.responseData.results && body.responseData.results[0]) {
					body = body.responseData.results;
					irc.say(input.context, ent.decode(body[0].titleNoFormatting) + " (" + body[0].width + "x" + body[0].height + "): " + body[0].url);
				} else {
					irc.say(input.context, "No image found. :<");
				}
			});
		} else {
			irc.say(input.context, cmdHelp("gi", "syntax"));
		}
	}
});

