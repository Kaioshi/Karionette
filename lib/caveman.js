require("./funcs.js");
var DB = require("./fileDB.js"),
	aliasDB = new DB.Json({filename: "alias/alias", queue: true}),
	varDB = new DB.Json({filename: "alias/vars", queue: true}),
	ignoreDB = new DB.List({filename: "ignore"}),
	randThings = new DB.List({filename: "randomThings"}).getAll();
	regexFactory = require('./regexFactory.js');

caveman = {
	emitEvent: function (input) {
		var data, type, i, params;
		input = input.trim();
		logger.filter(input);
		params = { raw: input };
		input = input.split(" ");
		if (input[0][0] === ":") {
			type = input[1];
			if (type === "PRIVMSG") {
				params.command = getCommand(input);
				if (params.command) {
					if (params.command[0] === "alias") {
						params.raw = transformAlias(params.raw, params.command[1]);
						input = params.raw.split(" ");
						params.command = input[3].slice(2);
					} else {
						if (params.command[2] === 4) {
							params.data = input.slice(4).join(" ");
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
			if (ignoreDB.size() > 0 && ignoreDB.getOne(params.nick)) {
				params = null; // ignored!
				return; // motherflipper.
			}
			params.address = input[0].slice(input[0].indexOf("!")+1);
			params.user = input[0].slice(1);
			params.context = (input[2][0] !== ":" ? input[2] : input[2].slice(1));
			if (!params.data) {
				params.data = params.raw.slice(params.raw.indexOf(" :") + 1);
			}
			if (params.context[0] !== "#") {
				params.context = params.nick;
			} else {
				params.channel = params.context;
				if (ignoreDB.size() > 0 && ignoreDB.getOne(params.channel)) {
					params = null; // ignored channel
					return; // motherflippers
				}
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
						params.args = input.slice(4);
						params.data = params.data.slice(params.data.indexOf(" ")+1);
						if (params.args.length === 0) delete params.args;
						if (caveman.cmdAliases && caveman.cmdAliases[params.command]) {
							params.command = caveman.cmdAliases[params.command];
						}
						lib.events.emit("Command: "+params.command, params);
					}
				}
				break;
			case "PING":
				params.challenge = input[1].slice(1);
				break;
			case "MODE":
				params.mode = input[3];
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
		if (caveman.eventRegexes[type]) {
			for (i = 0; i < caveman.eventRegexes[type].length; i++) {
				params.match = caveman.eventRegexes[type][i][1].exec(params.raw);
				if (params.match) {
					lib.events.emit("Event: "+caveman.eventRegexes[type][i][0]+" "+type, params);
				}
			}
			if (!params.match) delete params.match;
		}
		lib.events.emit("Event: " + type, params);
		params = null; before = null;
		lib.timeReport("caveman");
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
	},
	eventListen: function (event) {
		var i, events, funcStr, dupe;
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
	},
	cmdHelp: function (command, type) {
		if (type !== "help" && type !== "syntax" && type !== "options") {
			logger.error("Tried to get non-existant help type "+type+" for command "+command);
		} else {
			if (caveman.cmdAliases[command]) {
				return caveman.commands[caveman.cmdAliases[command]][type];
			}
			if (caveman.commands[command] && caveman.commands[command][type]) {
				return caveman.commands[command][type];
			}
		}
	},
	cmdList: function () {
		return Object.keys(caveman.commands);
	}
};

if (!caveman.events) caveman.events = {};
if (!caveman.commands) caveman.commands = {};

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
		if (aliasDB.getOne(command)) return [ "alias", command, pos ];
	}
}

// carved up bits from eventpipe
function transformAlias(line, command) {
	var toTransform, aliasMatch, alias,
		aliasVars, context, nick, data;
	aliasMatch = regexFactory.startsWith(command).exec(line);
	alias = aliasDB.getOne(command);
	nick = line.slice(1, line.indexOf("!"));
	context = line.slice(line.indexOf("PRIVMSG ")+8);
	context = context.slice(0, context.indexOf(" "));
	aliasVars = makeVars(aliasMatch, context, nick, alias+" "+line);
	toTransform = lib.supplant(alias, aliasVars);
	if (aliasMatch[1]) {
		line = line.slice(0, -(aliasMatch[1].length) - 1);
	}
	line = line.replace(
		new RegExp("(" + irc_config.command_prefix + "|"
			+ irc_config.nickname.join("[:,-]? |") + "[:,-]? )" + command, "i"),
		irc_config.command_prefix + toTransform
	);
	aliasMatch = null; toTransform = null; aliasVars = null;
	return line;
}

function makeVars(match, context, from, data) {
	var reg, variable, nicks, newMatch, args, i,
		ret = {};
	while ((reg = /(\{[^\|\(\)\[\]\} ]+\})/.exec(data))) {
		switch (reg[1]) {
			case "{me}": ret[reg[1]] = irc_config.nick; break;
			case "{from}": ret[reg[1]] = from; break;
			case "{whippingBoy}": ret[reg[1]] = lib.randSelect(irc_config.local_whippingboys); break;
			case "{channel}": ret[reg[1]] = context; break;
			case "{randThing}": ret[reg[1]] = lib.randSelect(randThings); break;
			case "{randNick}":
				nicks = (context[0] === "#" ? ial.Active(context) : []);
				nicks = nicks.filter(function (nick) { return (nick !== from); });
				nicks = (nicks.length > 0 ? nicks : [ "someone", "The Lawd Jesus", "your dad", "Santa" ]);
				ret[reg[1]] = lib.randSelect(nicks);
				nicks = null;
				break;
			case "{verb}": ret[reg[1]] = words.verb.random().base; break;
			case "{verbs}": ret[reg[1]] = words.verb.random().s; break;
			case "{verbed}": ret[reg[1]] = words.verb.random().ed; break;
			case "{verbing}": ret[reg[1]] = words.verb.random().ing; break;
			case "{adverb}": ret[reg[1]] = words.adverb.random(); break;
			case "{adjective}": ret[reg[1]] = words.adjective.random(); break;
			case "{noun}": ret[reg[1]] = words.noun.random(); break;
			case "{pronoun}": ret[reg[1]] = words.pronoun.random(); break;
			case "{personalPronoun}": ret[reg[1]] = words.personalPronoun.random(); break;
			case "{possessivePronoun}": ret[reg[1]] = words.possessivePronoun.random(); break;
			case "{preposition}": ret[reg[1]] = words.preposition.random(); break;
			case "{args*}": ret[reg[1]] = ""; break;
			case "{args1}": ret[reg[1]] = ""; break;
			case "{args2}": ret[reg[1]] = ""; break;
			case "{args3}": ret[reg[1]] = ""; break;
			case "{args4}": ret[reg[1]] = ""; break;
			case "{args1*}": ret[reg[1]] = ""; break; // Apparently
			case "{args2*}": ret[reg[1]] = ""; break; // these are
			case "{args3*}": ret[reg[1]] = ""; break; // used by
			case "{args4*}": ret[reg[1]] = ""; break; // one thing.
			//case "{args-1}": ret[reg[1]] = ""; break; // but not this one.
			default:
				// must be a variable name, or jibberish.
				variable = varDB.getOne(reg[1]);
				if (variable) {
					ret[reg[1]] = variable;
				}
				variable = null;
				break;
		}
		data = data.slice(data.indexOf(reg[1])+reg[1].length);
	}
	if (match[1]) {
		newMatch = lib.supplant(match[1], ret);
		args = newMatch.split(" ");
		ret["{args*}"] = newMatch;
		//ret["{args-1}"] = args[args.length-1]; I'll uncomment these if anyone ever wants them.
		for (i = 0; i < args.length; i++) {
			ret["{args"+(i+1)+"*}"] = args.slice(i).join(" ");
			ret["{args"+(i+1)+"}"] = args[i];
		}
	}
	reg = null; newMatch = null; args = null;
	return ret;
}

