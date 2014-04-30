"use strict";
var fs = require('fs');

if (!fs.existsSync("data/logs")) fs.mkdirSync("data/logs");
if (!fs.existsSync("data/logs/all.txt")) fs.writeFileSync("data/logs/all.txt", "");

function shd(text) {
	switch (text) {
		case "Chat":
			text = "\u001b[36m"+text;
			break;
		case "Sent":
			text = "\u001b[32m"+text;
			break;
		case "Info":
			text = "\u001b[94m"+text;
			break;
		case "Traf":
			text = "\u001b[37m"+text;
			break;
		case "Error":
			text = "\u001b[91m"+text;
			break;
		case "Warning":
			text = "\u001b[93m"+text;
			break;
		case "Serv":
			text = "\u001b[0m"+text;
			break;
		case "DEBUG":
			text = "\u001b[93m"+text;
			break;
		case "Misc":
			text = "\u001b[97m"+text;
			break;
		case "Plugin":
			text = "\u001b[96m"+text;
			break;
		case "MemR":
			text = "\u001b[92m"+text;
			break;
		default:
			text = "\u001b[97m"+text;
			break;
	}
	return "\u001b[90m["+text+"\u001b[90m]\u001b[0m";
}

global.logger = {
	log: function (line) {
		if (line) {
			if (irc_config.logging_timestamp) line = lib.timestamp(line);
			console.log(line);
			
			fs.appendFile("data/logs/all.txt", line.replace(/\u001b\[[0-9]+m/g, "") + "\n");
		}
	},
	memr: function (line) {
		// skip logging
		if (irc_config.logging_timestamp) console.log(lib.timestamp(shd("MemR")+" "+line));
		else console.log(shd("MemR")+" "+line);
	},
	chat: function (line) {
		if (irc_config.logging_chat) {
			this.log(shd("Chat")+" "+line);
		}
	},
	traffic: function (line) {
		if (irc_config.logging_traffic) {
			this.log(shd("Traf")+" "+line);
		}
	},
	info: function (line) {
		if (irc_config.logging_info) {
			this.log(shd("Info")+" "+line);
		}
	},
	server: function (line) {
		if (irc_config.logging_serv) {
			this.log(shd("Serv")+" "+line);
		}
	},
	error: function (line, err) {
		globals.lastError = lib.timestamp("[Error] " + line);
		this.log(shd("Error")+" \u001b[31m"+line+"\u001b[0m");
		if (err && err.stack) {
			globals.lastErrstack = err.stack;
			this.log("\u001b[30;1m" + err.stack + "\u001b[0m");
		}
	},
	warning: function (line) { this.warn(line); },
	warn: function (line) {
		globals.lastWarning = lib.timestamp("[Warning] "+line);
		this.log(shd("Warning")+" \u001b[33m"+line+"\u001b[0m");
	},
	debug: function (line) {
		if (irc_config.logging_debug) {
			this.log(shd("DEBUG")+" "+line);
		}
	},
	sent: function (line) {
		this.log(shd("Sent")+" "+line);
	},
	plugin: function (line) {
		this.log(shd("Plugin")+" "+line);
	},
	misc: function (line) {
		this.log(shd("Misc")+" "+line);
	},
	filter: function (line, ret) {
		var arr;
		if (line.slice(0,4) === "PING") return;
		arr = line.split(" ");
		if (arr) {
			switch (arr[1]) {
				case "PRIVMSG":
					if (ret) return "[Chat] "+line;
					this.chat(line);
					break;
				case "NICK":
				case "JOIN":
				case "MODE":
				case "PART":
				case "QUIT":
				case "TOPIC":
					if (ret) return "[Traf] "+line;
					this.traffic(line);
					break;
				case "NOTICE":
					if (arr[0].indexOf('@') > -1) {
						if (ret) return "[Chat] "+line;
						this.chat(line);
					} else {
						if (ret) return "[Serv] "+line;
						this.server(line);
					}
					break;
				default:
					if (ret) return "[Serv] "+line;
					this.server(line);
					break;
			}
		}
	}
};

