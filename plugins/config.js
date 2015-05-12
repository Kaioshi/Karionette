// config fondler

function configEntryToString(entry) {
	var entries;
	switch (typeof entry) {
	case 'string':
		return entry;
	case 'number':
		return entry.toString();
	case 'object':
		if (entry.length !== undefined)
			return entry.join(", ");
		// must be the api object
		return "you have to edit the config directly to mess with APIs.";
	case 'boolean':
		return entry.toString();
	default:
		// shouldn't happen
		logger.debug("configEntryToString() got to default switch case: "+entry);
		return entry.toString();
	}
}

function changeConfig(field, entry) { // for user input to config
	var type, api;
	// these are auto generated or a function.
	if (field.match(/nick$|saveChanges|address/i))
		return false;
	// new entry!? need a validator for this in future
	if (config[field] === undefined) {
		config[field] = entry;
		config.saveChanges();
		return true;
	}
	type = typeof config[field];
	switch (type) {
	case 'string':
		config[field] = entry;
		config.saveChanges();
		return true;
	case 'object':
		if (config[field].length !== undefined) { // array
			config[field] = entry.split(", ");
			config.saveChanges();
			return true;
		} // must be the api object.
		if (field.slice(0,3) === "api" && field.indexOf("_") > -1) {
			api = field.split("_")[1];
			config.api[api] = entry;
			config.saveChanges();
			return true;
		}
		return false;
	case 'boolean':
		switch (entry.toLowerCase()) {
		case '1':
		case 'on':
		case 'yes':
		case 'true':
			config[field] = true;
			config.saveChanges();
			return true;
		case '0':
		case 'off':
		case 'no':
		case 'false':
			config[field] = false;
			config.saveChanges();
			return true;
		default:
			logger.error("Tried to set config."+field+" to a non-boolean value ("+entry+")");
			return false;
		}
		return false;
	default: // should not end up here
		logger.debug("Got to default in changeConfig()");
		return false;
	}
}

function needsCensor(field) {
	switch (field) {
	case 'nickserv password':
		return true;
	}
}

function needsRestart(field) {
	switch (field) {
	case "autojoin":
	case "username":
	case "realname":
	case "server":
	case "port":
	case "local whippingboys":
	case "disabled plugins":
		return " A bot restart is needed for this to take effect.";
	default:
		return "";
	}
}

cmdListen({
	command: "config",
	help: "Edits the config. Don't touch this unless you know what you're doing.",
	syntax: config.command_prefix+"config set <field>: <new setting> / "+config.command_prefix+"config find <term>",
	admin: true,
	callback: function (input) {
		var line, field, entry, index, entries, term;
		if (!lib.checkArgs(input.context, "config", input.args, 1))
			return;
		switch (input.args[0].toLowerCase()) {
		case "find":
			if (!input.args[1]) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"config find <term> - Example: "
					+config.command_prefix+"config find youtube");
				return;
			}
			term = input.args.slice(1).join(" ").toLowerCase();
			entries = Object.keys(config), ret = [], send = [];
			entries.forEach(function (entry) {
				if (entry.indexOf(term) > -1) {
					if (!entry.match(/saveChanges|nick$|address$/i)) {
						if (entry === "api") {
							Object.keys(config[entry]).forEach(function (item) {
								ret.push("api "+item+": <censored, edit the config directly>");
							});
						} else {
							field = entry.replace(/_/g, " ");
							if (needsCensor(field))
								ret.push(field+": <censored, edit the config directly>");
							else
								ret.push(field+": "+configEntryToString(config[entry]));
						}
					}
				}
			});
			if (ret.length) {
				if (ret.length === 1) {
					irc.say(input.context, ret[0], false);
				} else {
					ret.forEach(function (entry) {
						send.push([ "say", input.context, entry, false ]);
					});
					irc.rated(send);
				}
			} else {
				irc.say(input.context, "No config entry matched \""+term+"\".", false);
			}
			break;
		case "set":
			line = input.args.slice(1).join(" ");
			index = line.indexOf(":");
			if (!input.args[1] || !input.args[2] || index === -1) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"config set <field>: <new setting> - Example: "+config.command_prefix+
					"config set autojoin: #pyoshi, #anime");
				return;
			}
			field = line.slice(0, index);
			entry = line.slice(index+1).trim();
			if (changeConfig(field.replace(/ /g, "_"), entry))
				irc.say(input.context, "Success!"+needsRestart(field));
			else
				irc.say(input.context, "Nope.");
			break;
		case "help": // REMINDER: add this.
		default:
			irc.say(input.context, cmdHelp("config", "syntax"));
			break;
		}
	}
});

