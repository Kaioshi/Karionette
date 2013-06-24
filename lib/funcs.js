// General Helpers
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
	}
};

log2_filter = function(data) {
	// figure out what category server output belongs to. [chat/servermsg/traffic/etc]
	if (data.slice(0,4) === "PING") return;
	var type = "misc",
		arr = data.split(" ");
	
	if (arr) {
		switch (arr[1]) {
		case "JOIN":
			type = "traffic";
			break;
		case "PART":
			type = "traffic";
			break;
		case "QUIT":
			type = "traffic";
			break;
		case "TOPIC":
			type = "traffic";
			break;
		case "MODE":
			type = "traffic";
			break;
		case "PRIVMSG":
			type = "chat";
			break;
		case "NOTICE":
			if (arr[0].indexOf('@') > -1) type = "chat";
			else type = "servermsg";
			break;
		default:
			type = "servermsg";
			break;
		}
	}
	log2(type, data);
}

log2 = function(type, line) {
	// types: "filter", "info", "chat", "servermsg", "traffic", "error", "warn", "sent", "plugin"
	if (type && line) {
		switch (type) {
		case "chat":
			if (!irc_config.logging_chat) return;
			line = "[Chat] " + line;
			break;
		case "traffic":
			if (!irc_config.logging_traffic) return;
			line = "[Traf] " + line;
			break;
		case "info":
			if (!irc_config.logging_info) return;
			line = "[Info] " + line;
			break;
		case "servermsg":
			if (!irc_config.logging_serv) return;
			line = "[Serv] " + line;
			break;
		case "error":
			line = "[Error] " + line;
			break;
		case "warn":
			line = "[Warning] " + line;
			break;
		case "sent":
			line = "[Sent] " + line;
			break;
		case "plugin":
			line = "[Plugin] " + line;
			break;
		default:
			line = "[Misc] " + line;
			break;
		}
		if (irc_config.logging_timestamp) line = lib.timestamp(line);
		console.log(line);
	} else if (type) {
		// someone has gone log2("string"), spit it out.
		if (irc_config.logging_timestamp) type = lib.timestamp(type);
		console.log(type);
	}
}
