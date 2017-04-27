"use strict";

const [ignore, logins, alias, perms] = plugin.importMany("ignore", "logins", "alias", "perms");

class IRCParser { // this class lives in the future, man.
	_cleanNick(nick) { // removes trailing : , from nicks.
		let nickCompletionCharacters = [ ",", ":" ];
		if (nickCompletionCharacters.indexOf(nick[nick.length-1]) > -1)
			return nick.slice(1, -1);
		return nick.slice(1);
	}
	_getCommand(input) {
		let command, pos, tmp1, tmp2;
		tmp1 = input[3].slice(1).toLowerCase();
		if (tmp1[0] === config.command_prefix) {
			pos = 3;
			command = tmp1.slice(1);
		} else if (input[4]) {
			tmp2 = this._cleanNick(input[3]);
			tmp1 = input[4].toLowerCase();
			if (tmp2.toLowerCase() === config.nick.toLowerCase()) {
				pos = 4;
				command = tmp1;
			}
		}
		if (command) {
			if (bot.cmdExists(command))
				return [ "command", command, pos ];
			if (alias.db.hasOne(command))
				return [ "alias", command, pos ];
		}
	}
	_arglenCheck(command, args) {
		let needed = bot.commandArglen(command);
		if (needed > 0 && (args === undefined || needed > args.length))
			return false;
		return true;
	}
	_handleMessage(inputLine, input, params) {
		let cmd, permission = true, aliasSyntax;
		if ((cmd = this._getCommand(input)) !== undefined) {
			params.command = cmd;
			if (params.command[0] === "alias") {
				if (!perms.Check(params.user, "alias", params.command[1]))
					permission = false;
				params.alias = params.command[1];
				params.aliasArgs = input.slice(params.command[2]+1).join(" ");
				aliasSyntax = alias.syntax(params.alias, params.aliasArgs.length);
				params.raw = alias.transform(params.raw, params.command[1], alias.db.getOne(params.alias), params.aliasArgs);
				params.data = params.raw.slice(params.raw.indexOf(" :")+2);
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
		if (params.command) {
			if (bot.commandNeedsAdmin(params.command) && !logins.isAdmin(params.nick)) {
				irc.say(params.context, "Bitch_, please.");
				return logger.denied(inputLine);
			}
			if (!params.args)
				params.args = input.slice(4);
			params.data = params.data.slice(params.data.indexOf(" ")+1);
			if (params.args.length === 0)
				delete params.args;
			if (bot.isCommandAlias(params.command))
				params.command = bot.commandAlias(params.command);
			if (!permission) {
				irc.say(params.context, "You don't have permission to do that.");
				return logger.denied(inputLine);
			}
			logger.chat(inputLine);
			if (aliasSyntax) {// no command should happen if an alias syntax was wrong
				irc.say(params.context, aliasSyntax);
			} else if (!this._arglenCheck(params.command, params.args)) {
				irc.say(params.context, bot.cmdHelp(params.command, "syntax"));
			} else {
				return bot.emitCommand(params.command, params);
			}
		} else {
			return logger.chat(inputLine);
		}
	}
	_logLine(type, inputLine) {
		switch (type) {
		case "PRIVMSG":
			return logger.chat(inputLine);
		case "MODE":
		case "TOPIC":
		case "JOIN":
		case "PART":
		case "NICK":
		case "QUIT":
		case "KICK":
			return logger.traffic(inputLine);
		default:
			return logger.server(inputLine);
		}
	}
	parse(inputLine) {
		let handleMessage = false;
		if (inputLine.slice(0,4) === "PING")
			return irc.pong(inputLine.slice(6));
		if (ignore.check(inputLine))
			return logger.ignored(inputLine);
		let params, bangIndex,
			input = inputLine.trim().split(" "),
			type = input[0][0] === ":" ? input[1] : input[0];
		if (!bot.hasEvent(type))
			return this._logLine(type, inputLine);
		params = Object.create(null);
		params.raw = inputLine;
		// fill in mojojojo
		bangIndex = input[0].indexOf("!");
		if (bangIndex > -1) {
			params.nick = input[0].slice(1, bangIndex);
			params.address = input[0].slice(bangIndex+1);
			params.user = input[0].slice(1);
			params.context = (input[2][0] !== ":" ? input[2] : input[2].slice(1));
			params.data = inputLine.slice(inputLine.indexOf(" :")+2);
			if (params.context[0] !== "#")
				params.context = params.nick;
			else
				params.channel = params.context;
		}
		switch (type) {
		case "PRIVMSG":
			params.message = input.slice(3).join(" ").slice(1);
			handleMessage = true;
			break;
		case "MODE":
			params.mode = (input[3][0] !== ":" ? input[3] : input[3].slice(1));
			params.affected = input.slice(4);
			logger.traffic(inputLine);
			break;
		case "TOPIC":
			params.topic = input.slice(3).join(" ").slice(1);
			logger.traffic(inputLine);
			break;
		case "JOIN":
			logger.traffic(inputLine);
			break;
		case "PART":
			params.reason = (input[3] ? input.slice(3).join(" ").slice(1) : "");
			logger.traffic(inputLine);
			break;
		case "NICK":
			params.newnick = input[2].slice(1);
			logger.traffic(inputLine);
			break;
		case "QUIT":
			params.reason = input.slice(2).join(" ").slice(1);
			logger.traffic(inputLine);
			break;
		case "KICK":
			params.kicked = input[3];
			params.reason = input.slice(4).join(" ").slice(1);
			logger.traffic(inputLine);
			break;
		default:
			logger.server(inputLine);
			break;
		}
		bot.emitEvent(type, params);
		if (handleMessage) // process (possible) commands after events
			return this._handleMessage(inputLine, input, params);
	}
}

plugin.export("ircparser", new IRCParser());
