// Returns first Google search result
var ent = require("./lib/entities.js");

listen({
	plugin: "google",
	handle: "google",
	regex: regexFactory.startsWith(["google", "g"]),
	command: {
		root: "google",
		options: "{String to search}",
		help: "Google search. Gets the first result."
	},
	callback: function (input, match) {
		var result,
			uri = 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=1&q=' + match[1];
		web.get(uri, function (error, response, body) {
			result = JSON.parse(body).responseData.results[0];
			if (result && result.titleNoFormatting) {
				irc.say(input.context, ent.decode(result.titleNoFormatting) + ' ~ ' + result.unescapedUrl, false);
			} else {
				irc.action(input.context, "can't find it. :<");
			}
		});
	}
});

listen({
	plugin: "google",
	handle: "gi",
	regex: regexFactory.startsWith("gi"),
	command: {
		root: "gi",
		options: "{What to search for}",
		help: "Google's image search",
		syntax: "[Help] Syntax: " + config.command_prefix + "gi pantsu"
	},
	callback: function (input, match) {
		var uri;
		if (match[1]) {
			uri = "http://ajax.googleapis.com/ajax/services/search/images?v=1.0&safe=moderate&rsz=1&q="+match[1];
			web.get(uri, function (error, response, body) {
				if (error) {
					irc.say(input.context, "Something has gone awry.");
					logger.error("[google-images] error looking up " + match[1] + " -> " + error);
					return;
				}
				body = JSON.parse(body).responseData.results;
				if (body && body[0]) {
					irc.say(input.context, ent.decode(body[0].titleNoFormatting) + " (" + body[0].width + "x" + body[0].height + "): " + body[0].url);
				} else {
					irc.say(input.context, "No image found. :<");
				}
			});
		} else {
			irc.say(input.context, this.command.syntax);
		}
	}
});

listen({
	plugin: "google",
	handle: "define",
	regex: regexFactory.startsWith(["define", "dict"]),
	command: {
		root: "define",
		options: "{Word to define}",
		help: "Google search's define: keyword.",
		syntax: "[Help] Syntax: " + config.command_prefix + "define <word>"
	},
	callback: function (input, match) {
		var definition, uri;
		if (match[1]) {
			uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q=" + match[1];
			web.get(uri, function (error, response, body) {
				if (error) {
					irc.say(input.context, "Something has gone awry.");
					logger.error("[google-define] error looking up " + match[1] + " -> " + error);
					return;
				}
				body = JSON.parse(/^a\((\{.*\})[^ ]+\)/.exec(body)[1].replace(/\\\x[0-9a-f]{2}/g, ""));
				if (!body.primaries) {
					irc.say(input.context, "No result. :<");
					return;
				}
				body = body.primaries[0];
				if (body.entries) {
					if (body.entries[1]) definition = body.entries[1].terms[0].text;
					else definition = body.entries[0].terms[0].text;
				}
				if (body.terms) irc.say(input.context, match[1] + " - \""+body.terms[0].text+"\" - " + definition, false);
				else irc.say(input.context, match[1] + " - "+definition);
			});
		} else {
			irc.say(input.context, this.command.syntax);
		}
	}
});

