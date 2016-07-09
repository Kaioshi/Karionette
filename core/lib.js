"use strict";
// General Helpers
let memProfcache = {},
	timedCache = {},
	memuseLast = process.memoryUsage().rss;

function firstHit(arr) {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].length > 0)
			return arr[i];
	}
	return "[no valid arg]";
}

function plural(n, word) {
	return (n > 1 || n === 0 ? word+"s" : word);
}

function space(text, len) {
	let ret = "",
		diff = len-text.length;
	while (diff > 0) {
		ret = ret+" ";
		diff--;
	}
	return ret+text;
}

function inteSupp (str, obj) { // this matches on the entire '{word}' rather than 'word'
	return str.replace(/(\{[^\{\}\(\)\[\] ]+\})/g, function (a, b) {
		return typeof obj[b] === "string" ? obj[b] : a;
	});
}

const lib = {
	decode: require("./lib/entities.js").decode,
	space: space,
	delay: function libDelay(fn, delay) { // promise version of setTimeout
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(fn());
			}, delay);
		});
	},
	timestamp: function (line) {
		let time = new Date().toLocaleTimeString();
		if (line)
			return time+" "+line;
		return time;
	},
	commaNum: function (n) {
		if (typeof n === "string")
			return Number(n).toLocaleString();
		return n.toLocaleString();
	},
	commaList: function (arr) {
		if (arr.length > 1) {
			return arr.slice(0,-1).join(", ")+" and "+arr[arr.length-1];
		} else {
			return arr[0];
		}
	},
	formatOutput: function (template, replacements, discard) {
		return template.replace(/\{([^\{\} ]+)\}/g, function (a, b) {
			if (discard)
				return (typeof replacements[b] === "string" ? replacements[b] : "");
			return (typeof replacements[b] === "string" ? replacements[b] : a);
		});
	},
	supplant: function (string, o, n) {
		let i, result;
		n = n || 1;
		for (i = 0; i < n; i += 1) {
			result = inteSupp(string, o);
		}
		if (result.match(/\{\((.*\|?)\)\}/)) {
			result = lib.parseVarList(result);
		}
		if (result.match(/\{\[(.*\|?)\]\}/)) {
			return lib.molest(result);
		}
		return result;
	},
	randVarListItem: function (match) {
		return lib.randSelect(match.slice(2, -2).split(/\s?\|\s?/));
	},
	parseVarList: function (str) {
		// Errryday I'm fondlin'
		let result, regex;
		regex = /\{\([^\{]*?[^\(]*?\)\}/g;
		result = str.replace(regex, lib.randVarListItem.bind(this));
		if (result.match(regex)) {
			return lib.parseVarList(result);
		}
		return lib.singleSpace(result);
	},
	molest: function (result) {
		let reg,
			res2 = result;

		while ((reg = /(\{\[(.*?|)\]\})/.exec(res2))) {
			reg[2] = reg[2].split("|");
			result = result.replace(reg[1], firstHit(reg[2]).trim());
			res2 = res2.slice(res2.indexOf(reg[1])+reg[1].length+1);
		}
		res2 = null; reg = null;
		return lib.singleSpace(result);
	},
	stringContainsAny: function (string, matches, ignoreCase) {
		let i, line = string.slice();
		if (ignoreCase)
			line = line.toLowerCase();
		for (i = 0; i < matches.length; i++) {
			if (ignoreCase && line.indexOf(matches[i].toLowerCase()) > -1)
				return true;
			if (line.indexOf(matches[i]) > -1)
				return true;
		}
		return false;
	},
	singleSpace: function (lineOfText) { // the new champion!
		let str = lineOfText;
		if (str.indexOf("  ") > -1) {
			let i, ret = [];
			str = str.split(" ");
			for (i = 0; i < str.length; i++) {
				if (str[i].length > 0)
					ret.push(str[i]);
			}
			return ret.join(" ");
		}
		if (str[0] === " ")
			str = str.slice(1);
		if (str[str.length-1] === " ")
			return str.slice(0, -1);
		return str;
	},
	validNick: function (nick) { // returns true or false if the nick contains valid characters
		if (nick[0] === "-")
			return false;
		return /(^[a-zA-Z0-9_\-\[\]\{\}\^`\|]*$)/.test(nick);
	},
	stripHtml: function (text) {
		return lib.singleSpace(text.replace(/\n|\t|\r/g, " ").replace(/<[^<]+?>/g, " "));
	},
	randSelect: function (yarr) {
		return yarr.length > 1 ? yarr[Math.floor(Math.random() * yarr.length)] : yarr[0];
	},
	randNum: function (min, max) {
		return Math.floor(Math.random()*(max-min+1)+min);
	},
	chance: function (n) {
		return (Math.floor(Math.random()*100) <= (n ? n : 50));
	},
	nodeVersion: function () {
		return "I am running Node.js "+process.version+" on "+process.platform+".";
	},
	memUse: function (raw) {
		if (raw) return process.memoryUsage().rss;
		return (((process.memoryUsage().rss) / 1024) / 1024).toString().slice(0, 5);
	},
	memProf: function (desc) { // this doesn't work, really. too much going on at any given time. sadface
		let diff;
		if (!memProfcache[desc]) {
			memProfcache[desc] = process.memoryUsage().rss;
			return;
		}
		diff = (process.memoryUsage().rss - memProfcache[desc]);
		if (diff > 0) {
			console.log(lib.timestamp(desc+" added "+lib.commaNum((diff/1024))+" KiB."));
		} else if (diff < 0) {
			console.log(lib.timestamp(desc+" freed "+lib.commaNum((diff/1024).toString().slice(1))+" KiB."));
		}
		delete memProfcache[desc];
		diff = null;
	},
	memReport: function() {
		let memuse = process.memoryUsage().rss,
			report, diff;
		if (memuse !== memuseLast) {
			report = lib.commaNum(Math.floor(memuse/1024));
			diff = Math.floor(((memuse-memuseLast)/1024));
			if (diff > 0) {
				diff = " [+"+space(lib.commaNum(diff), 5)+" KiB]";
			} else {
				diff = " [-"+space(lib.commaNum(diff.toString().slice(1)), 5)+" KiB]";
			}
			logger.memr(report+" KIB"+diff);
			memuseLast = memuse;
		}
		memuse = null; report = null; diff = null;
	},
	timeReport: function(handle) {
		let diff;
		if (!timedCache[handle]) {
			timedCache[handle] = Date.now();
			return;
		}
		diff = (Date.now()-timedCache[handle]);
		logger.debug(handle+" took "+diff+"ms");
		delete timedCache[handle];
	},
	datestamp: function () {
		let month, day, year,
			date = new Date();
		month = (date.getMonth()+1).toString();
		month = (month > 9 ? month : "0"+month);
		day = date.getDate();
		day = (day > 9 ? day : "0"+day);
		year = date.getYear().toString().slice(1);
		return day+"/"+month+"/"+year;
	},
	sort: function (arr) { // case insensitive sort
		return arr.sort(function (a, b) {
			return a.toLocaleString().toLowerCase().localeCompare(b.toLocaleString().toLowerCase());
		});
	},
	hasElement: function (arr, match) { // shorthand to arr.some
		let i, entry;
		if (typeof match === "string") {
			entry = match.toLowerCase();
			for (i = 0; i < arr.length; i++)
				if (arr[i].toLowerCase() === entry)
					return true;
			return false;
		} else {
			return arr.indexOf(match) > -1;
		}
	},
	duration: function (basetime, altTime, short) {
		let secs, mins, hours, days, years, duration;
		secs = Math.floor(((altTime || new Date())-basetime)/1000);
		if (secs <= 0)
			return (short ? "0s" : "0 seconds"); // clock may be running slow :/
		mins = Math.floor(secs / 60);
		hours = Math.floor(mins / 60);
		days = Math.floor(hours / 24);
		years = Math.floor(days / 365.25);
		duration = "";
		secs = (secs % 60);
		mins = (mins % 60);
		hours = (hours % 24);
		days %= 365.25; days = Math.round(days);
		if (years)
			duration = years+(short ? "y " : plural(years, " year")+", ");
		if (days)
			duration += days+(short ? "d " : plural(days, " day")+", ");
		if (hours)
			duration += hours+(short ? "h " : plural(hours, " hour")+", ");
		if (mins)
			duration += mins+(short ? "m " : plural(mins, " minute")+" and ");
		duration += secs+(short ? "s" : plural(secs, " second"));
		return duration;
	},
	fs: {
		makePath: function (p) {
			let i, path, curPath;
			if (fs.existsSync(p))
				return true;
			path = p.split("/").slice(0, -1);
			curPath = "";
			for (i = 0; i < path.length; i++) {
				if (!path[i].length)
					continue;
				curPath += path[i]+"/";
				if (!fs.existsSync(curPath)) {
					try {
						fs.mkdirSync(curPath);
					} catch (err) {
						console.error("Couldn't create "+curPath+" directory: "+err, err);
						return false;
					}
				}
			}
			return true;
		}
	}
};

plugin.declareGlobal("lib", "lib", lib);
