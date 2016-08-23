"use strict";
const [setInterval, clearInterval, alias, perms, logins, ignore] =
	plugin.importMany("setInterval", "clearInterval", "alias", "perms", "logins", "ignore"),
	net = plugin.import("require")("net"),
	sanityCheck = /\n|\r|\t/g;

class Connection {
	constructor() {
		this._connected = false;
		this.buffer = "";
	}
	quit() { this._connected = false; this.socket.end(); }
	send(data) { this.socket.write(data+"\r\n", "utf8"); logger.sent(data); }
	configure() {
		if (this.socket) {
			this.socket.destroy();
			this.socket = null;
		}
		this.socket = new net.Socket();
		this.socket.setNoDelay(false);
		this.socket.setEncoding("utf8");
		this.socket.setTimeout(300000, () => this.socket.destroy());
		this.socket.on("close", hadError => {
			if (!hadError || !this._connected) {
				bot.emitEvent("closing");
				logger.warn("Disconnected. Exiting process...");
				this.socket.end();
			} else {
				logger.warn("Disconnected. Attempting to reconnect in 15 seconds...");
				if (!this._connectInterval)
					this._connectInterval = setInterval(() => this.connect(), 15000);
			}
		});
		this.socket.on("error", err => {
			logger.error("Socket error!", err);
			this.socket.destroy();
		});
		this.socket.on("data", data => this.handleData(data));
	}
	connect() {
		this.configure();
		this.socket.connect(config.port, config.server, () => {
			if (config.password !== undefined)
				this.send("PASS "+config.password);
			this.send("NICK "+config.nickname);
			this.send("USER "+config.username+" localhost * :"+config.realname);
			if (config.twitch)
				this.send("CAP REQ :twitch.tv/membership");
			this._connected = true;
			if (this._connectInterval) {
				clearInterval(this._connectInterval);
				delete this._connectInterval;
			}
		});
	}
	handleData(data) {
		let index;
		if (this.buffer.length) {
			data = this.buffer+data;
			this.buffer = "";
		}
		while ((index = data.indexOf("\r\n")) > -1) {
			irc._input.parse(data.slice(0, index));
			data = data.slice(index+2);
		}
		if (data.length) // server doesn't always end on \r\n per packet
			this.buffer = data; // so we dump the remainder on the front of the next one
	}

}

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

class IRC {
	constructor() {
		this.conn = new Connection();
		this._input = new IRCParser();
		this._sendQueue = [];
	}
	static sanitise(line) {
		if (sanityCheck.test(line))
			return line.replace(sanityCheck, "");
		return line;
	}
	connect() { this.conn.connect(); }
	send(data) { this.conn.send(IRC.sanitise(data)); }
	queueMessage(message, lowPriority) {
		if (lowPriority) // end of the line
			this._sendQueue.push(message);
		else
			this._sendQueue.unshift(message);
		if (!this._processingQueue) {
			this._processingQueue = true;
			this._processQueue();
		}
	}
	_processQueue(delay=10) {
		this._processingQueue = setInterval(() => {
			if (delay === 10 && this._sendQueue.length >= 3) {
				clearInterval(this._processingQueue);
				return this._processQueue(750);
			}
			const msg = this._sendQueue.shift();
			if (msg)
				this.send(msg);
			else {
				clearInterval(this._processingQueue);
				this._processingQueue = false;
			}
		}, delay);
	}
	longMessage(target, message, maxLines = 3) {
		while (message.length > 345 && maxLines--) {
			const index = message.lastIndexOf(" ", 345); // -5 for ".."
			this.queueMessage(target+message.slice(0, index)+" ..", true);
			message = message.slice(index+1);
		}
		if (maxLines > 0 && message.length)
			this.queueMessage(target+message, true);
	}
	say(target, message, lowPriority, maxLines) {
		if (message.length > 345)
			this.longMessage("PRIVMSG "+target+" :", message, maxLines);
		else
			this.queueMessage("PRIVMSG "+target+" :"+message, lowPriority);
	}
	notice(target, message, lowPriority, maxLines) {
		if (message.length > 345)
			this.longMessage("NOTICE "+target+" :", message, maxLines);
		else
			this.queueMessage("NOTICE "+target+" :"+message, lowPriority);
	}
	action(target, message, lowPriority) { this.queueMessage("PRIVMSG "+target+" :\x01ACTION "+message+"\x01", lowPriority); }
	rated(messages) { messages.forEach(msg => this[msg[0]](msg[1], msg[2], true)); }
	join(channel, key) { this.send("JOIN "+channel+(key ? " "+key : "")); }
	part(channel, reason) { this.send("PART "+channel+(reason ? " :"+reason : "")); }
	pong(challenge) { this.conn.socket.write("PONG :"+challenge+"\r\n"); }
	quit(message) { this.send("QUIT"+(message ? " :"+message : "")); this.conn.quit(); }
	raw(data) { this.send(data); }
}

plugin.global("irc", new IRC());
