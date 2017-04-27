"use strict"; // TODO: redo this.
const [fs, console] = plugin.importMany("fs", "console"),
	validNickTest = /(^[a-zA-Z0-9_\-\[\]\{\}\^`\|]*$)/;

function configIsValid(config) {
	const NEED = [ "nickname", "username", "server", "port", "realname", "command_prefix", "secret" ];
	for (let i = 0; i < NEED.length; i++)
		if (config[NEED[i]] === undefined)
			throw new Error(`"${NEED[i].replace(/_/g, " ")}" is not set in your config. See config.example`);
	return true;
}

function validNick(nick) {
	if (nick[0] === "-")
		return false;
	return validNickTest.test(nick);
}

function singleSpace(lineOfText) { // "foo  bar " -> "foo bar"
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
}

function parseEntry(field, entry) {
	switch (field.toLowerCase()) {
	case "autojoin":
	case "local_whippingboys":
	case "enabled_plugins":
	case "disabled_plugins": {
			let ret = [];
			entry.split(",").forEach(function (element) {
				if (element.length > 0)
					ret.push(singleSpace(element));
			});
			return ret;
		}
	}
	if (entry.toLowerCase() === "true")
		return true;
	if (entry.toLowerCase() === "false")
		return false;
	return entry;
}

function validateConfigEntry(field, entry) { // TODO: add more checks here
	switch (field) {
	case "nickname":
		if (!validNick(entry)) {
			console.log(" * Invalid nick characters found in nick: \""+entry+
				"\" - Allowed: a-z A-Z 0-9 _ - [ ] { } ^ ` | - no spaces.");
			return false;
		}
		return true;
	default:
		return true;
	}
}

function parseConf(conf) {
	let config = {};
	for (let i = 0; i < conf.length; i++) {
		let configLine = conf[i];
		if (!configLine || !configLine.length || configLine[0] === "#")
			continue;
		let [field, entry] = [ configLine.slice(0, configLine.indexOf(": ")), configLine.slice(configLine.indexOf(": ")+2) ];
		if (field.length > 4 && field.slice(0,4) === "api ") {
			config.api = config.api || {};
			config.api[field.slice(4)] = entry;
		} else {
			field = field.replace(/ /g, "_");
			entry = parseEntry(field, entry);
			if (!validateConfigEntry(field, entry))
				throw new Error("Found a problem in your config ~ look at config.example and match the formatting.");
			config[field] = entry;
		}
	}
	try {
		configIsValid(config);
	} catch (e) {
		console.log(" * "+e.message);
		process.exit(1);
	}
	config.nick = config.nickname;
	return config;
}

let irc_config;

try {
	irc_config = parseConf(singleSpace(fs.readFileSync("config").toString()).split("\n"));
} catch (e) {
	if (e.code === "ENOENT")
		console.error(" * No config file found, see config.example");
	else
		console.log(" * "+e.message);
	process.exit(1);
}

// irc_config.saveChanges = function () { // saves changes and returns how many changes were made.
// 	let field, entry, changes, // while preserving the file layout.
// 		newconf = {}, fields = [],
// 		oldconfig = fs.readFileSync("config").toString().split("\n");

// 	Object.keys(irc_config).forEach(function (field) {
// 		if (/nick|saveChanges|address/.test(field))
// 			return;
// 		if (field === "api") {
// 			Object.keys(irc_config[field]).forEach(function (subfield) {
// 				entry = field+" "+subfield;
// 				entry = entry.replace(/_/g, " ");
// 				newconf[entry] = irc_config[field][subfield];
// 			});
// 		} else {
// 			entry = field.replace(/_/g, " ");
// 			if (Array.isArray(irc_config[field]))
// 				newconf[entry] = irc_config[field].join(", ");
// 			else
// 				newconf[entry] = irc_config[field].toString();
// 		}
// 	});
// 	// change existing entries
// 	changes = 0;
// 	for (let i = 0, l = oldconfig.length; i < l; i++) {
// 		if (!oldconfig[i] || oldconfig[i][0] === "#")
// 			continue;
// 		field = oldconfig[i].slice(0, oldconfig[i].indexOf(": "));
// 		fields.push(field);
// 		entry = oldconfig[i].slice(oldconfig[i].indexOf(": ")+2);
// 		if (newconf[field] === undefined) { // deleted entry
// 			oldconfig.splice(i, 1); i--; l--;
// 			changes++;
// 		} else if (newconf[field] !== entry) {
// 			oldconfig[i] = field+": "+newconf[field];
// 			changes++;
// 		}
// 	}
// 	// append any new entries
// 	Object.keys(newconf).forEach(function (field) {
// 		if (fields.indexOf(field) === -1) {
// 			oldconfig.push(field+": "+newconf[field]);
// 			changes++;
// 		}
// 	});

// 	if (changes)
// 		fs.writeFileSync("config", oldconfig.join("\n"));
// 	oldconfig = null; newconf = null;
// 	return changes;
// };

plugin.global("config", irc_config);
