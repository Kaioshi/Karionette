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
			rverb = words.verb.random(),
			randReply, tmp,
			args = match[0].split(" "),
			verb = args[1], adv = "",
			verbs, verbed, verbing,
			obj = transformObj(args, 2),
			rNum = Math.floor(Math.random() * 100),
			randThing = randThings[Math.floor(Math.random() * randThings.length)],
			method = (rNum > 50 ? "say" : "action"),
			delay;
		
		if (verb.slice(-2) === "ly") { // breaking this for now
			adv = args[1]+" ";
			verb = args[2];
		}
		
		tmp = words.verb.get(verb);
		if (tmp) {
			// real
			logger.debug("verb found - "+verb);
			verbs = tmp["s"];
			verbed = tmp["ed"];
			verbing = tmp["ing"];
			verb = tmp["base"];
			tmp = null;
		} else {
			// future: fire function that tries to add verb to verbs.txt via google define
			if (verb.slice(-1) === "s") verb = verb.slice(0,-1);
			verbs = verb+"s";
			verbed = verb+"ed";
			verbing = verb+"ing";
		}
		var suppVars = {
			"{from}": input.from,
			"{context}": input.context,
			"{randThing}": randThing,
			"{verb}": adv+verb,
			"{verbs}": adv+verbs,
			"{verbed}": adv+verbed,
			"{verbing}": adv+verbing,
			"{randVerb}": rverb["base"],
			"{randVerbs}": rverb["s"],
			"{randVerbed}": rverb["ed"],
			"{randVerbing}": rverb["ing"],
			"{obj}": obj
		};
		
		if (!randReplies[verbs] && !randReplies.alts[verbs]) {
			randReply = randReplies.defa[method][Math.floor(Math.random() * randReplies.defa[method].length)];
		} else {
			if (randReplies.alts[verbs]) {
				verb = randReplies.alts[verbs];
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
