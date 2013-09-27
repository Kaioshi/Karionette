﻿var randDB = new DB.List({filename: "randomThings"}),
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
	return Math.floor((line.length / 5.0) * 1000);
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
		"The real question is 'what is a " + words.noun.random() + " doing in Asuna's box?', fool.",
		"It's... um... hmm... It's dead.",
		"A BROODING COCKATRICE",
		"You think I'm going to tell you that? Ha!",
		"Something dirty like a bmotion bot",
		"Ooooo ho ho ho ho. That knowledge is not befitting of a lowly peasant like you.",
		"Holy Bullfango Batman, I didn't think you'd have the guts to ask that!",
		"Go ask your parents, little boy"
	], which = [
		"The one that smells best",
		"The one that doesn't involve you!",
		"On the weekend, I'd usually choose the latter. But right now, I'm feeling kinky...",
		"Whichever is dirtier",
		"Whichever doesn't give me a rash",
		"I pretty much have no opinion on that, but if I were to choose, I'd say Lunatrius' butt",
		"The one with the more sordid connotations",
		"Hako soup",
		"My next door neighbour gave me the former, once. I couldn't walk straight for a week",
		"If it involves Rule 63, that",
		"For the last time, you are _NOT_ getting into my pants! (tonight)",
		"Either... that's just how I swing. #yolo",
		"Hahahahaha.... Wait, you're serious?",
		"L to the E to the W to the D"
	], where = [
		"In Asuna's box",
		"On the film set of ranma's home made porno",
		"Probably with my dog",
		"Better ask Asuna as she was playing with it in her bedroom last",
		"In my ear :)",
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
		"Because I'd secretly love to make out with Asuna",
		"There's probably a good explanation, but I'm too busy slaving over a hot stove for all these lazy bastards"
	], how = [
		"Probably something to do with how the planets are aligned.",
		"Probably something to do with how your balls are aligned tonight",
		"Why don't you google it?",
		"This: http://bit.ly/12UjlSQ",
		"Something something cock fight.",
		"Something something prescription drugs.",
		"The best way to beat a bully is by showing them how much bigger your genitals are in comparison to theirs. Trust me.",
		"The best way to beat a horny lolicon is to tell them you're actually their siste- no wait...",
		"The best way to beat the last boss is by getting it tangled in all its own tentacles, then shoot for the neck (or anus)",
		"The best way to beat a horny fujoshi is to... actually there's no way. They'll just project their current fantasy onto (and sometimes into) you, and before you know it, you'll be bound to a slender manequin with something hard poking into your behind",
		"Easy. Use butter. Lots of butter.",
		"Easy. Use your boyfriend. Twice in a row.",
		"It's somewhat difficult. First you need lubricant, then you need to find a willing soul, then you need to make sure you practice safety. In the end, if you do it correctly, you'll 1UP.",
		"He's dead, Jim",
		"I don't know. I think it started when I met the necrophiliac elf girl.",
		"I usually just pop it.",
		"I can normally take it all. I don't know why I can't tonight.",
		"I have nooooooooo bloody clue.",
		"I use Asuna as a substitute.",
		"Rum pum pum pum~",
		"I just get really hot. So hot. Please don't take advantage of me.",
		"I use latex.",
		"When I can't find a suitable person, I turn to my 'massager'"
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
	case "which":
		return lib.randSelect(which);
		break;
	case "why":
		return lib.randSelect(why);
		break;
	case "how":
		return lib.randSelect(how);
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
			irc.say(input.context, rep);
		}, getWpm(rep));
	}
});
