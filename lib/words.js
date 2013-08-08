var fs, web, ent;
require("./funcs.js");
fs = require('fs');
web = require('./web.js');
ent = require('./entities.js');

function addWord(base, result) {
	var s, ed, ing;
	result.primaries.forEach(function (primary) {
		if (primary.terms[0].labels[0].text === "Verb") {
			primary.entries.forEach(function (entry) {
				if (entry.type === "related") {
					entry.terms.forEach(function (term) {
						if (term.labels) {
							term.labels.forEach(function (label) {
								switch (label.text) {
									case "past participle":
										ed = term.text;
										break;
									case "3rd person singular present":
										s = term.text;
										break;
									case "present participle":
										ing = term.text;
										break;
									default:
										break;
								}
							});
						}
					});
				}
			});
		}
	});
	if (s && ed && ing) {
		fs.appendFileSync("data/actback/verbs.txt", [base, s, ed, ing].join(" ")+"\n");
		words.verb.list.push([base, s, ed, ing].join(" "));
		logger.debug("Added "+base+" to verb list.");
	}
}

words = {
	lookup: function (type, word) { // looks up words via google define and adds them if they meet the criteria
		var uri;
		if (type === "verb") {
			if (words.verb.get(word, true)) {
				logger.debug("Didn't add "+word+" to verb list.");
				return;
			}
			uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q="+word;
			web.get(uri, function (error, response, body) {
				if (error) return;
				body = JSON.parse(ent.decode(lib.stripHtml(body.slice(2, -10)
					.replace(/\\x3c/g, "<").replace(/\\x3e/g, ">").replace(/\\x27/g, "'"))));
				if (!body.primaries) return;
				addWord(word, body);
			});
		}
	},
	verb: { // this needs to be redone from scratch - too simple and too hard to verify syntax
		add: function (line) {
			var i;
			line = line.toLowerCase().split(" ");
			for (i = 0; i < line.length; i++) {
				if (words.verb.get(line[i])) { // this is quite expensive, but add doesn't happen often.
					return "I'm already familiar with "+line[i]+" - "+line.join(", "); // it'll be ok.
				} // DON'T PANIC
			}
			if (line.length < 3 || line[3].slice(-3) !== "ing") {
				return "Nope.";
			}
			line = line.join(" ");
			fs.appendFileSync("data/actback/verbs.txt", line+"\n");
			words.verb.list.push(line);
			return "Added o7";
		},
		remove: function (word) {
			var removed, index;
			if (!word) return "Nope.";
			index = words.verb.get(word, true);
			if (!index) return "Couldn't find "+word;
			removed = words.verb.list.splice(index, 1);
			fs.writeFileSync("data/actback/verbs.txt", words.verb.list.join("\n"));
			return "Removed "+removed[0].split(" ")[0]+".";
		},
		get: function (word, index) {
			var line, i, k;
			word = word.toLowerCase();
			for (i = 0; i < words.verb.list.length; i++) {
				if (words.verb.list[i].indexOf(word) > -1) {
					line = words.verb.list[i].split(" ");
					for (k = 0; k < line.length; k++) {
						if (line[k] === word) {
							if (index) return i;
							return { base: line[0], s: line[1], ed: line[2], ing: line[3] };
						}
					}
				}
			}
		},
		refresh: function (debug) {
			words.verb.list = [];
			words.verb.list = fs.readFileSync("data/actback/verbs.txt").toString().split("\n");
		},
		random: function () {
			var line = words.verb.list[Math.floor(Math.random()*words.verb.list.length)].split(" ");
			return { base: line[0], s: line[1], ed: line[2], ing: line[3] };
		}
	}
};

words.verb.refresh();