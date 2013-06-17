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
	}
};

Logger = function () {
	var args = Array.prototype.slice.call(arguments);
	if (irc_config.logging !== "silent") {
		console.log(args.join(" "));
	}
};