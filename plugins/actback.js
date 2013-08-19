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

function getWpm(line) {
	return Math.floor((line.length/5.0)*1750);
}

function transformObj(args, num) {
	while (isObj(args[num])) {
		num += 1;
	}
	return args[num];
}

function questionReply(question) {
	question = question.toLowerCase();
	var what = [
//		"Probably something like {randThing}",
		"Err... 42?",
		"I think the answer is probably lost at sea",
		"The real question is 'what is a "+words.noun.random()+" doing in Asuna's box?', fool.",
		"It's... um... hmm... It's dead.",
		"A BROODING COCKATRICE",
		"You think I'm going to tell you that? Ha!",
		"Something dirty like a bmotion bot",
		"Ooooo ho ho ho ho. That knowledge is not befitting of a lowly peasant like you.",
		"Holy Bullfango Batman, I didn't think you'd have the guts to ask that!",
		"Go ask your parents, little boy"
	], where = [
		"In Asuna's box",
		"On the film set of ranma's home made porno",
		"Probably with my dog",
		"Better ask Asuna as she was playing with it in her bedroom last",
		"In my hear :)",
		"Over the rainbow, obviously",
		"In the matrix",
		"Near the Great Pyramid; X marks the spot!",
		"In the gypsy camp I spent the summer running around naked in",
		"Unda da sea~"
	], when = [
		"In the dead of the night, when mitch_ is fapping to tohou",
		"WHEN I GET AROUND TO IT, GOSH!",
		"Asa dayo",
		"On my birthday",
		"When hell freezes over, maybe -_-",
		"Probably some time tonight",
		"Tomorrow, maybe? When I'm in the bath",
		"Next week, during my period",
		"What is time, anyway?",
		"Whenever you're ready :) Be gentle"
	], why = [
		"How should I know? Do I look like your therapist?",
		"Asuna made me",
		"... ranma did it!",
		"The chocobos wark'd really loudly at me",
		"I swallowed it by accident",
		"Probably because you're an idiot",
		"Y-Yeah Asuna, why?",
		"I was feeling horny... and Asuna was just standing there!",
		"Because it had to be done.",
		"Because everyone loves kneesocks, obviously",
		"Hee hee :3",
		"There's probably a good explanation, but I'm too busy slaving over a hot stove for all these lazy bastards"
	], yn = [
		"yep", "yep.", "yep!",
		"yes", "yes.", "yes!",
		"yeah", "yeah.", "yeah!",
		"yea", "yea.", "yea!",
		"why of course", "of course.", "of course!",
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
		"mmm oh yeah",
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
		"maybe. maybe? may bee! A BEE OH GOD, RUN! RUN FOR YOUR LIVES",
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
		"I'm in a season of " + lib.randSelect(["no", "NO", "NO!", "NOPE", "NOPE!", "NUH UH"]),
		"Thanks, but no thanks.",
		"Not possible",
		"unpossible.",
		"in another life.",
		"I cry, but decline.",
		"N to the O.",
		"if only",
		"hurrr.", "-.-", "balls", "o_o", ".________.",
		"hi!", "hello.", "an butt?",
		"if you would you could you should you into mitch_?",
		"I like your shoes",
		"you got a purdy mouth",
		"what do you think?",
		";~;", "o_O", "O_o", "...", ". . .", "wtf", "D:", ":D", ":>", ">:("
	];
	
	switch (question) {
	case "what":
		return lib.randSelect(what);
		break;
	case "where":
		return lib.randSelect(where);
		break;
	case "when":
		return lib.randSelect(when);
		break;
	case "why":
		return lib.randSelect(why);
		break;
	case "do":
	case "is":
	default:
		return lib.randSelect(yn);
		break;
	}
}

listen({
	plugin: "actback",
	handle: "actback",
	regex: regexFactory.actionMatching(config.nickname),
	callback: function (input, match) {
		var randReply, tmp, suppVars,
			randThings = randDB.getAll(),
			randReplies = repliesDB.getAll(),
			nicks = (input.context[0] === "#" ?
				ial.Active(input.context).filter(function (nick) { return (nick !== input.from); })
				: []),
			nicks = (nicks.length > 0 ? nicks : [ "someone", "The Lawd Jasus", "your dad", "mitch_", "Asuna" ]),
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
			randVerb = radv + " " + randVerb;
			randVerbs = radv + " " + randVerbs;
			randVerbed = radv + " " + randVerbed;
			randVerbing = radv + " " + randVerbing;
		}
		
		if (verb.slice(-2) === "ly") {
			words.lookup("adverb", args[1].toLowerCase());
			adv = args[1] + " ";
			verb = args[2];
		}
		tmp = words.verb.get(verb);
		if (tmp) {
			// real
			verbs = tmp.s;
			verbed = tmp.ed;
			verbing = tmp.ing;
			verb = tmp.base;
			tmp = null;
		} else {
			// future: fire function that tries to add verb to verbs.txt via google define
			if (verb.slice(-3) === "hes") {
				verb = verb.slice(0, -2); // "touches" vs. "acquires"
			} else if (verb.slice(-1) === "s") {
				verb = verb.slice(0, -1);
			}
			verbs = verb + "s";
			verbed = verb + "ed";
			verbing = verb + "ing";
			words.lookup("verb", verb.toLowerCase());
		}
		suppVars = {
			"{from}": input.from,
			"{context}": input.context,
			"{randThing}": randThing,
			"{randNick}": lib.randSelect(nicks),
			"{verb}": adv + verb,
			"{verbs}": adv + verbs,
			"{verbed}": adv + verbed,
			"{verbing}": adv + verbing,
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
		}, getWpm(randReply));
	}
});

listen({
	plugin: "actback",
	handle: "actbackquestion",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :(?:(?:(?:"
			+ regexFactory.matchAny(config.nickname)
			+ "[,:]\\s)(\\w+).+)|(?:(\\w+).+)"
			+ regexFactory.matchAny(config.nickname)
			+ ")\\?$", "i"),
	callback: function (input, match) {
		var m = match[1] || match[2],
			rep = questionReply(m);
		
		setTimeout(function () {
			irc.reply(input, rep);
		}, getWpm(rep));
	}
});
