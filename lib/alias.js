"use strict";
var argsDone = false,
	varParseLimit = 3;

function magicInputFondler(text) {
	if (text.indexOf("|") > -1)
		return text.replace(/\|/g, "℅");
	return text;
}

module.exports = function (lib, config, ial, words, varDB, randDB) {
	function getWhippingBoy() {
		if (config.local_whippingboys && Array.isArray(config.local_whippingboys) && config.local_whippingboys.length)
			return lib.randSelect(config.local_whippingboys);
		return "the local whipping boy";
	}

	function randNick(context, from) {
		var nicks, index;
		if (context[0] === "#") {
			nicks = ial.Active(context);
			index = nicks.indexOf(from);
			if (index > -1)
				nicks.splice(index, 1);
		}
		if (!nicks.length) {
			nicks = [
				"someone", "Spiderman", "Iron Man", "Orgasmo", "Invader Zim", "Jo Brand", "Stephen Fry", "David Mitchell",
				"Lee Mack", "Joffrey", "Hillary Clinton", "Solid Snake", "Kirby", "a wild Jigglypuff", "Steve Holt",
				"Bob Loblaw", getWhippingBoy()
			];
		}
		return lib.randSelect(nicks);
	}

	function replaceSingleVar(match, context, from) {
		var tmp, variable;
		switch (match) {
		case "{me}": return magicInputFondler(config.nick);
		case "{from}": return magicInputFondler(from);
		case "{whippingBoy}": return magicInputFondler(lib.randSelect(config.local_whippingboys));
		case "{channel}": return magicInputFondler(context);
		case "{randThing}": return lib.randSelect(randDB.getAll());
		case "{randNick}": return magicInputFondler(randNick(context, from));
		case "{verb}": return words.verb.random().base;
		case "{verbs}": return words.verb.random().s;
		case "{verbed}": return words.verb.random().ed;
		case "{verbing}": return words.verb.random().ing;
		case "{adverb}": return words.adverb.random();
		case "{adjective}": return words.adjective.random();
		case "{noun}": return words.noun.random().base;
		case "{nouns}": return words.noun.random().s;
		case "{pronoun}": return words.pronoun.random();
		case "{personalPronoun}": return words.personalPronoun.random();
		case "{possessivePronoun}": return words.possessivePronoun.random();
		case "{preposition}": return words.preposition.random();
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
			// must be a variable name, or jibberish.
			variable = match.toLowerCase();
			if (varDB.hasOne(variable))
				return varDB.getOne(variable).data;
		}
		return match;
	}

	function replaceVars(args, context, from, line) {
		var reg, tmp;
		// shoo args!
		varParseLimit--;
		if (!argsDone) {
			if (line.indexOf("{args") > -1) {
				if (line.indexOf("{args*}") > -1) line = line.replace(/\{args\*\}/g, args.join(" "));
				if (line.indexOf("{args1}") > -1) line = line.replace(/\{args1\}/g, (args && args.length > 0 ? args[0] : ""));
				if (line.indexOf("{args2}") > -1) line = line.replace(/\{args2\}/g, (args && args.length > 1 ? args[1] : ""));
				if (line.indexOf("{args3}") > -1) line = line.replace(/\{args3\}/g, (args && args.length > 2 ? args[2] : ""));
				if (line.indexOf("{args4}") > -1) line = line.replace(/\{args4\}/g, (args && args.length > 3 ? args[3] : ""));
				if (line.indexOf("{args1*}") > -1) line = line.replace(/\{args1\*\}/g, (args && args.length > 0 ? args.join(" ") : ""));
				if (line.indexOf("{args2*}") > -1) line = line.replace(/\{args2\*\}/g, (args && args.length > 1 ? args.slice(1).join(" ") : ""));
				if (line.indexOf("{args3*}") > -1) line = line.replace(/\{args3\*\}/g, (args && args.length > 2 ? args.slice(2).join(" ") : ""));
				if (line.indexOf("{args4*}") > -1) line = line.replace(/\{args4\*\}/g, (args && args.length > 3 ? args.slice(3).join(" ") : ""));
			}
			argsDone = true;
		}
		tmp = line;
		while ((reg = /(\{[^\{\|\(\)\[\]\} ]+\})/.exec(tmp))) {
			line = line.replace(reg[1], replaceSingleVar(reg[1], context, from));
			tmp = tmp.slice(tmp.indexOf(reg[1])+reg[1].length);
		}
		if (varParseLimit > 0 && line.match(/\{[^\[\(\|\)\] ]+\}/))
			line = replaceVars(args, context, from, line);
		else {
			varParseLimit = 3;
			argsDone = false;
		}
		return lib.singleSpace(line);
	}

	return {
		syntax: function syntax(alias, arglen, help) {
			if (help && help.arglen && help.arglen > arglen) {
				if (help.syntax)
					return "[Help] Alias syntax: "+config.command_prefix+alias+" "+help.syntax;
				return "[Help] Alias \""+alias+"\" has a minimum argument length of "+help.arglen;
			}
		},
		transform: function transform(line, command, alias, aliasArgs) {
			var context, nick;
			nick = line.slice(1, line.indexOf("!"));
			context = line.slice(line.indexOf("PRIVMSG ")+8);
			context = context.slice(0, context.indexOf(" "));
			line = line.slice(0, line.indexOf(" :")+3)+alias;
			if (aliasArgs.indexOf("|") > -1 && !aliasArgs.match(/\{\((.*\|?)\)\}|\{\[(.*\|?)\]\}/))
				aliasArgs = aliasArgs.replace(/\|/g, "℅");
			aliasArgs = aliasArgs.split(" ");
			line = replaceVars(aliasArgs, context, nick, line);
			if (line.match(/\{\((.*\|?)\)\}/))
				line = lib.parseVarList(line);
			if (line.match(/\{\[(.*\|?)\]\}/))
				line = lib.molest(line);
			if (line.indexOf("℅") > -1)
				line = line.replace(/℅/g, "|");
			return line;
		}
	};
};
