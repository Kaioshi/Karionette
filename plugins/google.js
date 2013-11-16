// Returns first Google search result
"use strict";
var ent = require("./lib/entities.js");

cmdListen({
	command: [ "g", "google" ],
	help: "Google search - returns the first hit.",
	callback: function (input) {
		var result,
			uri = 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=1&q=' + input.data;
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

cmdListen({
	command: "define",
	help: "Google search's define: keyword.",
	syntax: config.command_prefix+"define <word> - this uses google's define: \
		keyword you're probably familiar with - and so it is just as limited as that.",
	callback: function (input) {
		var definition, uri, meaning, related, type;
		
		if (!input.args) {
			irc.say(input.context, cmdHelp("define", "syntax"));
			return;
		}
		uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q=" + input.args[0].replace(/\"/g, "");
		web.get(uri, function (error, response, body) {
			if (error) {
				irc.say(input.context, "Something has gone awry.");
				logger.error("[google-define] error looking up " + input.args[0] + " -> " + error);
				return;
			}
			body = JSON.parse(ent.decode(lib.stripHtml(body.slice(2, -10)
				.replace(/\\x3c/g, "<").replace(/\\x3e/g, ">").replace(/\\x26quot;/g, "")
				.replace(/\\x27/g, "'").replace(/\\x26amp;/g, "&"))));
			if (!body.primaries) {
				irc.say(input.context, "I couldn't find "+body.query+". :<");
				return;
			}
			related = [];
			meaning = [];
			if (body.primaries[0].terms[0].labels) {
				type = body.primaries[0].terms[0].labels[0].text.toLowerCase();
				if (type.match(/^adverb$|^noun$|^adjective$/)) {
					if (!words[type].get(input.args[0], true)) {
						words[type].add(input.args[0]);
					}
				}
				type = " ("+type+")";
			} else {
				type = "";
			}
			body.primaries[0].entries.forEach(function (entry) {
				if (entry.type === 'related') {
					entry.terms.forEach(function (item) {
						if (item.text !== input.args[0]) {
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
			body = body.primaries[0];
			definition = meaning.join("; ");
			if (related.length > 0) definition = "["+related.join(", ")+"] - "+definition;
			if (body.terms) {
				if (related.length > 0)	definition = input.args[0]+" - \""+body.terms[0].text+"\""+type+": "+definition;
				else definition = input.args[0]+" - \""+body.terms[0].text+"\""+type+": "+definition;
			} else definition = input.args[0]+type+": "+definition;
			irc.say(input.context, definition, false, 2);
		});
	}
});

