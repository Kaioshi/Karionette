"use strict";
var regexFactory = require("./lib/regexFactory.js"),
	randDB = new DB.List({filename: "randomThings"}),
	denyDB = new DB.Json({filename: "actback/deny"}),
	statsDB = new DB.Json({filename: "actback/stats"}),
	repliesDB = new DB.Json({filename: "actback/replies"});

function getWpm(line) {
	return Math.floor((line.length / 5.0) * 1000);
}

function transformObj(args, num) {
	var me = (config.nick ? config.nick : config.nickname[0]),
		nonObjs = [
			me,
			me+"s",
			me+"'s",
			"a",
			"an",
			"the",
			"some",
			"one",
			"loads",
			"lot",
			"of",
			"all",
			"his",
			"their",
			"with",
			"her"
		],
		isNonObj = function (elem) {
			if (args[num] === undefined)
				return;
			return (elem.toLowerCase() === args[num].toLowerCase());
		};
	while (nonObjs.some(isNonObj))
		num++;
	return args[num];
}

var questionReply = (function () {
	var what = [
		"Err... 42?",
		"I think the answer is probably lost at sea",
		"The real question is 'what is a " + words.noun.random().base + " doing in " + lib.randSelect(config.local_whippingboys) + "'s box?', fool.",
		"It's... um... hmm... It's dead.",
		"A BROODING COCKATRICE",
		"You think I'm going to tell you that? Ha!",
		"Something dirty like a bmotion bot",
		"Ooooo ho ho ho ho. That knowledge is not befitting of a lowly peasant like you.",
		"Holy Bullfango Batman, I didn't think you'd have the guts to ask that!",
		"Go ask your parents, little boy",
		"Lots of chocolate bunnies",
		"Sell your soul to me and you may find out",
		"Clannad :)",
		"Nothing sexual",
		"For the last time, I'm not telling you my three sizes :("
	], who = [
		lib.randSelect(config.local_whippingboys) + "'s cousin's friend-with-benefits",
		"The pink Power Ranger",
		"The candy man",
		"Bill Nye the Science Guy!",
		"Frankenstein's monster",
		"The Joker",
		"It was obviously Tony Stark's evil twin. Duh.",
		"Sandra Bullock :D",
		"Johnny Bravo uhuh huh",
		"Kurt Cobain is the only one that ever did it for me *bites lip*",
		"Morgan Freeman, I think. He was wearing a cloak and cowboy boots.",
		"The talking meerkat from those commercials, simples",
		"Homer Simpson",
		"A fireman",
		"A social worker from China.",
		"The culprit? My fingers",
		"Jackie Chan of course",
		"Kevin Costner",
		"Del Boy from Only Fools and Horses :]",
		"Not sure, but I know they had an underscore at the end of their name",
		"Someone with big boobs",
		"A lorry driver from Tennessee",
		"My waifu :)",
		"Jo Brand",
		"Ricky Gervais",
		"The Germans!",
		"The Spanish!",
		"Probably Americans",
		"Only the Japanese",
		"I swear it was a living teapot. It talked to me!",
		"Ayanami Rei",
		"Buffy the Vampire Slayer",
		"The blue chick from Farscape",
		"It can only be Nagisa",
		"There can only be one...",
		"You'll probably call me crazy, but I swear it's the lizard men living on the moon, monitoring our thoughts",
		"Aliens from outer space!",
		"Biker Mice From Mars :D"
	], which = [
		"The one that smells best",
		"The one that doesn't involve you!",
		"On the weekend, I'd usually choose the latter. But right now, I'm feeling kinky...",
		"Whichever is dirtier",
		"Whichever doesn't give me a rash",
		"I pretty much have no opinion on that, but if I were to choose, I'd say Lunatrius' butt",
		"The one with the more sordid connotations",
		lib.randSelect(config.local_whippingboys) + " soup",
		"My next door neighbour gave me the former, once. I couldn't walk straight for a week",
		"If it involves Rule 63, that",
		"For the last time, you are _NOT_ getting into my pants! (tonight)",
		"Either... that's just how I swing. #yolo",
		"Hahahahaha.... Wait, you're serious?",
		"L to the E to the W to the D"
	], where = [
		"In " + lib.randSelect(config.local_whippingboys) + "'s box",
		"On the film set of ranma's home made porno",
		"Probably with my dog",
		"Better ask " + lib.randSelect(config.local_whippingboys) + " as they were playing with it in their bedroom last",
		"In my ear :)",
		"Over the rainbow, obviously",
		"In the matrix",
		"Near the Great Pyramid; X marks the spot!",
		"In the gypsy camp I spent the summer running around naked in",
		"Unda da sea~"
	], when = [
		"In the dead of the night, when " + lib.randSelect(config.local_whippingboys) + " is fapping to tohou",
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
		lib.randSelect(config.local_whippingboys) + " made me",
		"... " + lib.randSelect(config.local_whippingboys) + " did it!",
		"The chocobos wark'd really loudly at me",
		"I swallowed it by accident",
		"Probably because you're an idiot",
		"Y-Yeah " + lib.randSelect(config.local_whippingboys) + ", why?",
		"I was feeling horny... and " + lib.randSelect(config.local_whippingboys) + " was just standing there!",
		"Because it had to be done.",
		"Because everyone loves kneesocks, obviously",
		"Hee hee :3",
		"Because I'd secretly love to make out with " + lib.randSelect(config.local_whippingboys),
		"There's probably a good explanation, but I'm too busy slaving over a hot stove for all these lazy bastards",
		"Because that's what all the cool bots told me"
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
		"I use " + lib.randSelect(config.local_whippingboys) + " as a substitute.",
		"Rum pum pum pum~",
		"I just get really hot. So hot. Please don't take advantage of me.",
		"I use latex.",
		"When I can't find a suitable person, I turn to my 'massager'",
		"S-So what if I have small ones..."
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
		"ahuh", "ahuh.", "ahuh!", "mhm",
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
		"My magic 8-ball and I both agree that the answer is probably maybe. Maybe.",
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
		"If you would you could you should you into " + lib.randSelect(config.local_whippingboys) + "?",
		"I like your shoes",
		"you got a purdy mouth",
		"What do you think?",
		"If you asked me last year, I would have said definitely not, but since I experienced the wonders of battery operated 'tools', I have changed my mind",
		";~;", "o_O", "O_o", "...", ". . .", "wtf", "D:", ":D", ":>", ">:("
	];

	return function innerQuestionReply(question) {
		question = question.toLowerCase();

		switch (question) {
		case "what":
			return lib.randSelect(what);
		case "who":
			return lib.randSelect(who);
		case "where":
			return lib.randSelect(where);
		case "when":
			return lib.randSelect(when);
		case "which":
			return lib.randSelect(which);
		case "why":
			return lib.randSelect(why);
		case "how":
			return lib.randSelect(how);
		case "do":
		case "is":
			return lib.randSelect(yn);
		default:
			return lib.randSelect(yn);
		}
	};
}());

function checkDeny(context) {
	var entry = denyDB.getOne(context);
	if (entry !== undefined) {
		entry = null;
		return false;
	}
	return true;
}

bot.command({
	command: "actback",
	admin: true,
	help: "Allows or denies actbacks in the channel.",
	syntax: config.command_prefix+"actback [#channel] <on/off> - Example: "+config.command_prefix+"actback #roleplay off",
	callback: function (input) {
		var reg, target;
		if (!input.args) {
			if (checkDeny(input.context.toLowerCase()))
				irc.say(input.context, "actback is allowed here.");
			else
				irc.say(input.context, "actback is denied here.");
			return;
		}
		if (input.args[0][0] === "#") {
			target = input.args[0].toLowerCase();
			if (!input.args[1]) {
				if (checkDeny(target)) irc.say(input.context, "actback is allowed in "+target+".");
				else irc.say(input.context, "actback is denied in "+target+".");
				return;
			}
			input.data = input.args.slice(1).join(" ");
		} else {
			target = input.context;
		}
		reg = /(on|off)/i.exec(input.data.trim().toLowerCase());
		if (!reg) {
			irc.say(input.context, bot.cmdHelp("actback", "syntax"));
			return;
		}
		if (reg[0] === "on") {
			if (!checkDeny(target)) {
				denyDB.removeOne(target);
				irc.say(input.context, "actback is now permitted "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
				return;
			}
			irc.say(input.context, "actback is already permitted "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
		} else {
			if (!checkDeny(target)) {
				irc.say(input.context, "actback is already forbidden "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
				return;
			}
			denyDB.saveOne(target, { deny: true });
			irc.say(input.context, "actback is now forbidden "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
		}
	}
});

bot.event({
	handle: "actback",
	event: "PRIVMSG",
	regex: regexFactory.actionMatching(config.nickname),
	callback: function (input) {
		var stats, randReply, tmp, suppVars, randThings, randReplies, nicks, args, verb, verbs, verbed, verbing,
			radv, randVerb, randVerbs, randVerbed, randVerbing, obj, randThing, method, reg, adv,
			parses = 3;

		if (!checkDeny(input.context.toLowerCase())) return; // not allowed to speak there

		randThings = randDB.getAll();
		randReplies = repliesDB.getAll();
		nicks = (input.context[0] === "#" ? ial.Active(input.context).filter(function (nick) { return (nick !== input.nick); }) : []);
		nicks = (nicks.length > 0 ? nicks : [
			"someone", "Spiderman", "Iron Man", "Orgasmo", "Invader Zim", "Jo Brand", "Stephen Fry", "David Mitchell", "Lee Mack", "Joffrey",
			"Hillary Clinton", "Solid Snake", "Kirby", "a wild Jigglypuff", "Steve Holt", "Bob Loblaw",
			(config.local_whippingboys && Array.isArray(config.local_whippingboys) && config.local_whippingboys.length > 0 ?
				lib.randSelect(config.local_whippingboys) :
				"the local whipping boy")
		]);
		args = input.match[0].slice(8,-1).split(" ");
		verb = args[0];
		adv = "";
		radv = (lib.chance() ? words.adverb.random() : "");
		randVerb = words.verb.random().base;
		randVerbs = words.verb.random().s;
		randVerbed = words.verb.random().ed;
		randVerbing = words.verb.random().ing;
		obj = transformObj(args, 2);
		randThing = lib.randSelect(randThings);
		method = lib.randSelect([ "say", "action"]);

		if (radv) {
			randVerb = radv + " " + randVerb;
			randVerbs = radv + " " + randVerbs;
			randVerbed = radv + " " + randVerbed;
			randVerbing = radv + " " + randVerbing;
		}
		if (verb.indexOf("\"") > -1) verb = verb.replace(/\"/g, "");
		if (verb.slice(-2) === "ly") {
			if (words.adverb.get(verb) !== verb && config.api.wordnik) {
				words.lookup("adverb", verb);
			}
			adv = args[1] + " ";
			verb = args[2];
		}
		tmp = words.verb.get(verb);
		if (tmp) {
			verbs = tmp.s;
			verbed = tmp.ed;
			verbing = tmp.ing;
			verb = tmp.base;
			tmp = null;
		} else {
			if (config.api.wordnik) {
				words.lookup("verb", verb);
			}
			if (verb.slice(-3) === "hes") {
				verb = verb.slice(0, -2); // "touches" vs. "acquires"
			} else if (verb.slice(-1) === "s") {
				verb = verb.slice(0, -1);
			}
			verbs = verb + "s";
			verbed = verb + "ed";
			verbing = verb + "ing";
		}
		suppVars = {
			"{from}": input.nick,
			"{context}": input.context,
			"{randThing}": randThing,
			"{randNick}": lib.randSelect(nicks),
			"{whippingBoy}": lib.randSelect(config.local_whippingboys),
			"{verb}": adv + verb,
			"{verbs}": adv + verbs,
			"{verbed}": adv + verbed,
			"{verbing}": adv + verbing,
			"{adverb}": words.adverb.random(),
			"{adjective}": words.adjective.random(),
			"{noun}": words.noun.random().base,
			"{nouns}": words.noun.random().s,
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
		stats = statsDB.getOne(verbs) || 0;
		statsDB.saveOne(verbs, (stats+1));
		randReply = lib.supplant(randReply, suppVars);
		reg = new RegExp(Object.keys(suppVars).join("|"));
		while (randReply.match(reg) && parses) {
			parses--;
			randReply = lib.supplant(randReply, suppVars);
		}
		setTimeout(function () {
			irc[method](input.context, randReply);
		}, getWpm(randReply));
	}
});

bot.event({
	handle: "actbackquestion",
	event: "PRIVMSG",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :(?:(?:(?:"+
		regexFactory.matchAny(config.nickname)+
		"[,:]\\s)(\\w+).+)|(?:(\\w+).+)"+
		regexFactory.matchAny(config.nickname)+
		")!?\\?!?$", "i"),
	callback: function (input) {
		var m, rep;
		if (!checkDeny(input.context.toLowerCase())) return; // not allowed to speak there

		m = input.match[1] || input.match[2];
		rep = questionReply(m);

		setTimeout(function () {
			irc.say(input.context, rep);
		}, getWpm(rep));
	}
});
