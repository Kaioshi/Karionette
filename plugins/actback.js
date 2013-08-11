var randDB = new DB.List({filename: "randomThings"}),
	repliesDB = new DB.Json({filename: "actback/replies"});

function isObj(string) {
	var nonObjs = [
			"a",
			"an",
			"the",
			"some",
			"one",
			"loads",
			"of",
			"Mari",
			"Marionette",
			"Marionette's",
			"Mari's",
			"all",
			"his",
			"her"
		];

	return nonObjs.some(function (element) {
		return (element.toUpperCase() === string.toUpperCase());
	});
}

function transformObj(args, num) {
	while (isObj(args[num])) {
		num += 1;
	}
	return args[num];
}

listen({
	plugin: "actback",
	handle: "actback",
	regex: regexFactory.actionMatching(config.nickname),
	callback: function (input, match) {
		var randThings = randDB.getAll(),
			randReplies = repliesDB.getAll(),
			randReply, tmp, suppVars,
			args = match[0].split(" "),
			verb = args[1], adv = "",
			verbs, verbed, verbing,
			radv = (lib.chance() ? words.adverb.random() : ""),
			randVerb = words.verb.random().base,
			randVerbs = words.verb.random().s,
			randVerbed = words.verb.random().ed,
			randVerbing = words.verb.random().ing,
			obj = transformObj(args, 2),
			randThing = lib.randSelect(randThings),
			method = (lib.chance(50) ? "say" : "action");
		
		if (radv) {
			randVerb = radv+" "+randVerb;
			randVerbs = radv+" "+randVerbs;
			randVerbed = radv+" "+randVerbed;
			randVerbing = radv+" "+randVerbing;
		}
		
		if (verb.slice(-2) === "ly") {
			words.lookup("adverb", args[1].toLowerCase());
			adv = args[1]+" ";
			verb = args[2];
		}
		tmp = words.verb.get(verb);
		if (tmp) {
			// real
			verbs = tmp["s"];
			verbed = tmp["ed"];
			verbing = tmp["ing"];
			verb = tmp["base"];
			tmp = null;
		} else {
			// future: fire function that tries to add verb to verbs.txt via google define
			if (verb.slice(-3) === "hes") verb = verb.slice(0,-2); // "touches" vs. "acquires"
			else if (verb.slice(-1) === "s") verb = verb.slice(0,-1);
			verbs = verb+"s";
			verbed = verb+"ed";
			verbing = verb+"ing";
			words.lookup("verb", verb.toLowerCase());
		}
		suppVars = {
			"{from}": input.from,
			"{context}": input.context,
			"{randThing}": randThing,
			"{verb}": adv+verb,
			"{verbs}": adv+verbs,
			"{verbed}": adv+verbed,
			"{verbing}": adv+verbing,
			"{adverb}": words.adverb.random(),
			"{adjective}": words.adjective.random(),
			"{noun}": words.noun.random(),
			"{pronoun}": words.pronoun.random(),
			"{personalPronoun}": words.personalPronoun.random(),
			"{possessivePronoun}": words.possessivePronoun.random(),
			"{preposition}": words.preposition.random(),
			"{randVerb}": randVerb,
			"{randVerbs}": randVerbs,
			"{randVerbed}": randVerbed,
			"{randVerbing}": randVerbing,
			"{obj}": obj
		};
		if (!randReplies[verbs] && !randReplies.alts[verbs]) {
			randReply = lib.randSelect(randReplies.defa[method]);
		} else {
			if (randReplies.alts[verbs]) {
				verbs = randReplies.alts[verbs];
			}
			randReply = lib.randSelect(randReplies[verbs][method]);
		}
		randReply = lib.supplant(randReply, suppVars);
		setTimeout(function () {
			irc[method](input.context, randReply);
		}, lib.randNum(3000,10000));
	}
});

function questionReply() {
	if (lib.chance(50)) { // yes and maybe
		if (lib.chance(50)) { // yes
			return lib.randSelect([
				"yep", "yep.", "yep!",
				"yes", "yes.", "yes!",
				"yeah", "yeah.", "yeah!",
				"yea", "yea.", "yea!",
				"of course", "of course.", "of course!",
				"without fail",
				"beyond a doubt", "beyond a shadow of a doubt",
				"by all means",
				"definitely", "definitely.", "definitely!",
				"affirmative",
				"undoubtedly",
				"naturally",
				"I believe the answer is yes.",
				"my magic 8-ball and I both agree that the answer is almost certainly without a doubt most likely yes.",
				"yerp", "yERP", "YERP",
				"absolutely", "absolutely.", "absolutely!",
				"unquestionably yes",
				"YESSSS",
				"ahuh", "ahuh.", "ahuh!",
				"mhm",
				"mmm oh yeah"
			]);
		} else { // maybe
			return lib.randSelect([
				"maybe", "maybe?", "maybe!..", ".. maybe?",
				"mebbe", "mebbe!", "mebbe?",
				"possibly", "possibly!", "possibly?",
				"perhaps", "perhaps.", "perhaps!",
				"conceivably", "conceivably.",
				"uncertainly", "uncertainly.", "uncertainly!",
				"the odds are heavily in favour of maybe",
				"it is within the realm of possibility",
				"god willing", "jebus permitting", "JAYSUS PERMITTING",
				"if it were at all possible, perhaps perchance",
				"my magic 8-ball and I both agree that the answer is probably maybe. maybe.",
				"may be.",
				"maybe. maybe? may bee! A BEE OH GOD, RUN! RUN FOR YOUR LIVES"
			]);
		}
	} else { // no and hurr
		if (lib.chance(70)) { // no
			return lib.randSelect([
				"no", "no.", "no!",
				"absolutely not",
				"ABSOLUTELY NOT!",
				"absolutely not.",
				"nope", "nope.", "nope!",
				"nah", "nah.", "nah!",
				"nuh", "nuh.", "nuh!",
				"all signs point to NUH.",
				"NOPENOPENOPENOPENOPE",
				"no. No. NO. NONONONONONONO",
				"Nope. NOPE. NOPENOPENOPENOPE",
				"NOOOOOOO",
				"NO", "NO.", "NO!",
				"Heck no.", "Heck NO", "HECK NO!",
				"not this time",
				"perhaps another time.",
				"I'm in a season of "+lib.randSelect(["no", "NO", "NO!", "NOPE", "NOPE!", "NUH UH"]),
				"Thanks, but no thanks.",
				"Not possible",
				"unpossible.",
				"in another life.",
				"I cry, but decline.",
				"N to the O.",
				"if only"
			]);
		} else { // hurr
			return lib.randSelect([
				"hurrr.", "-.-", "balls", "o_o", ".________.",
				"hi!", "hello.", "an butt?",
				"if you would you could you should you into mitch_?",
				"I like your shoes",
				"you got a purdy mouth",
				"what do you think?",
				"I put the question to you!",
				"c'mon now.", "c'mon man.", "O_O",
				";~;", "o_O", "O_o", "...", ". . .", "wtf", "D:", ":D", ":>", ">:(",
				"here, take this and apply generously to your <bleep> twice a day until that clears up.. or it falls off."
			]);
		}
	}
}

listen({
	plugin: "actback",
	handle: "actbackquestion",
	regex: regexFactory.startsWith(["does", "do", "would", "should", "will", "can", "are", "what"]),
	callback: function (input, match) {
		setTimeout(function () {
			irc.reply(input, questionReply());
		}, lib.randNum(1000, 5000));
	}
});

