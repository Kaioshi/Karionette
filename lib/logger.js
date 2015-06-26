"use strict";
var fs = require("fs");

module.exports = function (lib, irc_config) {
	var logDay = new Date().getDate(), logFile;

	if (!fs.existsSync("data/logs"))
		fs.mkdirSync("data/logs");

	function zero(n) { return n < 10 ? "0" + n : n.toString(); }

	function logFileDate(d) {
		return d.getFullYear()+"-"+zero(d.getMonth()+1)+"-"+zero(d.getDate());
	}

	function writeLog(date, line) {      // XXX: Can not use logger.* functions in this call.
		if (date.getDate() !== logDay) { // Recursive loops, yo!
			logDay = date.getDate();     // new day, new log, new dog, new.. fog.. pog. whatever.
			logFile = "data/logs/" + logFileDate(date) + ".log";
			fs.writeFileSync(logFile, "");
		}
		if (logFile === undefined)
			logFile = "data/logs/" + logFileDate(date) + ".log";
		fs.appendFile(logFile, line.replace(/\u001b\[[0-9]+m/g, "") + "\n");
	}

	function shd(text) { // colourful
		switch (text) {
		case "Chat": text = "\u001b[36m"+text; break;
		case "Sent": text = "\u001b[32m"+text; break;
		case "Info": text = "\u001b[94m"+text; break;
		case "Traf": text = "\u001b[37m"+text; break;
		case "Error": text = "\u001b[91m"+text; break;
		case "Warning": text = "\u001b[93m"+text; break;
		case "Serv": text = "\u001b[0m"+text; break;
		case "DEBUG": text = "\u001b[93m"+text; break;
		case "Misc": text = "\u001b[97m"+text; break;
		case "Plugin": text = "\u001b[96m"+text; break;
		case "MemR": text = "\u001b[92m"+text; break;
		default: text = "\u001b[97m"+text; break;
		}
		return "\u001b[90m["+text+"\u001b[90m]\u001b[0m";
	}

	return {
		log: function (type, line, out) {
			var date = new Date();
			line = shd(type)+" "+line;
			if (irc_config.logging_timestamp)
				line = date.toLocaleTimeString() + " " + line;
			if (out)
				console.log(line);
			writeLog(date, line);
		},
		memr: function (line) { this.log("MemR", line, irc_config.logging_timestamp); },
		chat: function (line) { this.log("Chat", line, irc_config.logging_chat); },
		traffic: function (line) { this.log("Traf", line, irc_config.logging_traffic); },
		info: function (line) { this.log("Info", line, irc_config.logging_info); },
		server: function (line) { this.log("Serv", line, irc_config.logging_serv); },
		debug: function (line) { this.log("DEBUG", line, irc_config.logging_debug); },
		sent: function (line, silent) { this.log("Sent", line, (silent ? false : true)); },
		misc: function (line) { this.log("Misc", line, true); },
		error: function (line, err) {
			globals.lastError = lib.timestamp("[Error] " + line);
			lib.events.emit("Event: Error", line);
			this.log("Error", "\u001b[31m"+line+"\u001b[0m", true);
			if (err && err.stack) {
				globals.lastErrstack = err.stack;
				lib.events.emit("Event: Error Stack", err.stack);
				this.log("Error", "\u001b[30;1m" + err.stack + "\u001b[0m", true);
			}
		},
		warning: function (line) { this.warn(line); },
		warn: function (line) {
			globals.lastWarning = lib.timestamp("[Warning] "+line);
			this.log("Warning", "\u001b[33m"+line+"\u001b[0m", true);
		},
		filter: function (line, ret) {
			var arr;
			if (line.slice(0,4) === "PING")
				return;
			arr = line.split(" ");
			switch (arr[1]) {
			case "PRIVMSG":
				if (ret)
					return "[Chat] "+line;
				this.chat(line);
				break;
			case "NICK":
			case "KICK":
			case "JOIN":
			case "MODE":
			case "PART":
			case "QUIT":
			case "TOPIC":
				if (ret)
					return "[Traf] "+line;
				this.traffic(line);
				break;
			case "NOTICE":
				if (arr[0].indexOf("@") > -1) {
					if (ret)
						return "[Chat] "+line;
					this.chat(line);
				} else {
					if (ret)
						return "[Serv] "+line;
					this.server(line);
				}
				break;
			default:
				if (ret)
					return "[Serv] "+line;
				this.server(line);
				break;
			}
		}
	};
};
