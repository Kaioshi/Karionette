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
	timestamp: function () {
		return "[" + new Date().toTimeString("%H:%M:%S").slice(0,8) + "]";
	}
};

logger = function () {
	if (irc_config.logging === "silent" || irc_config.logging === "off") return;
	var args = Array.prototype.slice.call(arguments);
	var yargs = args[0].split(" ");
	if (irc_config.logging_nochat == "true" && (yargs[2] === "PRIVMSG" || yargs[2] === "NOTICE")) return;
	if (irc_config.logging_nowrite == "true" && yargs[0] === "JSON" && yargs[1] === "saved") return;
	if (irc_config.logging_noping == "true" && yargs[1] === "PING") return;
	if (irc_config.logging_nomotd == "true" && (yargs[2] === "372" || yargs[2] === "376" || yargs[2] === "375")) return;
	console.log(lib.timestamp()+" "+args.join(" "));
};
