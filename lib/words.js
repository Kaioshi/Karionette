"use strict";
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
			return true;
		}
	}
	badwords = null;
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

global.words = {
	lookup: function (type, word) {
		var uri, i, verb, base;
		word = word.toLowerCase();
		type = type.toLowerCase();
		if (checkBad(type, word)) return; // known bad word
		switch (type) {
			case "verb":
				if (!irc_config.api.wordnik) {
					logger.debug("Word discovery needs a wordnik API. Get one at http://developer.wordnik.com and put it in your config.");
					return;
				}
				uri = "http://api.wordnik.com:80/v4/word.json/"
					+word+"/relatedWords?useCanonical=true&relationshipTypes=verb-form&limitPerRelationshipType=10&api_key="+irc_config.api.wordnik;
				web.get(uri, function (error, response, body) {
					body = JSON.parse(body);
					if (body.length > 0) {
						verb = { base: word };
						for (i = 0; i < body[0].words.length; i++) {
							if (body[0].words[i] === word) verb.base = false;
							if (body[0].words[i].slice(-1) === "s") verb.s = body[0].words[i];
							if (body[0].words[i].slice(-2) === "ed") verb.ed = body[0].words[i];
							if (body[0].words[i].slice(-3) === "ing") verb.ing = body[0].words[i];
						}
						if (verb.s && verb.ed && verb.ing) {
							if (verb.base) {
								logger.debug("Adding "+verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
								words.verb.add(verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
							} else { // need to look up the base word. :<
								uri = "http://api.wordnik.com:80/v4/word.json/"
									+word+"/relatedWords?useCanonical=false&relationshipTypes=verb-stem&limitPerRelationshipType=10&api_key="+irc_config.api.wordnik;
								logger.debug("Looking up the base of "+word+".");
								web.get(uri, function (error, response, body) {
									body = JSON.parse(body);
									verb.base = body[0].words[0];
									logger.debug("Adding "+verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
									words.verb.add(verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
								});
							}
						} else {
							logger.debug("Not adding "+word+" - didn't meet criteria: "+body[0].words.join(", ")+
								" - if you know better, you can add it manually with "+irc_config.command_prefix+
								"word verb add verb verbs verbed verbing");
						}
					} else {
						addBad("verb", word);
					}
				});
				break;
			default:
				uri = "http://api.wordnik.com:80/v4/word.json/"
					+word+"/definitions?limit=1&includeRelated=false&sourceDictionaries=all&useCanonical=false&includeTags=false&api_key="+irc_config.api.wordnik;
				web.get(uri, function (error, response, body) {
					body = JSON.parse(body);
					if (body.length > 0 && body[0].partOfSpeech === type) {
						words[type].add(word);
					} else {
						addBad(type, word);
					}
				});
				break;
		}
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
	possessivePronoun: {
		add: function (word) {
			return words.add("possessivePronoun", word);
		},
		remove: function (word) {
			return words.remove("possessivePronoun", word);
		},
		get: function (word, index) {
			return words.get("possessivePronoun", word, index);
		},
		random: function () {
			return lib.randSelect(words.possessivePronoun.list);
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
words.load("possessivePronoun");
words.load("preposition");
