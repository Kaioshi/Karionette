"use strict";

module.exports = function (lib, config, logger, web, DB) {
	var words, badWords = {};

	function addBad(type, word) {
		var lword = word.toLowerCase(), ltype = type.toLowerCase();
		if (!badWords[ltype])
			badWords[ltype] = new DB.List({filename: "words/bad_"+ltype+"s"});
		badWords[ltype].saveOne(lword);
	}

	function checkBad(type, word) {
		var lword = word.toLowerCase(), ltype = type.toLowerCase();
		if (!badWords[ltype])
			badWords[ltype] = new DB.List({filename: "words/bad_"+ltype+"s"});
		return badWords[ltype].hasOne(lword);
	}

	words = {
		lookup: function (type, word) {
			var uri, i, verb;
			word = word.toLowerCase();
			type = type.toLowerCase();
			if (checkBad(type, word))
				return; // known bad word
			switch (type) {
			// case "noun":
			// 	if (!config.api.wordnik) {
			// 		logger.debug("Word discovery needs a wordnik API. Get one at http://developer.wordnik.com and put it in your config.");
			// 		return;
			// 	}
			// 	uri = "http://api.wordnik.com:80/v4/word.json/"+word+
			// 		"/relatedWords?useCanonical=true&relationshipTypes=noun-form&limitPerRelationshipType=10&api_key="+config.api.wordnik;
			// 	web.json(uri).then(function (res) {
			// 		globals.lastWord = res;
			// 	});
			// 	break;
			case "verb":
				if (!config.api.wordnik) {
					logger.debug("Word discovery needs a wordnik API. Get one at http://developer.wordnik.com and put it in your config.");
					return;
				}
				uri = "http://api.wordnik.com:80/v4/word.json/"+word+
					"/relatedWords?useCanonical=true&relationshipTypes=verb-form&limitPerRelationshipType=10&api_key="+config.api.wordnik;
				web.json(uri).then(function (body) {
					if (!body.length) {
						addBad("verb", word);
						throw Error("Got no response");
					}
					verb = { base: word };
					for (i = 0; i < body[0].words.length; i++) {
						if (body[0].words[i] === word) verb.base = false;
						if (body[0].words[i].slice(-1) === "s") verb.s = body[0].words[i];
						if (body[0].words[i].slice(-2) === "ed") verb.ed = body[0].words[i];
						if (body[0].words[i].slice(-3) === "ing") verb.ing = body[0].words[i];
					}
					if (!verb.s || !verb.ed || !verb.ing) {
						addBad("verb", word);
						throw Error("Bad verb");
					}
					if (verb.base) {
						logger.debug("Adding "+verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
						words.verb.add(verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
					} else { // need to look up the base word. :<
						uri = "http://api.wordnik.com:80/v4/word.json/"+word+
							"/relatedWords?useCanonical=false&relationshipTypes=verb-stem&limitPerRelationshipType=10&api_key="+config.api.wordnik;
						logger.debug("Looking up the base of "+word+".");
						return web.json(uri);
					}
				}).then(function (body) {
					verb.base = body[0].words[0];
					logger.debug("Adding "+verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
					words.verb.add(verb.base+" "+verb.s+" "+verb.ed+" "+verb.ing);
				}).catch(function (error) {
					logger.debug(error.message);
				});
				break;
			default:
				uri = "http://api.wordnik.com:80/v4/word.json/"+word+
					"/definitions?limit=1&includeRelated=false&sourceDictionaries=all&useCanonical=false&includeTags=false&api_key="+config.api.wordnik;
				web.json(uri).then(function (body) {
					if (body.length > 0 && body[0].partOfSpeech === type)
						words[type].add(word);
					else
						addBad(type, word);
				});
				break;
			}
		},
		add: function (type, word) { // not for verbs!
			if (words[type].list.hasOne(word))
				return "I'm already familiar with "+word+".";
			words[type].list.saveOne(word);
			logger.debug("Added "+word+" to "+type+"s.");
			return "Added o7";
		},
		remove: function (type, word) {
			var match = words[type].get(word);
			if (match) {
				if (type === "noun")
					words.noun.list.removeOne(match.base+" "+match.s);
				else if (type === "verb")
					words.verb.list.removeOne(match.base+" "+match.s+" "+match.ed+" "+match.ing);
				else
					words[type].removeOne(word);
			}
		},
		load: function (type) {
			words[type].list = new DB.List({filename: "words/"+type+"s"});
		},
		save: function (type) {
			logger.debug("words.save("+type+") was called");
		},
		get: function (type, word) {
			if (type === "noun" || type === "verb")
				return words[type].get(word);
			return words[type].list.getOne(word);
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
				return words.preposition.list.random();
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
				return words.possessivePronoun.list.random();
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
				return words.personalPronoun.list.random();
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
				return words.pronoun.list.random();
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
				return words.adjective.list.random();
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
				return words.adverb.list.random();
			}
		},
		noun: {
			add: function (word) {
				if (words.noun.list.hasOne(word))
					return "I'm already familiar with " + word.split(" ")[0];
				words.noun.list.saveOne(word);
				return "Added o7";
			},
			remove: function (word) {
				if (!words.noun.list.hasOne(word))
					return "I'm not familiar with "+word.split(" ")[0]+".";
				words.noun.removeOne(word);
				return "Removed. o7";
			},
			get: function (word) { // needs to match either singular or plural
				var matches, noun;
				if (word[word.length-1] === "s")
					matches = words.noun.list.search(" "+word);
				else
					matches = words.noun.list.search(word+" ");
				if (matches.length) {
					noun = lib.randSelect(matches).split(" ");
					return { base: noun[0], s: noun[1] };
				}
			},
			random: function() {
				var noun = words.noun.list.random().split(" ");
				return { base: noun[0], s: noun[1] };
			}
		},
		verb: { // this needs to be redone from scratch - too simple and too hard to verify syntax
			change: function (line) {
				var lline, match;
				if (!line)
					return;
				lline = line.toLowerCase().split(" ");
				if (lline.length < 3 || lline[3].slice(-3) !== "ing")
					return "Pantsu.";
				match = words.verb.list.search(lline[0]+" ");
				if (!match.length)
					return "Couldn't find "+lline[0];
				words.verb.list.removeOne(match[0]);
				words.verb.list.saveOne(lline);
				return "Updated o7";
			},
			add: function (line) {
				var lline = line.toLowerCase(), match;
				if (words.verb.list.hasOne(lline))
					return "I'm already familiar with "+line+".";
				lline = lline.split(" ");
				match = words.verb.list.search(lline[0]+" ");
				if (match.length)
					return "I'm already familiar with "+line+".";
				if (lline.length < 3 || lline[3].slice(-3) !== "ing")
					return "Nope.";
				words.verb.list.saveOne(line.toLowerCase());
				return "Added o7";
			},
			get: function (word) {
				var lword = word.toLowerCase(), match;
				if (lword[lword.length-1] === "s" || lword.slice(-2) === "ed")
					match = words.verb.list.search(" "+lword+" ");
				else if (lword.slice(-3) === "ing")
					match = words.verb.list.search(" "+lword);
				else
					match = words.verb.list.search(lword+" ");
				if (match.length) {
					lword = match[0].split(" ");
					return { base: lword[0], s: lword[1], ed: lword[2], ing: lword[3] };
				}
			},
			remove: function (word) {
				return words.remove("verb", word);
			},
			random: function () {
				var line = words.verb.list.random().split(" ");
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

	globals.words = words;
	return words;
};
