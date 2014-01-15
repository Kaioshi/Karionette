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
	command: "fight",
	help: "Google search fight!",
	syntax: config.command_prefix+"fight search term 1 vs. search term 2 - Example: "
		+config.command_prefix+"fight ranma is a girl vs. ranma is a boy - Note: quotes are automatically added around your term, in the search query.",
	callback: function (input) {
		var reg, uri, results;
		if (!input.args) {
			irc.say(input.context, cmdHelp("fight", "syntax"));
			return;
		}
		reg = /(.*) vs\.? (.*)/i.exec(input.data.trim());
		if (!reg) {
			irc.say(input.context, "You're doin' it wrong!");
			irc.say(input.context, cmdHelp("fight", "syntax"));
			return;
		}
		uri = "http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=1&q=";
		web.get(uri+"\""+reg[1]+"\"", function (error, response, body) {
			globals.lastBody = [ body ];
			results = [ JSON.parse(body).responseData.cursor.estimatedResultCount ];
			web.get(uri+"\""+reg[2]+"\"", function (error, response, body) {
				globals.lastBody.push(body);
				results.push(JSON.parse(body).responseData.cursor.estimatedResultCount);
				if (results.length === 2) {
					if (results[0] === undefined) results[0] = 0;
					if (results[1] === undefined) results[1] = 0;
					if (parseInt(results[0], 10) > parseInt(results[1], 10)) {
						results[0] = "\x02"+lib.commaNum(results[0])+"\x02";
						results[1] = lib.commaNum(results[1]);
					} else {
						results[1] = "\x02"+lib.commaNum(results[1])+"\x02";
						results[0] = lib.commaNum(results[0]);
					}
					irc.say(input.context, "\""+reg[1]+"\": "+results[0]+" -- \""+reg[2]+"\": "+results[1], false);
				}
			});
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
		var definition, uri, meaning, related, type,
			addword = true;
		
		if (!input.args) {
			irc.say(input.context, cmdHelp("define", "syntax"));
			return;
		}
		if (input.data[1]) addword = false; // don't add if it has more than one word
		uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q=" + input.data.replace(/\"/g, "");
		web.get(uri, function (error, response, body) {
			if (error) {
				irc.say(input.context, "Something has gone awry.");
				logger.error("[google-define] error looking up " + input.data + " -> " + error);
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
					if (addword) {
						if (type.match(/^adverb$|^noun$|^adjective$/)) {
							if (!words[type].get(input.args[0], true)) {
								words[type].add(input.args[0]);
							}
						}
					}
					type = " ("+type+")";
				} else {
					type = "";
				}
			body.primaries[0].entries.forEach(function (entry) {
				if (entry.type === 'related') {
					entry.terms.forEach(function (item) {
						if (item.text !== input.data) {
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
				if (related.length > 0)	definition = input.data+" - \""+body.terms[0].text+"\""+type+": "+definition;
				else definition = input.data+" - \""+body.terms[0].text+"\""+type+": "+definition;
			} else definition = input.data+type+": "+definition;
			irc.say(input.context, definition, false, 2);
		});
	}
});

