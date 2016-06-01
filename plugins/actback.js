"use strict";
var regexFactory = require("./lib/regexFactory.js"),
	randDB = new DB.List({filename: "randomThings"}),
	denyDB = new DB.Json({filename: "actback/deny"}),
	statsDB = new DB.Json({filename: "actback/stats"}),
	repliesDB = new DB.Json({filename: "actback/replies"}),
	varParseLimit = 3;

function getWpm(line) {
	return Math.floor((line.length / 5.0) * 1000);
}

function sayNocontext(context) {
	web.atom2json("https://www.reddit.com/r/nocontext/random/.rss").then(function (results) {
		let line = lib.randSelect(ial.Active(context))+": "+lib.decode(results.items[0].title);
		setTimeout(function () {
			irc.say(context, line);
		}, getWpm(line));
	}).catch(function (error) {
		logger.error("[sayNocontext] "+error, error);
	});
}

function transformObj(args, num) {
	var me = (config.nick ? config.nick : config.nickname[0]),
		nonObjs = [ me, me+"s", me+"'s", "a", "an", "the", "some", "one", "loads", "lot", "of", "all", "his", "their", "with", "her" ],
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

function replaceVars(line, context, from, obj, verb) {
	var reg, tmp;
	varParseLimit--;
	tmp = line;
	while ((reg = /(\{[^\{\|\(\)\[\]\} ]+\})/.exec(tmp))) {
		line = line.replace(reg[1], replaceSingleVar(reg[1], context, from, obj, verb));
		tmp = tmp.slice(tmp.indexOf(reg[1]) + reg[1].length);
	}
	if (varParseLimit > 0 && line.match(/\{[^\[\(\|\)\] ]+\}/))
		line = replaceVars(line, context, from, obj, verb);
	else
		varParseLimit = 3;
	return lib.singleSpace(line);
}

function adverb(verb) {
	if (lib.chance() > 50)
		return words.adverb.random()+" "+verb;
	return verb;
}

function replaceSingleVar(match, context, from, obj, verb, modverb) {
	var tmp;
	switch (match) {
	case "{me}": return magicInputFondler(config.nick);
	case "{from}": return magicInputFondler(from);
	case "{whippingBoy}": return magicInputFondler(lib.randSelect(config.local_whippingboys));
	case "{channel}": return magicInputFondler(context);
	case "{randThing}": return lib.randSelect(randDB.getAll());
	case "{randNick}": return magicInputFondler(randNick(context, from));
	case "{randVerb}": return adverb(words.verb.random().base);
	case "{verb}": return verb.base;
	case "{randVerbs}": return adverb(words.verb.random().s);
	case "{verbs}": return verb.s;
	case "{randVerbed}": return adverb(words.verb.random().ed);
	case "{verbed}": return verb.ed;
	case "{randVerbing}": return adverb(words.verb.random().ing);
	case "{verbing}": return verb.ing;
	case "{modverb}": return modverb || words.adjective.random();
	case "{adverb}": return words.adverb.random();
	case "{adjective}": return words.adjective.random();
	case "{noun}": return words.noun.random().base;
	case "{nouns}": return words.noun.random().s;
	case "{pronoun}": return words.pronoun.random();
	case "{personalPronoun}": return words.personalPronoun.random();
	case "{possessivePronoun}": return words.possessivePronoun.random();
	case "{preposition}": return words.preposition.random();
	case "{obj}": return obj;
	default:
		// parse {#2-39} random number thing.
		if (match[1] === "#") {
			tmp = /\{#(\d+)\-(\d+)\}/.exec(match);
			if (tmp) {
				tmp[1] = parseInt(tmp[1], 10);
				tmp[2] = parseInt(tmp[2], 10);
				if (tmp[1] >= tmp[2])
					return "{#Min-Max--MinNeedsToBeLowerThanMax}";
				return lib.randNum(tmp[1], tmp[2]).toString();
			}
		}
	}
	return match;
}

function randNick(context, from) {
	var nicks, index;
	if (context[0] === "#") {
		nicks = ial.Active(context);
		index = nicks.indexOf(from);
		if (index > -1)
			nicks.splice(index, 1);
	}
	if (nicks === undefined || !nicks.length) {
		nicks = [
			"someone", "Spiderman", "Iron Man", "Orgasmo", "Invader Zim", "Jo Brand", "Stephen Fry", "David Mitchell",
			"Lee Mack", "Joffrey", "Hillary Clinton", "Solid Snake", "Kirby", "a wild Jigglypuff", "Steve Holt",
			"Bob Loblaw", getWhippingBoy()
		];
	}
	return lib.randSelect(nicks);
}

function getWhippingBoy() {
	if (config.local_whippingboys && Array.isArray(config.local_whippingboys) && config.local_whippingboys.length)
		return lib.randSelect(config.local_whippingboys);
	return "the local whipping boy";
}

function magicInputFondler(text) {
	if (text.indexOf("|") > -1)
		return text.replace(/\|/g, "℅");
	return text;
}

bot.event({
	handle: "actback",
	event: "PRIVMSG",
	condition: function (input) {
		if (input.message.indexOf("\x01") === -1) // \x01ACTION
			return false;
		if (denyDB.hasOne(input.context.toLowerCase()))
			return false;
		return lib.stringContainsAny(input.message, config.nicks, true);
	},
	regex: regexFactory.actionMatching(config.nickname),
	callback: function (input) {
		var line, stats, randReply, tmp, randReplies,
			args, verb, obj, method, modverb;

		if (Math.random()*100 <= 20) {
			sayNocontext(input.context);
			return;
		}
		randReplies = repliesDB.getAll();
		args = input.match[0].slice(8,-1).split(" ");
		verb = args[0];
		obj = transformObj(args, 2);
		method = lib.randSelect([ "say", "action"]);
		if (verb.indexOf("\"") > -1) verb = verb.replace(/\"/g, "");
		// Check for adverb
		if (verb.slice(-2) === "ly") {
			if (words.adverb.get(verb) !== verb && config.api.wordnik) {
				words.lookup("adverb", verb);
			}
			modverb = args[0].slice(0, -2);
			verb = args[1];
		}
		tmp = words.verb.get(verb);
		if (tmp) {
			verb = tmp;
		} else {
			if (config.api.wordnik) {
				words.lookup("verb", verb);
			}
			if (verb.slice(-3) === "hes") {
				verb = verb.slice(0, -2); // "touches" vs. "acquires"
			} else if (verb.slice(-1) === "s") {
				verb = verb.slice(0, -1);
			}
			verb = { base: verb, s: verb+"s", ed: verb+"ed", ing: verb+"ing" };
		}
		if (!randReplies[verb.s] && !randReplies.alts[verb.s]) {
			randReply = lib.randSelect(randReplies.defa[method]);
		} else {
			if (randReplies.alts[verb.s]) {
				verb.s = randReplies.alts[verb.s];
			}
			randReply = lib.randSelect(randReplies[verb.s][method]);
		}
		stats = statsDB.getOne(verb.s) || 0;
		statsDB.saveOne(verb.s, (stats+1));
		line = replaceVars(randReply, input.context, input.nick, obj, verb, modverb);
		if (line.match(/\{\((.*\|?)\)\}/))
			line = lib.parseVarList(line);
		if (line.match(/\{\[(.*\|?)\]\}/))
			line = lib.molest(line);
		if (line.indexOf("℅") > -1)
			line = line.replace(/℅/g, "|");
		setTimeout(function () {
			irc[method](input.context, line);
		}, getWpm(line));
	}
});

bot.event({
	handle: "actbackQuestion",
	event: "PRIVMSG",
	condition: function (input) {
		if (input.message.indexOf("?") === -1)
			return false;
		if (denyDB.hasOne(input.context.toLowerCase()))
			return false;
		return lib.stringContainsAny(input.message, config.nickname, true);
	},
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :(?:(?:(?:"+
		regexFactory.matchAny(config.nickname)+
		"[,:]\\s)(\\w+).+)|(?:(\\w+).+)"+
		regexFactory.matchAny(config.nickname)+
		")!?\\?!?$", "i"),
	callback: function (input) {
		var m, rep;

		m = input.match[1] || input.match[2];
		rep = questionReply(m);

		setTimeout(function () {
			irc.say(input.context, rep);
		}, getWpm(rep));
	}
});
