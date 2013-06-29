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
