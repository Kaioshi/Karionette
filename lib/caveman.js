"use strict";
require("./funcs.js");
var DB = require("./fileDB.js"),
	ignoreLoaded, ignoreCache,
	aliasDB = new DB.Json({filename: "alias/alias", queue: true}),
	varDB = new DB.Json({filename: "alias/vars", queue: true}),
	ignoreDB = new DB.List({filename: "ignore", queue: true}),
	randDB = new DB.List({filename: "randomThings", queue: true}),
	regexFactory = require('./regexFactory.js'),
	argsDone = false,
	varParseLimit = 2;

function checkIgnored(input) {
	var i,
		user = input.slice(1, input.indexOf(" "));
	// fast path! :D
	if (ignoreCache[user] !== undefined) {
		return ignoreCache[user];
	}
	// slow path. :<
	for (i = 0; i < caveman.ignored.length; i++) {
		if (ial.maskMatch(user, caveman.ignored[i])) {
			ignoreCache[user] = true;
			return true;
		}
	}
	ignoreCache[user] = false;
	return false;
}

global.caveman = {
	emitEvent: function (input) {
		var data, type, i, params,
			permission = true;
		input = input.trim();
		logger.filter(input);
		if (ignoreDB.size() > 0 && checkIgnored(input)) {
			return; // ignored
		}
		params = { raw: input };
		input = input.split(" ");
		if (input[0][0] === ":") {
			type = input[1];
			if (type === "PRIVMSG") {
				params.command = getCommand(input);
				if (params.command) {
					if (params.command[0] === "alias") {
						if (!perms.Check(input[0].slice(1), "alias", params.command[1])) {
							permission = false;
						}
						params.raw = transformAlias(params.raw, params.command[1]);
						input = params.raw.split(" ");
						params.command = input[3].slice(2);
					} else {
						if (params.command[2] === 4) {
							params.data = input.slice(4).join(" ");
							params.args = input.slice(5);
						}
						params.command = params.command[1];
					}
				}
			}
		} else {
			type = input[0]; // Y U NO :, PING
		}
		// fill in mojojojo
		if (input[0].indexOf("!") > -1) {
			params.nick = input[0].slice(1, input[0].indexOf("!"));
			params.address = input[0].slice(input[0].indexOf("!")+1);
			params.user = input[0].slice(1);
			params.context = (input[2][0] !== ":" ? input[2] : input[2].slice(1));
			if (!params.data) {
				params.data = params.raw.slice(params.raw.indexOf(" :")+2);
			}
			if (params.context[0] !== "#") {
				params.context = params.nick;
			} else {
				params.channel = params.context;
			}
		} else if (type !== "PING") {
			params.server = input[0].slice(1);
		}
		
		switch (type) {
			case "PRIVMSG":
				params.message = input.slice(3).join(" ").slice(1);
				if (params.command) {
					if (caveman.commands
						&& caveman.commands[params.command]
						&& caveman.commands[params.command].admin
						&& !userLogin.isAdmin(params.user)) {
							logger.warn("Denied "+params.nick+" access to admin-only command "+params.command);
							mari.say(params.context, "Bitch_, please.");
					} else {
						if (!params.args) params.args = input.slice(4);
						params.data = params.data.slice(params.data.indexOf(" ")+1);
						if (params.args.length === 0) delete params.args;
						if (caveman.cmdAliases && caveman.cmdAliases[params.command]) {
							params.command = caveman.cmdAliases[params.command];
						}
						if (permission) {
							lib.events.emit("Command: "+params.command, params);
						} else {
							mari.say(params.context, "You don't have permission to do that.");
						}
					}
				}
				break;
			case "PING":
				params.challenge = input[1].slice(1);
				break;
			case "MODE":
				params.mode = (input[3][0] !== ":" ? input[3] : input[3].slice(1));
				params.affected = input.slice(4).join(" ");
				break;
			case "TOPIC":
				params.topic = input.slice(3).join(" ").slice(1);
				break;
			case "PART":
				params.reason = (input[3] ? input.slice(3).join(" ").slice(1) : "");
				break;
			case "NICK":
				params.newnick = input[2].slice(1);
				break;
			case "QUIT":
				params.reason = input.slice(2).join(" ").slice(1);
				break;
			case "KICK":
				params.kicked = input[3];
				params.reason = input.slice(4).join(" ").slice(1);
				break;
		}
		// check for and emit complex events
		if (caveman.eventRegexes && caveman.eventRegexes[type]) {
			for (i = 0; i < caveman.eventRegexes[type].length; i++) {
				params.match = caveman.eventRegexes[type][i][1].exec(params.raw);
				if (params.match) {
					lib.events.emit("Event: "+caveman.eventRegexes[type][i][0]+" "+type, params);
				}
			}
			if (!params.match) delete params.match;
		}
		lib.events.emit("Event: " + type, params);
		params = null;
	},
	commandListen: function (command) {
		var trigger, i;
		if (!(command.command && command.help && command.callback)) {
			logger.error("Incorrect caveman.commandListen format - need at least a command, help and callback.");
			return;
		}
		if (Array.isArray(command.command)) {
			if (command.command.length === 1) {
				command.command = command.command[0];
			} else {
				if (!caveman.cmdAliases) caveman.cmdAliases = {};
				for (i = 1; i < command.command.length; i++) {
					caveman.cmdAliases[command.command[i]] = command.command[0];
				}
				command.command = command.command[0];
			}
		}
		trigger = "Command: "+command.command;
		// check for and remove dupes
		if (caveman.commands[command.command]) {
			lib.events.removeListener(trigger, lib.events.listeners(trigger)[0]); // there can be oonly oneee
			delete caveman.commands[command.command];
		}
		caveman.commands[command.command] = {
			id: command.command,
			help: command.help
		};
		if (command.admin) caveman.commands[command.command].admin = command.admin;
		if (command.syntax) caveman.commands[command.command].syntax = command.syntax;
		if (command.options) caveman.commands[command.command].options = command.options;
		lib.events.on(trigger, command.callback);
	},
	eventListen: function (event) {
		var i, events, funcStr, dupe, trigger;
		if (!(event.event && event.handle && event.callback)) {
			logger.error("Incorrect caveman.eventListen format - need at least an event, handle and callback.");
			return;
		}
		funcStr = event.callback.toString().replace(/\n|\t| /g, "");
		// register as a vanilla event or regex based
		if (event.regex) {
			trigger = "Event: "+event.handle+" "+event.event;
			if (!caveman.eventRegexes) caveman.eventRegexes = {};
			if (!caveman.eventRegexes[event.event]) caveman.eventRegexes[event.event] = [];
			// dupe check
			dupe = false;
			for (i = 0; i < caveman.eventRegexes[event.event].length; i++) {
				if (caveman.eventRegexes[event.event][i][0] === event.handle) {
					dupe = true;
					caveman.eventRegexes[event.event][i][1] = event.regex;
				}
			}
			if (!dupe) {
				caveman.eventRegexes[event.event].push( [ event.handle, event.regex ] );
			}
		} else {
			trigger = "Event: "+event.event;
		}
		// check for and remove dupes
		if (caveman.events[event.handle]) {
			events = lib.events.listeners(trigger);
			for (i = 0; i < events.length; i++) {
				if (events[i].toString().replace(/\n|\t| /g, "") === caveman.events[event.handle].func) {
					lib.events.removeListener(trigger, events[i]);
				}
			}
			delete caveman.events[event.handle];
		}
		caveman.events[event.handle] = {
			id: event.handle,
			func: funcStr
		};
		lib.events.on(trigger, event.callback);
	},
	cmdExists: function (command) {
		if (caveman.commands[command]) return true;
		if (caveman.cmdAliases[command]) return true;
	},
	cmdHelp: function (command, type) {
		if (type !== "help" && type !== "syntax" && type !== "options") {
			logger.error("Tried to get non-existant help type "+type+" for command "+command);
		} else {
			if (caveman.cmdAliases[command]) {
				command = caveman.cmdAliases[command];
			}
			if (caveman.commands[command] && caveman.commands[command][type]) {
				return "[Help] "+caveman.commands[command][type];
			}
		}
	},
	cmdList: function () {
		return Object.keys(caveman.commands);
	},
	ignore: function (target) { // moving this here since this is the only place that pokes it.
		if (!caveman.ignored.some(function (entry) { return (entry === target); })) {
			caveman.ignored.push(target);
			ignoreDB.saveAll(caveman.ignored);
			ignoreCache = {}; // reset
			return target+" has been added to ignore.";
		}
		return target+" is already being ignored.";
	},
	unignore: function (target) {
		var i;
		for (i = 0; i < caveman.ignored.length; i++) {
			if (caveman.ignored[i] === target) {
				caveman.ignored.splice(i, 1);
				ignoreDB.saveAll(caveman.ignored);
				ignoreCache = {}; // reset
				return target+" has been removed from ignore.";
			}
		}
		return target+" was not being ignored.";
	},
	ignoreList: function () {
		return caveman.ignored.join(", ");
	}
};

if (!caveman.events) caveman.events = {};
if (!caveman.commands) caveman.commands = {};
if (!ignoreLoaded) {
	ignoreLoaded = true;
	caveman.ignored = ignoreDB.getAll();
	ignoreCache = {};
}

function getCommand(input) {
	var command, pos, tmp1, tmp2;
	tmp1 = input[3].slice(1).toLowerCase();
	if (tmp1[0] === irc_config.command_prefix) {
		pos = 3;
		command = tmp1.slice(1);
	} else if (input[4]) {
		tmp2 = input[3].replace(/\,|\:|\-/g, "");
		tmp1 = input[4].toLowerCase();
		if (tmp2 === irc_config.nick
			|| irc_config.nickname.some(function (entry) { return (entry.toLowerCase() === tmp2); })) {
			pos = 4;
			command = tmp1;
		}
	}
	if (command) {
		if (caveman.commands[command]) return [ "command", command, pos ];
		if (caveman.cmdAliases[command]) return [ "command", command, pos ];
		if (aliasDB.getOne(command)) return [ "alias", command, pos ];
	}
}

// carved up bits from eventpipe
function transformAlias(line, command) {
	var toTransform, aliasMatch, alias,
		aliasVars, context, nick, data,
		magic = false;
	aliasMatch = regexFactory.startsWith(command).exec(line);
	alias = aliasDB.getOne(command);
	nick = line.slice(1, line.indexOf("!"));
	context = line.slice(line.indexOf("PRIVMSG ")+8);
	context = context.slice(0, context.indexOf(" "));
	line = line.slice(0, line.indexOf(" :")+3)+alias;
	if (aliasMatch[1].indexOf("|") > -1) {
		magic = true;
		aliasMatch[1] = aliasMatch[1].replace(/\|/g, "℅");
	}
	line = replaceVars(aliasMatch, context, nick, line);
	if (line.match(/\{\((.*\|?)\)\}/)) {
		line = lib.parseVarList(line);
	}
	if (line.match(/\{\[(.*\|?)\]\}/)) {
		line = lib.molest(line);
	}
	if (magic && line.indexOf("℅") > -1) {
		line = line.replace(/℅/g, "|");
	}
	aliasMatch = null;
	return line;
}

function magicInputFondler(text) {
	if (text.indexOf("|") > -1) {
		return text.replace(/\|/g, "℅");
	}
	return text;
}

function randRange(a, b) {
	var res = 0;
	while (res < a) {
		res = Math.floor(Math.random()*b);
	}
	return res;
}

function replaceSingleVar(match, context, from) {
	var tmp, variable, nicks;
	switch (match) {
		case "{me}": return magicInputFondler(irc_config.nick);
		case "{from}": return magicInputFondler(from);
		case "{whippingBoy}": return magicInputFondler(lib.randSelect(irc_config.local_whippingboys));
		case "{channel}": return magicInputFondler(context);
		case "{randThing}": return lib.randSelect(randDB.getAll());
		case "{randNick}":
			nicks = (context[0] === "#" ? ial.Active(context) : []);
			nicks = nicks.filter(function (nick) { return (nick !== from); });
			nicks = (nicks.length > 0 ? nicks : [ "someone", "The Lawd Jesus", "your dad", "Santa" ]);
			return magicInputFondler(lib.randSelect(nicks));
		case "{verb}": return words.verb.random().base;
		case "{verbs}": return words.verb.random().s;
		case "{verbed}": return words.verb.random().ed;
		case "{verbing}": return words.verb.random().ing;
		case "{adverb}": return words.adverb.random();
		case "{adjective}": return words.adjective.random();
		case "{noun}": return words.noun.random();
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
					if (tmp[1] > 100) { // minimum needs to be reasonably low so we don't loop random() for ages.
						logger.warn("Someone is trying to do a stupid random number. replacing it with a note instead.");
						return "{#MinTooHigh-100-Max}";
					}
					tmp[2] = parseInt(tmp[2], 10);
					if (tmp[1] >= tmp[2]) {
						logger.warn("Someone is trying to do a stupid random nuymber. replacing it with a note instead.");
						return "{#Min-Max--MinNeedsToBeLower}";
					}
					return randRange(tmp[1], parseInt(tmp[2],10)).toString();
				}
			}
			// must be a variable name, or jibberish.
			variable = varDB.getOne(match.toLowerCase());
			if (variable) {
				return variable;
			}
	}
	return match;
}

function replaceVars(match, context, from, line) {
	var reg, tmp, done = {},
		args = (match && match[1] ? match[1].split(" ") : "");
	// shoo args!
	if (!argsDone) {
		if (line.indexOf("{args*}") > -1) line = line.replace(/\{args\*\}/g, match[1]);
		if (line.indexOf("{args1}") > -1) line = line.replace(/\{args1\}/g, (args && args.length > 0 ? args[0] : ""));
		if (line.indexOf("{args2}") > -1) line = line.replace(/\{args2\}/g, (args && args.length > 1 ? args[1] : ""));
		if (line.indexOf("{args3}") > -1) line = line.replace(/\{args3\}/g, (args && args.length > 2 ? args[2] : ""));
		if (line.indexOf("{args4}") > -1) line = line.replace(/\{args4\}/g, (args && args.length > 3 ? args[3] : ""));
		if (line.indexOf("{args1*}") > -1) line = line.replace(/\{args1\*\}/g, (args && args.length > 0 ? args.slice(1).join(" ") : ""));
		if (line.indexOf("{args2*}") > -1) line = line.replace(/\{args2\*\}/g, (args && args.length > 1 ? args.slice(2).join(" ") : ""));
		if (line.indexOf("{args3*}") > -1) line = line.replace(/\{args3\*\}/g, (args && args.length > 2 ? args.slice(3).join(" ") : ""));
		if (line.indexOf("{args4*}") > -1) line = line.replace(/\{args4\*\}/g, (args && args.length > 3 ? args.slice(4).join(" ") : ""));
		argsDone = true;
	}
	tmp = line;
	while ((reg = /(\{[^\{\|\(\)\[\]\} ]+\})/.exec(tmp))) {
		line = line.replace(reg[1], replaceSingleVar(reg[1], context, from));
		tmp = tmp.slice(tmp.indexOf(reg[1])+reg[1].length);
	}
	if (varParseLimit > 0 && line.match(/\{[^ ]+\}/)) {
		varParseLimit--;
		line = replaceVars(match, context, from, line);
	}
	varParseLimit = 2;
	argsDone = false;
	return line;
}
