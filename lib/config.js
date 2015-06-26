"use strict";
var fs = require('fs');

function validNick(nick) {
	if (nick[0] === "-")
		return false;
	return /(^[a-zA-Z0-9_\-\[\]\{\}\^`\|]*$)/.test(nick);
}

function singleSpace(text) { // "foo  bar " -> "foo bar"
	var i, ret;
	if (text.indexOf("  ") > -1) {
		i = 0; ret = ""; text = text.split(" ");
		while (i < text.length) {
			if (text[i].length > 0)
				ret += text[i]+" ";
			i++;
		}
		return ret.slice(0, -1);
	} else {
		if (text[0] === " ")
			text = text.slice(1);
		if (text[text.length-1] === " ")
			text = text.slice(0,-1);
	}
	return text;
}

function parseEntry(entry) {
	var ret = [];
	// these need to be arrays
	switch (entry[0].toLowerCase()) {
	case "autojoin":
	case "nickname":
	case "local_whippingboys":
	case "disabled_plugins":
		entry[1].split(",").forEach(function (element) {
			if (element.length > 0)
				ret.push(singleSpace(element));
		});
		return ret;
	}
	if (entry[1].toLowerCase() === "true")
		return true;
	if (entry[1].toLowerCase() === "false")
		return false;
	return entry[1];
}

function validateConfigEntry(field, entry) {
	var i;
	switch (field) {
	case "nickname":
		if (!Array.isArray(entry)) {
			console.error(" * Invalid nickname entry in config - should look like: \"nickname: nick1, nick2, nick3\"");
			return false;
		}
		for (i = 0; i < entry.length; i++) {
			if (!validNick(entry[i])) {
				console.log(" * Invalid nick characters found in nick: \""+entry[i]+
					"\" - Allowed: a-z A-Z 0-9 _ - [ ] { } ^ ` | - no spaces.");
				return false;
			}
		}
		break;
	}
	return true;
}

function parseConf(conf) {
	var i, entry, config = {};
	for (i = 0; i < conf.length; i++) {
		if (!conf[i] || conf[i][0] === "#")
			continue;
		entry = [ conf[i].slice(0, conf[i].indexOf(": ")), conf[i].slice(conf[i].indexOf(": ")+2) ];
		if (entry[0].length > 4 && entry[0].slice(0,3) === "api") {
			config.api = config.api || {};
			config.api[entry[0].slice(entry[0].indexOf(" ")+1)] = parseEntry(entry);
		} else {
			entry[0] = entry[0].replace(/ /g, "_");
			entry[1] = parseEntry(entry);
			if (!validateConfigEntry(entry[0], entry[1])) {
				console.error(" * Found a problem with your config ~ please take a look at config.example and match the formatting.");
				process.exit();
			}
			config[entry[0]] = entry[1];
		}
	}
	config.nick = config.nickname[0];
	return config;
}

module.exports = function () {
	var irc_config;

	irc_config = parseConf(singleSpace(fs.readFileSync("config").toString()).split("\n"));
	irc_config.saveChanges = function () { // saves changes and returns how many changes were made.
		var field, entry, i, l, tmp, changes, // while preserving the file layout.
			newconf = {}, oldconf = {}, fields = [],
			oldconfig = fs.readFileSync("config").toString().split("\n");

		Object.keys(irc_config).forEach(function (field) {
			if (field !== "nick" && field !== "address" && field !== "saveChanges") {
				if (field === "api") {
					Object.keys(irc_config[field]).forEach(function (subfield) {
						entry = field+" "+subfield;
						entry = entry.replace(/_/g, " ");
						newconf[entry] = irc_config[field][subfield];
					});
				} else {
					entry = field.replace(/_/g, " ");
					if (Array.isArray(irc_config[field]))
						newconf[entry] = irc_config[field].join(", ");
					else
						newconf[entry] = irc_config[field].toString();
				}
			}
		});
		// change existing entries
		tmp = oldconfig; changes = 0;
		for (i = 0, l = oldconfig.length; i < l; i++) {
			if (!oldconfig[i] || oldconfig[i][0] === "#")
				continue;
			field = oldconfig[i].slice(0, oldconfig[i].indexOf(": "));
			fields.push(field);
			entry = oldconfig[i].slice(oldconfig[i].indexOf(": ")+2);
			if (newconf[field] === undefined) { // deleted entry
				oldconfig.splice(i, 1); i--; l--;
				changes++;
			} else if (newconf[field] !== entry) {
				oldconfig[i] = field+": "+newconf[field];
				changes++;
			}
		}
		// append any new entries
		Object.keys(newconf).forEach(function (field) {
			if (fields.indexOf(field) === -1) {
				oldconfig.push(field+": "+newconf[field]);
				changes++;
			}
		});

		if (changes)
			fs.writeFileSync("config", oldconfig.join("\n"));
		tmp = null; oldconfig = null; newconf = null; oldconf = null;
		return changes;
	};

	return irc_config;
};
