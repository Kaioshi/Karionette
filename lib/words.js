var fs, web, ent;
require("./funcs.js");
fs = require('fs');
web = require('./web.js');
ent = require('./entities.js');

function addBad(type, word) {
	if (type && word) {
		logger.debug("Adding "+word+" to bad_"+type+"s.txt");
		fs.appendFileSync("data/actback/bad_"+type+"s.txt", "\n"+word);
	}
}

function checkBad(type, word) {
	var i, badwords;
	type = type.toLowerCase();
	badwords = fs.readFileSync("data/actback/bad_"+type+"s.txt").toString().split("\n");
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

function randSelect(yarr) {
	return yarr[Math.floor(Math.random()*yarr.length)];
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
	addWord: function (word, result, type) {
		var s, ed, ing;
		word = word.toLowerCase();
		result.primaries.forEach(function (primary) {
			if (type === "adverb") {
				if (primary.terms[0].labels[0].text === "Adverb") {
					words.adverb.list.push(word);
					words.adverb.save();
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
						words.verb.save();
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
	adverb: {
		add: function (word) {
			var exists = words.adverb.get(word);
			if (exists) return "I'm already familiar with "+word+".";
			words.adverb.list.push(word);
			words.adverb.write();
			return "Added o7";
		},
		remove: function (word) {
			var removed, index = words.adverb.get(word);
			if (index) {
				removed = words.adverb.list.splice(index,1);
				words.adverb.list = removeEmpty(words.adverb.list);
				fs.writeFileSync("data/actback/adverbs.txt", words.adverb.list.join("\n"));
				return "Removed "+removed+".";
			}
			return "Couldn't find "+word+".";
		},
		change: function (oldWord, newWord) {
			var index = words.adverb.get(oldWord);
			if (index) {
				words.adverb.list[index] = newWord;
				words.adverb.list = removeEmpty(words.adverb.list);
				fs.writeFileSync("data/actback/adverbs.txt", words.adverb.list.join("\n"));
				return "Updated o7";
			}
			return "Couldn't find "+word+".";
		},
		get: function (word, index) {
			var i;
			word = word.toLowerCase();
			for (i = 0; i < words.adverb.list.length; i++) {
				if (word === words.adverb.list[i]) {
					if (index) return i;
					return word;
				}
			}
			if (!index) return "Couldn't find "+word+".";
		},
		random: function () {
			return randSelect(words.adverb.list);
		},
		save: function () {
			words.adverb.list = removeEmpty(words.adverb.list);
			fs.writeFileSync("data/actback/adverbs.txt", words.adverb.list.join("\n"));
		},
		load: function () {
			words.adverb.list = [];
			words.adverb.list = removeEmpty(fs.readFileSync("data/actback/adverbs.txt").toString().split("\n"));
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
			words.verb.save();
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
			fs.appendFileSync("data/actback/verbs.txt", "\n"+line);
			words.verb.list.push(line);
			return "Added o7";
		},
		remove: function (word) {
			var removed, index;
			if (!word) return "Nope.";
			index = words.verb.get(word, true);
			if (!index) return "Couldn't find "+word;
			removed = words.verb.list.splice(index, 1);
			words.verb.save();
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
		save: function () {
			words.verb.list = removeEmpty(words.verb.list);
			fs.writeFileSync("data/actback/verbs.txt", words.verb.list.join("\n"));
		},
		load: function () {
			words.verb.list = [];
			words.verb.list = removeEmpty(fs.readFileSync("data/actback/verbs.txt").toString().split("\n"));
		},
		random: function () {
			var line = randSelect(words.verb.list).split(" ");
			return { base: line[0], s: line[1], ed: line[2], ing: line[3] };
		}
	}
};

words.verb.load();
words.adverb.load();
