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
	handle: "currency",
	regex: regexFactory.startsWith("currency"),
	command: {
		root: "currency",
		options: "1 <currency> to <currency>",
		help: "Google's currency conversion",
		syntax: "[Help] Syntax: "+config.command_prefix+"currency N <currency> to <currency> - Example: "
			+config.command_prefix+"currency 1 USD to AUD - Currency codes: http://en.wikipedia.org/wiki/ISO_4217#Active_codes"
	},
	callback: function (input, match) {
		var uri, reg = /^([0-9\.?]+) ([A-Za-z]+) to ([A-Za-z]+)$/.exec(match[1]);
		if (reg) {
			uri = "http://www.google.com/ig/calculator?hl=en&q="+reg[1]+reg[2]+"=?"+reg[3];
			web.get(uri, function (error, response, body) {
				reg = /^\{lhs: \"(.*)\",rhs: \"(.*)\",error: \"(.*)\",icc: (.*)\}$/.exec(body);
				if (!reg || reg[3]) {
					irc.say(input.context, "YOU'RE DOIN' IT WRONG! >:(");
					setTimeout(function () {
						irc.action(input.context, "needs real currencies.");
					}, 1700);
				} else {
					irc.say(input.context, reg[1]+" = "+reg[2]);
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
		var definition, uri, meaning, related;
		if (match[1]) {
			uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q=" + match[1];
			web.get(uri, function (error, response, body) {
				if (error) {
					irc.say(input.context, "Something has gone awry.");
					logger.error("[google-define] error looking up " + match[1] + " -> " + error);
					return;
				}
				body = JSON.parse(body.slice(2, -10).replace(/\\\x[0-9a-f]{2}/g, ""));
				if (!body.primaries) {
					irc.say(input.context, "I couldn't find "+body.query+". :<");
					return;
				}
				related = [];
				meaning = [];
				body = body.primaries[0];
				body.entries.forEach(function (entry) {
					if (entry.type === 'related') {
						entry.terms.forEach(function (item) {
							if (item.text !== match[1]) {
								// make sure there are no duplicate entries -.- wtf google
								if (!related.some(function (element) { return (element === item.text); })) {
									related.push(item.text);
								}
							}
						});
					}
					else if (entry.type === 'meaning') {
						entry.terms.forEach(function (item) {
							meaning.push(item.text);
						});
					}
				});
				definition = meaning.join("; ");
				if (related.length > 0) definition = "["+related.join(", ")+"] - "+definition;
				if (body.terms) {
					if (related.length > 0)	definition = match[1]+" - \""+body.terms[0].text+"\" "+definition;
					else definition = match[1]+" - \""+body.terms[0].text+"\" - "+definition;
				} else definition = match[1]+" - "+definition;
				irc.say(input.context, definition, false);
			});
		} else {
			irc.say(input.context, this.command.syntax);
		}
	}
});

