var fs = require('fs');

global.irc_config = {};

function validNick(nick) {
	if (nick[0] === "-") return false;
	return /(^[a-zA-Z0-9_\-\[\]\{\}\^`\|]*$)/.test(nick);
}

function singleSpace(text) { // "foo  bar " -> "foo bar"
	var i, ret, l;
	if (text.indexOf("  ") > -1) {
		i = 0; ret = ""; text = text.split(" "); l = text.length;
		while (i < l) {
			if (text[i].length > 0) ret += text[i]+" ";
			i++;
		}
		return ret.slice(0, -1);
	} else {
		if (text[0] === " ") text = text.slice(1);
		if (text[text.length-1] === " ") text = text.slice(0,-1);
	}
	return text;
}

function parseEntry(entry) {
	var ret;
	if (entry.indexOf(",") > -1) {
		ret = [];
		entry.split(",").forEach(function (element) {
			if (element.length > 0) ret.push(singleSpace(element));
		});
		return ret;
	}
	if (entry === "true") return true;
	if (entry === "false") return false;
	return entry;
}

function validateConfigEntry(field, entry) {
	var i;
	switch (field) {
		case "nickname":
			if (!Array.isArray(entry)) {
				logger.error(" *** Invalid nicknames entry in config - should look like: \"nicknames: nick1, nick2, nick3\"");
				return false;
			}
			for (i = 0; i < entry.length; i++) {
				if (!validNick(entry[i])) {
					console.log(" *** Invalid nick characters found in nick: \""+entry[i]+"\" - Allowed: a-z A-Z 0-9 _ - [ ] { } ^ ` - no spaces.");
					return false;
				}
			}
			break;
	}
	return true;
}

function parseConf(conf) {
	var i = 0, entry, tmp = [], reg, field, entry,
		l = conf.length;
	for (; i < l; i++) {
		if (conf[i] && conf[i][0] !== "#") {
			entry = singleSpace(conf[i]).split(": ");
			if (entry[0].length > 4 && entry[0].slice(0,3) === "api") {
				irc_config.api = irc_config.api || {};
				irc_config.api[entry[0].slice(entry[0].indexOf(" ")+1)] = parseEntry(entry[1]);
			} else {
				entry[0] = entry[0].replace(" ", "_");
				entry[1] = parseEntry(entry[1]);
				if (!validateConfigEntry(entry[0], entry[1])) {
					console.log("*** Found a problem with your config ~ would exit here.");
				}
				irc_config[entry[0]] = entry[1];
			}
		}
	}
	irc_config.nick = irc_config.nickname[0];
}

parseConf(singleSpace(fs.readFileSync("config").toString()).split("\n"));

