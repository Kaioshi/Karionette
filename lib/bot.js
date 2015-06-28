"use strict";

module.exports = function (lib, config, logger, ial, perms, words, userLogin, alias, ignore) {
	var botEvents = {},
		botCommands = {},
		botCommandAliases = {},
		botEventRegexes = {};

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
			if (botCommands[command] || botCommandAliases[command])
				return [ "command", command, pos ];
			if (alias.db.hasOne(command))
				return [ "alias", command, pos ];
		}
	}

	function arglenCheck(command, args) {
		if (args !== undefined && args.length >= botCommands[command].arglen)
			return true;
	}

	return {
		emitEvent: function emitEvent(input) {
			var type, i, params, aliasSyntax, cmdArglen, cmd,
				permission = true;
			input = input.trim();
			logger.filter(input);
			if (ignore.check(input))
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
							aliasSyntax = alias.syntax(params.alias, params.aliasArgs.length);
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
					if (botCommands && botCommands[params.command] &&
						botCommands[params.command].admin && !userLogin.isAdmin(params.user)) {
							irc.say(params.context, "Bitch_, please.");
							break;
					}
					if (!params.args)
						params.args = input.slice(4);
					params.data = params.data.slice(params.data.indexOf(" ")+1);
					if (params.args.length === 0)
						delete params.args;
					if (botCommandAliases && botCommandAliases[params.command])
						params.command = botCommandAliases[params.command];
					if (!permission) {
						irc.say(params.context, "You don't have permission to do that.");
						break;
					}
					if (aliasSyntax) {// no command should happen if an alias syntax was wrong
						irc.say(params.context, aliasSyntax, false);
					} else if (botCommands[params.command].arglen !== undefined && !arglenCheck(params.command, params.args)) {
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
			if (botEventRegexes && botEventRegexes[type]) {
				for (i = 0; i < botEventRegexes[type].length; i++) {
					params.match = botEventRegexes[type][i][1].exec(params.raw);
					if (params.match)
						lib.events.emit("Event: "+botEventRegexes[type][i][0]+" "+type, params);
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
				logger.error("Incorrect bot.command format - need at least a command, help and callback.");
				return;
			}
			if (Array.isArray(command.command)) {
				if (command.command.length === 1) {
					command.command = command.command[0];
				} else {
					for (i = 1; i < command.command.length; i++)
						botCommandAliases[command.command[i]] = command.command[0];
					command.command = command.command[0];
				}
			}
			trigger = "Command: "+command.command;
			// check for and remove dupes
			if (botCommands[command.command]) {
				lib.events.removeListener(trigger, lib.events.listeners(trigger)[0]); // there can be oonly oneee
				delete botCommands[command.command];
			}
			botCommands[command.command] = {
				id: command.command,
				help: command.help
			};
			if (command.admin)
				botCommands[command.command].admin = command.admin;
			if (command.syntax)
				botCommands[command.command].syntax = command.syntax;
			if (command.options)
				botCommands[command.command].options = command.options;
			if (command.arglen)
				botCommands[command.command].arglen = command.arglen;
			lib.events.on(trigger, command.callback);
		},

		event: function eventListen (event) {
			var i, events, funcStr, dupe, trigger;
			if (!(event.event && event.handle && event.callback)) {
				logger.error("Incorrect bot.event format - need at least an event, handle and callback.");
				return;
			}
			funcStr = event.callback.toString().replace(/\n|\t| /g, "");
			// register as a vanilla event or regex based
			if (event.regex) {
				trigger = "Event: "+event.handle+" "+event.event;
				if (!botEventRegexes)
					botEventRegexes = {};
				if (!botEventRegexes[event.event])
					botEventRegexes[event.event] = [];
				// dupe check
				dupe = false;
				for (i = 0; i < botEventRegexes[event.event].length; i++) {
					if (botEventRegexes[event.event][i][0] === event.handle) {
						dupe = true;
						botEventRegexes[event.event][i][1] = event.regex;
					}
				}
				if (!dupe) {
					botEventRegexes[event.event].push( [ event.handle, event.regex ] );
				}
			} else {
				trigger = "Event: "+event.event;
			}
			// check for and remove dupes
			if (botEvents[event.handle]) {
				events = lib.events.listeners(trigger);
				for (i = 0; i < events.length; i++) {
					if (events[i].toString().replace(/\n|\t| /g, "") === botEvents[event.handle].func)
						lib.events.removeListener(trigger, events[i]);
				}
				delete botEvents[event.handle];
			}
			botEvents[event.handle] = {
				id: event.handle,
				func: funcStr
			};
			lib.events.on(trigger, event.callback);
		},

		cmdExists: function cmdExists(command) {
			if (botCommands[command])
				return true;
			if (botCommandAliases[command])
				return true;
			return false;
		},
		cmdHelp: function cmdHelp(command, type) {
			if (botCommandAliases[command])
				command = botCommandAliases[command];
			if (!botCommands[command] || !botCommands[command][type])
				return;
			switch (type) {
			case "help":
				return "[Help] "+botCommands[command][type];
			case "syntax":
				return "[Help] Syntax: "+botCommands[command][type];
			case "options":
				return "[Help] Options: "+botCommands[command][type];
			default:
				logger.error("Tried to get non-existant help type "+type+" for command "+command);
				return;
			}
		},
		cmdList: function cmdList() {
			return Object.keys(botCommands);
		},
		getAliasHelp: function getAliasHelp(alias) {
			return alias.help(alias);
		}
	};
};
