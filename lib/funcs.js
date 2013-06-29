// General Helpers
var fs = require('fs');

lib = {
	supplant: function (string, o, n) {
		'use strict';
		n = n || 1;
		var i, result,
			inteSupp = function (str, obj) {
				return str.replace(/(\{\w*((?:-\d)|\*)?\})/gi, function (a, b) {
					var r = obj[b];
					return typeof r === 'string' ?
							r : a;
				});
			};
		for (i = 0; i < n; i += 1) {
			result = inteSupp(string, o);
		}
		return result;
	},
	mix: function (from, to, overwrite) {
		var property;
		for (property in from) {
			if (!to[property] || overwrite) {
				to[property] = from[property];
			}
		}
		return to;
	},
	memUse: function () {
		return (((process.memoryUsage().rss) / 1024) / 1024).toString().slice(0, 5);
	},
	timestamp: function (line) {
		if (line) return "[" + new Date().toTimeString("%H:%M:%S").slice(0,8) + "] " + line;
		return "[" + new Date().toTimeString("%H:%M:%S").slice(0,8) + "]";
	},
	duration: function (basetime, altTime) {
		if (basetime) {
			var timeNow = altTime || new Date(),
				dura = timeNow - basetime,
				secs = Math.floor(dura / 1000),
				mins = Math.floor(secs / 60),
				hours = Math.floor(mins / 60),
				days = Math.floor(hours / 24),
				years = Math.floor(days / 365.25),
				duraIs = [];
			secs = (secs % 60);
			mins = (mins % 60);
			hours = (hours % 24);
			days %= 365.25;
			if (years) duraIs.push(years + " years, ");
			if (days) duraIs.push(days + " days, ");
			if (hours) duraIs.push(hours + " hours, ");
			if (mins) duraIs.push(mins + " minutes and ");
			duraIs.push(secs + " seconds");
			return duraIs.join("");
		}
	}
};

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
					var nicks = (/^:([^ ]+)!([^ ]+@[^ ]+) NICK :([^ ]+)/i).exec(line);
					if (nicks[1] === irc_config.nickname[0]) {
						irc_config.nickname[0] = nicks[3];
						logger.info("Updated irc_config.nickname[0]: "+nicks[1]+"->"+nicks[3]);
					}
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