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
	error: function (line) {
		globals.lastError = lib.timestamp("[Error] "+line);
		this.log("[Error] "+line);
	},
	warning: function (line) { this.warn(line); },
	warn: function (line) {
		globals.lastWarning = lib.timestamp("[Error] "+line);
		this.log("[Warning] "+line);
	},
	sent: function (line) { this.log("[Sent] "+line); },
	plugin: function (line) { this.log("[Plugin] "+line); },
	misc: function (line) { this.log("[Misc] "+line); },
	filter: function (line, ret) {
		if (line.slice(0,4) === "PING") return;
		var arr = line.split(" ");
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
					// dirty hack to work around a regex not running every time for WHO results. :(
					if (line.indexOf(' 352 '+irc_config.nick) > -1) {
						var ln = line.split(" ");
						if (ln[1] === "352") {
							// should be a who result.
							if (!globals.channels[ln[3]]) globals.channels[ln[3]] = {};
							if (!globals.channels[ln[3]].users) globals.channels[ln[3]].users = {};
							globals.channels[ln[3]].users[ln[7]] = { 
								nick: ln[7],
								address: ln[4]+"@"+ln[5],
								user: ln[7]+"!"+ln[4]+"@"+ln[5]
							};
						}
					}
					if (ret) return "[Serv] "+line;
					this.server(line);
					break;
			}
		}
	}
};
