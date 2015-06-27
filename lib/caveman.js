"use strict";

module.exports = function (lib, config, logger, ial, perms, words, userLogin, alias, helpDB, ignoreDB) {
	var cmEvents = {},
		cmCommands = {},
		cmCommandAliases = {},
		cmEventRegexes = {},
		cmIgnored = ignoreDB.getAll(),
		cmIgnoreCache = {};

	function checkIgnored(input) {
		var i, user = input.slice(1, input.indexOf(" "));
		// fast path! :D
		if (cmIgnoreCache[user] !== undefined)
			return cmIgnoreCache[user];
		// slow path. :<
		for (i = 0; i < cmIgnored.length; i++) {
			if (ial.maskMatch(user, cmIgnored[i])) {
				cmIgnoreCache[user] = true;
				return true;
			}
		}
		cmIgnoreCache[user] = false;
		return false;
	}

	function cleanNick(nick) { // removes trailing : , from nicks.
		var nickCompletionCharacters = [ ",", ":" ];
		if (nickCompletionCharacters.indexOf(nick[nick.length-1]) > -1)
			return nick.slice(1, -1);
		return nick.slice(1);
	}

	function getCommand(input) {
		var command, pos, tmp1, tmp2;
		tmp1 = input[3].slice(1).toLowerCase();
		if (tmp1[0] === config.command_prefix) {
			pos = 3;
			command = tmp1.slice(1);
		} else if (input[4]) {
			tmp2 = cleanNick(input[3]);
			tmp1 = input[4].toLowerCase();
			if (tmp2 === config.nick || lib.hasElement(config.nickname, tmp2)) {
				pos = 4;
				command = tmp1;
			}
		}
		if (command) {
			if (cmCommands[command] || cmCommandAliases[command])
				return [ "command", command, pos ];
			if (alias.db.hasOne(command))
				return [ "alias", command, pos ];
		}
	}

	function arglenCheck(command, args) {
		if (args !== undefined && args.length >= cmCommands[command].arglen)
			return true;
	}

	return {
		emitEvent: function emitEvent(input) {
			var type, i, params, aliasSyntax, cmdArglen, cmd,
				permission = true;
			input = input.trim();
			logger.filter(input);
			if (ignoreDB.size() > 0 && checkIgnored(input))
				return; // ignored
			params = { raw: input };
			input = input.split(" ");
			if (input[0][0] === ":") {
				type = input[1];
				if (type === "PRIVMSG") {
					cmd = getCommand(input);
					if (cmd)
						params.command = cmd;
					if (params.command) {
						if (params.command[0] === "alias") {
							if (!perms.Check(input[0].slice(1), "alias", params.command[1]))
								permission = false;
							params.alias = params.command[1];
							params.aliasArgs = input.slice(params.command[2]+1).join(" ");
							aliasSyntax = alias.syntax(params.alias, params.aliasArgs.length, helpDB.getOne(params.alias));
							params.raw = alias.transform(params.raw, params.command[1], alias.db.getOne(params.alias), params.aliasArgs);
							input = params.raw.split(" ");
							params.command = input[3].slice(2);
						} else {
							if (params.command[2] === 4) {
								params.data = input.slice(4).join(" ");
								params.args = input.slice(5);
							}
							params.command = params.command[1];
							cmdArglen = false;
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
				if (!params.data)
					params.data = params.raw.slice(params.raw.indexOf(" :")+2);
				if (params.context[0] !== "#")
					params.context = params.nick;
				else
					params.channel = params.context;
			}

			switch (type) {
			case "PRIVMSG":
				params.message = input.slice(3).join(" ").slice(1);
				if (params.command) {
					if (cmCommands && cmCommands[params.command] &&
						cmCommands[params.command].admin && !userLogin.isAdmin(params.user)) {
							irc.say(params.context, "Bitch_, please.");
							break;
					}
					if (!params.args)
						params.args = input.slice(4);
					params.data = params.data.slice(params.data.indexOf(" ")+1);
					if (params.args.length === 0)
						delete params.args;
					if (cmCommandAliases && cmCommandAliases[params.command])
						params.command = cmCommandAliases[params.command];
					if (!permission) {
						irc.say(params.context, "You don't have permission to do that.");
						break;
					}
					if (aliasSyntax) {// no command should happen if an alias syntax was wrong
						irc.say(params.context, aliasSyntax, false);
					} else if (cmCommands[params.command].arglen !== undefined && !arglenCheck(params.command, params.args)) {
						irc.say(params.context, this.cmdHelp(params.command, "syntax"), false);
					} else {
						lib.events.emit("Command: "+params.command, params);
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
			if (cmEventRegexes && cmEventRegexes[type]) {
				for (i = 0; i < cmEventRegexes[type].length; i++) {
					params.match = cmEventRegexes[type][i][1].exec(params.raw);
					if (params.match)
						lib.events.emit("Event: "+cmEventRegexes[type][i][0]+" "+type, params);
				}
				if (!params.match)
					delete params.match;
			}
			lib.events.emit("Event: " + type, params);
			params = null;
		},

		command: function commandListen(command) {
			var trigger, i;
			if (!(command.command && command.help && command.callback)) {
				logger.error("Incorrect caveman.commandListen format - need at least a command, help and callback.");
				return;
			}
			if (Array.isArray(command.command)) {
				if (command.command.length === 1) {
					command.command = command.command[0];
				} else {
					for (i = 1; i < command.command.length; i++)
						cmCommandAliases[command.command[i]] = command.command[0];
					command.command = command.command[0];
				}
			}
			trigger = "Command: "+command.command;
			// check for and remove dupes
			if (cmCommands[command.command]) {
				lib.events.removeListener(trigger, lib.events.listeners(trigger)[0]); // there can be oonly oneee
				delete cmCommands[command.command];
			}
			cmCommands[command.command] = {
				id: command.command,
				help: command.help
			};
			if (command.admin)
				cmCommands[command.command].admin = command.admin;
			if (command.syntax)
				cmCommands[command.command].syntax = command.syntax;
			if (command.options)
				cmCommands[command.command].options = command.options;
			if (command.arglen)
				cmCommands[command.command].arglen = command.arglen;
			lib.events.on(trigger, command.callback);
		},

		event: function eventListen (event) {
			var i, events, funcStr, dupe, trigger;
			if (!(event.event && event.handle && event.callback)) {
				logger.error("Incorrect caveman.eventListen format - need at least an event, handle and callback.");
				return;
			}
			funcStr = event.callback.toString().replace(/\n|\t| /g, "");
			// register as a vanilla event or regex based
			if (event.regex) {
				trigger = "Event: "+event.handle+" "+event.event;
				if (!cmEventRegexes)
					cmEventRegexes = {};
				if (!cmEventRegexes[event.event])
					cmEventRegexes[event.event] = [];
				// dupe check
				dupe = false;
				for (i = 0; i < cmEventRegexes[event.event].length; i++) {
					if (cmEventRegexes[event.event][i][0] === event.handle) {
						dupe = true;
						cmEventRegexes[event.event][i][1] = event.regex;
					}
				}
				if (!dupe) {
					cmEventRegexes[event.event].push( [ event.handle, event.regex ] );
				}
			} else {
				trigger = "Event: "+event.event;
			}
			// check for and remove dupes
			if (cmEvents[event.handle]) {
				events = lib.events.listeners(trigger);
				for (i = 0; i < events.length; i++) {
					if (events[i].toString().replace(/\n|\t| /g, "") === cmEvents[event.handle].func)
						lib.events.removeListener(trigger, events[i]);
				}
				delete cmEvents[event.handle];
			}
			cmEvents[event.handle] = {
				id: event.handle,
				func: funcStr
			};
			lib.events.on(trigger, event.callback);
		},

		cmdExists: function cmdExists(command) {
			if (cmCommands[command])
				return true;
			if (cmCommandAliases[command])
				return true;
			return false;
		},
		cmdHelp: function cmdHelp(command, type) {
			if (cmCommandAliases[command])
				command = cmCommandAliases[command];
			if (!cmCommands[command] || !cmCommands[command][type])
				return;
			switch (type) {
			case "help":
				return "[Help] "+cmCommands[command][type];
			case "syntax":
				return "[Help] Syntax: "+cmCommands[command][type];
			case "options":
				return "[Help] Options: "+cmCommands[command][type];
			default:
				logger.error("Tried to get non-existant help type "+type+" for command "+command);
				return;
			}
		},
		cmdList: function cmdList() {
			return Object.keys(cmCommands);
		},
		getAliasHelp: function getAliasHelp(alias) {
			return helpDB.getOne(alias);
		},
		ignore: function ignore(target) { // moving this here since this is the only place that pokes it.
			if (!cmIgnored.some(function (entry) { return (entry === target); })) {
				cmIgnored.push(target);
				ignoreDB.saveAll(cmIgnored);
				cmIgnoreCache = {}; // reset
				return target+" has been added to ignore.";
			}
			return target+" is already being ignored.";
		},
		unignore: function unignore(target) {
			var i;
			for (i = 0; i < cmIgnored.length; i++) {
				if (cmIgnored[i] === target) {
					cmIgnored.splice(i, 1);
					ignoreDB.saveAll(cmIgnored);
					cmIgnoreCache = {}; // reset
					return target+" has been removed from ignore.";
				}
			}
			return target+" was not being ignored.";
		},
		ignoreList: function ignoreList() {
			return cmIgnored.join(", ");
		}
	};
};
