var fs = require('fs');

logger = {
	log: function (line) {
		if (line) {
			if (irc_config.logging_timestamp) line = lib.timestamp(line);
			console.log(line);
			fs.appendFile("data/logs/all.txt", line+"\n");
		}
	},
	chat: function (line) { if (irc_config.logging_chat) this.log("[Chat] "+line); },
	traffic: function (line) { if (irc_config.logging_traffic) this.log("[Traf] "+line); },
	info: function (line) { if (irc_config.logging_info) this.log("[Info] "+line); },
	server: function (line) { if (irc_config.logging_serv) this.log("[Serv] "+line); },
	error: function (line, err) {
		globals.lastError = lib.timestamp("[Error] "+line);
		this.log("\u001b[31m[Error] "+line+"\u001b[0m");
		if (err && err.stack) {
			globals.lastErrstack = err.stack;
			this.log("\u001b[30;1m"+err.stack+"\u001b[0m");
		}
	},
	warning: function (line) { this.warn(line); },
	warn: function (line) {
		globals.lastWarning = lib.timestamp("[Error] "+line);
		this.log("\u001b[34m[Warning] "+line+"\u001b[0m");
	},
	debug: function (line) { if (irc_config.logging_debug) this.log("[DEBUG] "+line); },
	sent: function (line) { this.log("[Sent] "+line); },
	plugin: function (line) { this.log("[Plugin] "+line); },
	misc: function (line) { this.log("[Misc] "+line); },
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
