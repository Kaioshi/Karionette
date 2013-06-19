Funcs = {
	supplant: function (string, o) {
		'use strict';
		string = string.replace(/({\w*((?:-\d)|\*)?})/gi, function (a, b) {
				var r = o[b];
				return typeof r === 'string' ?
					r : a;
		});
		
		return string.replace(/({\w*((?:-\d)|\*)?})/gi, function (a, b) {
				var r = o[b];
				return typeof r === 'string' ?
					r : a;
		});
	},
	mix: function (from, to, overwrite) {
		var property;
		for (property in from) {
			if (!to[property] || overwrite) {
				to[property] = from[property];
			}
		}
		//console.log(to);
		return to;
	},
	memUse: function() {
	    return (((process.memoryUsage().rss)/1024)/1024).toString().slice(0,5);
	}
};

Logger = function () {
    if (irc_config.logging == "silent" || irc_config.logging == "off") return;
    var args = Array.prototype.slice.call(arguments);
    var yargs = args[0].split(" ");
    if (irc_config.logging_nochat == "true" && (yargs[2] === "PRIVMSG" || yargs[2] === "NOTICE")) return;
    if (irc_config.logging_noping == "true" && yargs[1] === "PING") return;
    if (irc_config.logging_nomotd == "true" && (yargs[2] === "372" || yargs[2] === "376" || yargs[2] === "375")) return;
    if (irc_config.logging_nowrite == "true" && yargs[0] === "JSON" && yargs[1] === "saved") return;
    console.log(args.join(" "));
};
