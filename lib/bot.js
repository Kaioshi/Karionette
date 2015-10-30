"use strict";

module.exports = function (lib, config, logger, edgar, ial, perms, words, logins, alias, ignore) {
	var bot = {};

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
			if (edgar.isCommand(command))
				return [ "command", command, pos ];
			if (alias.db.hasOne(command))
				return [ "alias", command, pos ];
		}
	}

	function arglenCheck(command, args) {
		var needed = edgar.commandArglen(command);
		if (needed > 0 && (args === undefined || needed > args.length))
			return false;
		return true;
	}

	bot.parse = function botParse(input) {
		var type, params, aliasSyntax, cmdArglen, cmd,
			permission = true;
		input = input.trim();
		logger.filter(input);
		if (ignore.check(input))
			return; // ignored
		params = { raw: input };
		input = input.split(" ");
		if (input[0][0] === ":") {
			type = input[1];
			if (type === "PRIVMSG" && (cmd = getCommand(input)) !== undefined) {
				params.command = cmd;
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
				if (edgar.commandNeedsAdmin(params.command) && !logins.isAdmin(params.nick)) {
						irc.say(params.context, "Bitch_, please.");
						break;
				}
				if (!params.args)
					params.args = input.slice(4);
				params.data = params.data.slice(params.data.indexOf(" ")+1);
				if (params.args.length === 0)
					delete params.args;
				if (edgar.isCommandAlias(params.command))
					params.command = edgar.commandAlias(params.command);
				if (!permission) {
					irc.say(params.context, "You don't have permission to do that.");
					break;
				}
				if (aliasSyntax) {// no command should happen if an alias syntax was wrong
					irc.say(params.context, aliasSyntax);
				} else if (!arglenCheck(params.command, params.args)) {
					irc.say(params.context, this.cmdHelp(params.command, "syntax"));
				} else {
					edgar.emitCommand(params.command, params);
				}
			}
			break;
		case "PING":
			params.challenge = input[1].slice(1);
			break;
		case "MODE":
			params.mode = (input[3][0] !== ":" ? input[3] : input[3].slice(1));
			params.affected = input.slice(4);
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
		edgar.emitEvent(type, params);
		params = null;
	};
	bot.emitCustomEvent = edgar.emitEvent;
	bot.cmdExists = edgar.isCommand;
	bot.cmdHelp = edgar.commandHelp;
	bot.cmdList = edgar.commandList;
	bot.event = edgar.event;
	bot.command = edgar.command;

	return bot;
};
