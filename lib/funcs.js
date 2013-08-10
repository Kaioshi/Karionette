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
		if (result.match(/\{\((.*?|)\)\}/)) {
			return this.fondle(result);
		}
		return result;
	},
	fondle: function (result) {
		// Errryday I'm fondlin'
		var reg, res2 = result;
		while ((reg = /(\{\((.*?|)\)\})/.exec(res2))) {
			reg[2] = reg[2].split('|');
			result = result.replace(reg[1], lib.randSelect(reg[2]).trim());
			res2 = res2.slice(res2.indexOf(reg[1])+reg[1].length+1);
		}
		// get rid of extra spaces left over from empty selections
		if (result.indexOf("  ") > -1) {
			res2 = result.split(" "), result = [];
			res2.some(function (item) {
				if (item.length > 0) result.push(item);
			});
			result = result.join(" ");
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
	stripHtml: function stripHtml(text) {
		var ret = "";
		text = text.replace(/\n/g, "").replace(/<[^<]+?>/g, "");
		text = text.trim();
		text.split(" ").forEach(function (entry) {
			if (entry.length > 0) ret = ret+entry+" ";
		});
		return ret.slice(0,-1);
	},
	randSelect: function (yarr) {
		return yarr[Math.floor(Math.random()*yarr.length)];
	},
	randNum: function (min, max) {
		var n;
		if (!max || min > max) return Math.floor(Math.random()*min);
		n = 0;
		while (n < min) {
			n = Math.floor(Math.random()*max);
		}
		return n;
	},
	chance: function (n) {
		return (Math.floor(Math.random()*100) <= (n ? n : 50));
	},
	memUse: function (raw) {
		if (raw) return process.memoryUsage().rss;
		return (((process.memoryUsage().rss) / 1024) / 1024).toString().slice(0, 5);
	},
	memProf: function (func) {
		var diff;
		if (!globals.memProf) globals.memProf = {};
		if (!globals.memProf[func]) {
			globals.memProf[func] = process.memoryUsage().rss;
			return;
		}
		diff = (process.memoryUsage().rss - globals.memProf[func]);
		if (diff > 0) {
			console.log(func+" added "+(diff/1024)+" Kilobytes.");
		} else if (diff < 0) {
			console.log(func+" freed "+(diff/1024).toString().slice(1)+" Kilobytes.");
		}
		delete globals.memProf[func];
	},
	timestamp: function (line) {
		if (line) return "[" + new Date().toTimeString().slice(0,8) + "] " + line;
		return "[" + new Date().toTimeString().slice(0,8) + "]";
	},
	duration: function (basetime, altTime) {
		var secs = Math.floor(((altTime || new Date())-basetime)/1000),
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
};

