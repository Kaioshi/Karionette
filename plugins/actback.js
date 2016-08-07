"use strict";
const [DB, web, lib, setTimeout, words, ial] = plugin.importMany("DB", "web", "lib", "setTimeout", "words", "ial"),
	randDB = new DB.List({filename: "randomThings"}),
	denyDB = new DB.Json({filename: "actback/deny"}),
	statsDB = new DB.Json({filename: "actback/stats"}),
	repliesDB = new DB.Json({filename: "actback/replies"}),
	questionDB = new DB.Json({filename: "actback/questions"});
let varParseLimit = 3;

function getWpm(line) {
	return Math.floor((line.length / 5.0) * 1000);
}

function sayNocontext(context) {
	web.json("https://www.reddit.com/r/nocontext/random/.json").then(function (result) {
		let target = "",
			line = lib.decode(result[0].data.children[0].data.title);
		if (context[0] === "#" && lib.chance() > 50) {
			target = ial.Active(context);
			if (target.length)
				target = lib.randSelect(target)+", ";
		}
		setTimeout(function () {
			irc.say(context, target+line);
		}, getWpm(line));
	}).catch(function (error) {
		logger.error("[sayNocontext] "+error, error);
	});
}

function transformObj(line) {
	let me = config.nick.toLowerCase(),
		args = line.toLowerCase().split(" "),
		nonObjs = [ me, me+"s", me+"'s", "in", "on", "a", "an", "the", "some",
			"upon", "atop", "one", "loads", "lot", "of", "all", "his", "their", "with", "her" ];
	for (let i = 0; i < args.length; i++) { // return the first nonObj
		if (!args[i].length || nonObjs.indexOf(args[i]) > -1)
			continue;
		return args[i];
	}
	return null;
}

function questionReply(question) {
	let q = question.toLowerCase(),
		answer = questionDB.getOne(q);
	if (answer)
		return lib.randSelect(answer);
	return lib.randSelect(questionDB.getOne("yn"));
}

bot.command({
	command: "actback",
	admin: true,
	help: "Allows or denies actbacks in the channel.",
	syntax: config.command_prefix+"actback [#channel] <on/off> - Example: "+config.command_prefix+"actback #roleplay off",
	callback: function (input) {
		let reg, target;
		if (!input.args) {
			if (denyDB.hasOne(input.context.toLowerCase()))
				irc.say(input.context, "actback is allowed here.");
			else
				irc.say(input.context, "actback is denied here.");
			return;
		}
		if (input.args[0][0] === "#") {
			target = input.args[0].toLowerCase();
			if (!input.args[1]) {
				if (denyDB.hasOne(target))
					irc.say(input.context, "actback is allowed in "+target+".");
				else
					irc.say(input.context, "actback is denied in "+target+".");
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
			if (!denyDB.hasOne(target)) {
				denyDB.removeOne(target);
				irc.say(input.context, "actback is now permitted "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
				return;
			}
			irc.say(input.context, "actback is already permitted "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
		} else {
			if (!denyDB.hasOne(target)) {
				irc.say(input.context, "actback is already forbidden "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
				return;
			}
			denyDB.saveOne(target, { deny: true });
			irc.say(input.context, "actback is now forbidden "+(target === input.context.toLowerCase() ? "here." : "in "+target+"."));
		}
	}
});

function replaceVars(line, context, from, obj, verb) {
	let reg, tmp;
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
	let tmp;
	switch (match) {
	case "{me}": return magicInputFondler(config.nick);
	case "{from}": return magicInputFondler(from);
	case "{whippingBoy}": return magicInputFondler(lib.randSelect(config.local_whippingboys));
	case "{channel}": return magicInputFondler(context);
	case "{randThing}": return randDB.random();
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
	case "{obj}": return obj || randDB.random();
	default: // parse {#2-39} random number thing.
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
	let nicks, index;
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

function actionMatching(input) { // this regex took over an hour. I hate you, regex. I love you, regex.
	const match = new RegExp("(.*) ("+config.nick+")(?:\\S|\\'s|,|\\!)?(?!\\S) ?(.*)", "i")
		.exec(input.message.slice(8,-1));
	if (match) {
		input.match = match;
		return true;
	}
}

bot.event({
	handle: "actback",
	event: "PRIVMSG",
	condition: function (input) {
		if (input.message.indexOf("\x01ACTION") === -1) // \x01ACTION
			return false;
		if (input.message.toLowerCase().indexOf(config.nick.toLowerCase()) === -1)
			return;
		if (denyDB.hasOne(input.context.toLowerCase()))
			return false;
		return actionMatching(input); // doing this in a function so the regex updates w/nick changes
	},
	callback: function (input) {
		if (Math.random()*100 <= 20) {
			sayNocontext(input.context);
			return;
		}
		const args = input.match[0].split(" "),
			obj = input.match[3] && input.match[3].length ? transformObj(input.match[3]) : null,
			method = lib.randSelect([ "say", "action"]);
		let verb = args[0],
			modverb, tmp, stats, randReply, line;
		if (verb.indexOf("\"") > -1)
			verb = verb.replace(/\"/g, "");
		// Check for adverb
		if (verb.slice(-2) === "ly") {
			if (words.adverb.get(verb) !== verb && config.api.wordnik)
				words.lookup("adverb", verb);
			modverb = args[0].slice(0, -2);
			verb = args[1];
		}
		tmp = words.verb.get(verb);
		if (tmp)
			verb = tmp;
		else {
			if (config.api.wordnik)
				words.lookup("verb", verb);
			if (verb.slice(-3) === "hes")
				verb = verb.slice(0, -2); // "touches" vs. "acquires"
			else if (verb.slice(-1) === "s")
				verb = verb.slice(0, -1);
			verb = { base: verb, s: verb+"s", ed: verb+"ed", ing: verb+"ing" };
		}
		const altVerbs = repliesDB.getOne("alts")[verb.s] || false;
		if (!repliesDB.hasOne(verb.s) && !altVerbs)
			randReply = lib.randSelect(repliesDB.getOne("defa")[method]);
		else {
			if (altVerbs !== false)
				verb.s = altVerbs;
			randReply = lib.randSelect(repliesDB.getOne(verb.s)[method]);
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

function questionMatching(input) {
	const match = new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :(?:(?:(?:"+config.nick+
		"[,:]\\s)(\\w+).+)|(?:(\\w+).+)"+config.nick+")!?\\?!?$", "i")
		.exec(input.raw);
	if (match) {
		input.match = match;
		return true;
	}
}

bot.event({
	handle: "actbackQuestion",
	event: "PRIVMSG",
	condition: function (input) {
		if (input.message.indexOf("?") === -1)
			return false;
		if (input.message.toLowerCase().indexOf(config.nick.toLowerCase()) === -1)
			return false;
		if (denyDB.hasOne(input.context.toLowerCase()))
			return false;
		return questionMatching(input);
	},
	callback: function (input) {
		let context = input.context,
			m = input.match[1] || input.match[2],
			rep = replaceVars(questionReply(m), input.context, input.nick);
		setTimeout(function () {
			irc.say(context, rep);
		}, getWpm(rep));
	}
});
