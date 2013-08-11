var fs, web, ent;
require("./funcs.js");
fs = require('fs');
web = require('./web.js');
ent = require('./entities.js');

function addBad(type, word) {
	if (type && word) {
		logger.debug("Adding "+word+" to bad_"+type+"s.txt");
		fs.appendFileSync("data/words/bad_"+type+"s.txt", "\n"+word);
	}
}

function checkBad(type, word) {
	var i, badwords;
	type = type.toLowerCase();
	badwords = fs.readFileSync("data/words/bad_"+type+"s.txt").toString().split("\n");
	for (word = word.toLowerCase(), i = 0; i < badwords.length; i++) {
		if (badwords[i] === word) {
			badwords = null;
			logger.debug(word+" is in bad_"+type+"s.txt");
			return true;
		}
	}
	badwords = null;
	logger.debug(word+" wasn't found in bad_"+type+"s.txt");
}

function removeEmpty(yarr) { // removes any empty entries in an array.
	var i, ret;
	if (!yarr || yarr.length === 0) {
		logger.debug("[lib/words] removeEmpty was passed an empty array.");
		return;
	}
	for (i = 0, ret = []; i < yarr.length; i++) {
		if (yarr[i].length > 0) ret.push(yarr[i]);
	}
	return ret;
}

words = {
	addWord: function (word, result, type) { // this needs to be rethought - fondled from when there were only verbs
		var s, ed, ing;
		word = word.toLowerCase();
		result.primaries.forEach(function (primary) {
			if (type === "adverb") {
				if (primary.terms[0].labels[0].text === "Adverb") {
					words.adverb.list.push(word);
					words.save("adverb");
					logger.debug("Added "+word+" to adverb list.");
				}
			} else if (type === "verb") {
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
					if (s && ed && ing) {
						words.verb.list.push([word, s, ed, ing].join(" "));
						words.save("verb");
						logger.debug("Added "+word+" to verb list.");
					}
				}
			}
		});
	},
	lookup: function (type, word) { // looks up words via google define and adds them if they meet the criteria
		var uri;
		if (checkBad(type, word)) return;
		if (words[type].get(word, true)) {
			logger.debug(word+" was already in the "+type+" list");
			return;
		}
		uri = "http://www.google.com/dictionary/json?callback=a&sl=en&tl=en&q="+word;
		web.get(uri, function (error, response, body) {
			if (error) return;
			body = JSON.parse(ent.decode(lib.stripHtml(body.slice(2, -10)
				.replace(/\\x3c/g, "<").replace(/\\x3e/g, ">").replace(/\\x27/g, "'"))));
			if (!body.primaries) {
				addBad(type, word);
				return;
			}
			words.addWord(word, body, type);
		});
	},
	add: function (type, word) { // not for verbs!
		var index = words[type].get(word, true);
		if (index !== undefined) return "I'm already familiar with "+word+".";
		words[type].list.push(word);
		words.save(type);
		logger.debug("Added "+word+" to "+type+"s.");
		return "Added o7";
	},
	remove: function (type, word) {
		var removed, index = words[type].get(word, true);
		if (index !== undefined) {
			removed = words[type].list.splice(index, 1);
			words.save(type);
			return "Removed "+word+" from "+type+"s.";
		}
		return "Couldn't find "+word+" in "+type+"s.";
	},
	load: function (type) {
		words[type].list = [];
		words[type].list = fs.readFileSync("data/words/"+type+"s.txt").toString().split("\n");
	},
	save: function (type) {
		words[type].list = removeEmpty(words[type].list);
		fs.writeFileSync("data/words/"+type+"s.txt", words[type].list.join("\n"));
	},
	get: function (type, word, index) {
		var i;
		for (i = 0, word = word.toLowerCase(); i < words[type].list.length; i++) {
			if (word === words[type].list[i]) {
				if (index === true) return i;
				return word;
			}
		}
		if (!index) return "Couldn't find "+word+" in "+type+"s.";
	},
	preposition: {
		add: function (word) {
			return words.add("preposition", word);
		},
		remove: function (word) {
			return words.remove("preposition", word);
		},
		get: function (word, index) {
			return words.get("preposition", word, index);
		},
		random: function () {
			return lib.randSelect(words.preposition.list);
		}
	},
	personalPronoun: {
		add: function (word) {
			return words.add("personalPronoun", word);
		},
		remove: function (word) {
			return words.remove("personalPronoun", word);
		},
		get: function (word, index) {
			return words.get("personalPronoun", word, index);
		},
		random: function () {
			return lib.randSelect(words.personalPronoun.list);
		}
	},
	pronoun: {
		add: function (word) {
			return words.add("pronoun", word);
		},
		remove: function (word) {
			return words.remove("pronoun", word);
		},
		get: function (word, index) {
			return words.get("pronoun", word, index);
		},
		random: function () {
			return lib.randSelect(words.pronoun.list);
		}
	},
	noun: {
		add: function (word) {
			return words.add("noun", word);
		},
		remove: function (word) {
			return words.remove("noun", word);
		},
		get: function (word, index) {
			return words.get("noun", word, index);
		},
		random: function() {
			return lib.randSelect(words.noun.list);
		}
	},
	adjective: {
		add: function (word) {
			return words.add("adjective", word);
		},
		remove: function (word) {
			return words.remove("adjective", word);
		},
		get: function (word, index) {
			return words.get("adjective", word, index);
		},
		random: function () {
			return lib.randSelect(words.adjective.list);
		}
	},
	adverb: {
		add: function (word) {
			return words.add("adverb", word);
		},
		remove: function (word) {
			return words.remove("adverb", word);
		},
		get: function (word, index) {
			return words.get("adverb", word, index);
		},
		random: function () {
			return lib.randSelect(words.adverb.list);
		}
	},
	verb: { // this needs to be redone from scratch - too simple and too hard to verify syntax
		change: function (line) {
			var index, base;
			if (!line) return;
			line = line.toLowerCase().split(" ");
			if (line.length < 3 || line[3].slice(-3) !== "ing") {
				return "Pantsu.";
			}
			index = words.verb.get(line[0], true);
			if (!index) return "Couldn't find "+line[0];
			words.verb.list[index] = line.join(" ");
			words.save("verb");
			return "Updated o7";
		},
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
			words.verb.list.push(line);
			words.save("verb");
			return "Added o7";
		},
		remove: function (word) {
			return words.remove("verb", word);
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
		random: function () {
			var line = lib.randSelect(words.verb.list).split(" ");
			return { base: line[0], s: line[1], ed: line[2], ing: line[3] };
		}
	}
};

words.load("verb");
words.load("adverb");
words.load("adjective");
words.load("noun");
words.load("pronoun");
words.load("personalPronoun");
words.load("preposition");
