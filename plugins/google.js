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
	handle: "convert",
	regex: regexFactory.startsWith("convert"),
	command: {
		root: "convert",
		options: "N <unit> to <unit>",
		help: "Google's conversion thing!",
		syntax: "[Help] Syntax: "+config.command_prefix+"convert N <unit> to <unit> - Example: "
			+config.command_prefix+"convert 1 USD to AUD - Currency codes: http://en.wikipedia.org/wiki/ISO_4217#Active_codes"
	},
	callback: function (input, match) {
		var uri, garbage, tmp, errsponse,
			reg = /^([0-9\.?]+) ([A-Za-z ]+) (to|into) ([A-Za-z ]+)$/.exec(match[1]);
		if (reg) {
			uri = "http://www.google.com/ig/calculator?hl=en&q="+reg[1]+reg[2]+"=?"+reg[4];
			web.get(uri, function (error, response, body) {
				reg = /\{(.*): .*,(.*): .*,(.*): .*,(.*): .*\}$/.exec(body);
				if (reg[0].indexOf("\\x26") > -1) reg[0] = reg[0].replace(/\\x26/g, "");
				if (reg[0].indexOf("#215;") > -1) reg[0] = reg[0].replace(/#215;/g, "x");
				if (reg[0].indexOf("\\x3csup\\x3e") > -1) {
					tmp = reg[0].slice(reg[0].indexOf("\\x3csup\\x3e"));
					tmp = /^\\x3csup\\x3e(.*)\\x3c\/sup\\x3e/.exec(tmp);
					reg[0] = reg[0].replace(tmp[0], "^"+tmp[1]);
				}
				reg.slice(1).forEach(function (item) {
					reg[0] = reg[0].replace(item, "\""+item+"\"");
				});
				body = JSON.parse(reg[0]);
				if (body.error.length > 0) {
					errsponse = [
						"O.o",
						"o_O",
						"-.-",
						"yer doin' it wrong.",
						"nope",
						"try again!",
						"need real units -.-",
						"wat",
						"try harder. >:(",
						"look up the unit codes!",
						"hurr imaginary units"
					];
					irc.say(input.context, lib.randSelect(errsponse));
					return;
				}
				irc.say(input.context, body.lhs+" is equal to "+body.rhs, false);
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
		syntax: "[Help] Syntax: "+config.command_prefix+
			"define <word> - this uses google's define: keyword you're probably familiar "+
			"with - and so it is just as limited as that."
	},
	callback: function (input, match) {
		var definition, uri, meaning, related, type;
		
		if (!match[1]) {
			irc.say(input.context, this.command.syntax);
			return;
		}
		uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q=" + match[1];
		web.get(uri, function (error, response, body) {
			if (error) {
				irc.say(input.context, "Something has gone awry.");
				logger.error("[google-define] error looking up " + match[1] + " -> " + error);
				return;
			}
			body = JSON.parse(ent.decode(lib.stripHtml(body.slice(2, -10)
				.replace(/\\x3c/g, "<").replace(/\\x3e/g, ">").replace(/\\x27/g, "'"))));
			if (!body.primaries) {
				irc.say(input.context, "I couldn't find "+body.query+". :<");
				return;
			}
			related = [];
			meaning = [];
			type = body.primaries[0].terms[0].labels[0].text.toLowerCase();
			if (type.match(/verb|adverb/)) words.addWord(match[1].toLowerCase(), body, type);
			body.primaries[0].entries.forEach(function (entry) {
				if (entry.type === 'related') {
					entry.terms.forEach(function (item) {
						if (item.text !== match[1]) {
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
				if (related.length > 0)	definition = match[1]+" - \""+body.terms[0].text+"\" "+definition;
				else definition = match[1]+" - \""+body.terms[0].text+"\" - "+definition;
			} else definition = match[1]+" - "+definition;
			irc.say(input.context, definition, false, 2);
		});
	}
});

