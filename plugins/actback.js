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

function chance(n) {
	return (Math.floor(Math.random()*100) > (n? n : 50));
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
			radv = (chance() ? words.adverb.random() : ""),
			randVerb = words.verb.random().base,
			randVerbs = words.verb.random().s,
			randVerbed = words.verb.random().ed,
			randVerbing = words.verb.random().ing,
			obj = transformObj(args, 2),
			rNum = Math.floor(Math.random() * 100),
			randThing = randThings[Math.floor(Math.random() * randThings.length)],
			method = (rNum > 50 ? "say" : "action"),
			delay;
		
		if (radv) {
			if (chance(70)) {
				randVerb = radv+" "+randVerb;
				randVerbs = radv+" "+randVerbs;
				randVerbed = radv+" "+randVerbed;
				randVerbing = radv+" "+randVerbing;
			} else {
				randVerb = randVerb+" "+radv;
				randVerbs = randVerbs+" "+radv;
				randVerbed = randVerbed+" "+radv;
				randVerbing = randVerbing+" "+radv;
			}
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
			"{randVerb}": randVerb,
			"{randVerbs}": randVerbs,
			"{randVerbed}": randVerbed,
			"{randVerbing}": randVerbing,
			"{obj}": obj
		};
		if (!randReplies[verbs] && !randReplies.alts[verbs]) {
			randReply = randReplies.defa[method][Math.floor(Math.random() * randReplies.defa[method].length)];
		} else {
			if (randReplies.alts[verbs]) {
				verbs = randReplies.alts[verbs];
			}
			randReply = randReplies[verbs][method][Math.floor(Math.random() * randReplies[verbs][method].length)];
		}
		randReply = lib.supplant(randReply, suppVars);
		delay = (randReply.length/5)/1.5*500;
		setTimeout(function () {
			irc[method](input.context, randReply);
		}, delay);
	}
});
