"use strict";
// config fondler

var configHelp = {
	"command prefix": "Character used before commands. Currently: "+config.command_prefix,
	"server": "Server the bot connects to. Currently: "+config.server,
	"port": "Port the bot connects on. Currently: "+config.port,
	"realname": "Bot's \"realname\", shows up in /whois. Currently: "+config.realname,
	"nickname": "Comma separated list of nicks for the bot. Uses the first one by default, switches if it's taken. Currently: "+
		config.nickname.join(", "),
	"username": "Bot's username, shows up in /whois and join/part etc. Currently: "+config.username,
	"autojoin": "Comma separated list of channels for the bot to join after connecting. Currently: "+config.autojoin.join(", "),
	"secret": "Secret password to become admin.",
	"logging timestamp": "Timestamps the bot's output. Currently: "+config.logging_timestamp,
	"logging info": "Shows writes and things in the bot's output. Currently: "+config.logging_info,
	"logging debug": "Shows debug lines. You probably don't want this on. Currently: "+config.logging_debug,
	"logging chat": "Shows user chat lines. Currently: "+config.logging_chat,
	"logging serv": "Shows server output. Currently: "+config.logging_serv,
	"logging traffic": "Shows user join/part/mode/topic etc. Currently: "+config.logging_traffic,
	"api wordnik": "The API Key needed for the Wordnik plugin. Provides "+config.command_prefix+
		"define - You must edit the config directly to enter/change API keys. Source: http://developer.wordnik.com",
	"api lfm": "The API Key needed for the last.fm plugin. You must edit the config directly to enter/change API keys. Source: http://last.fm",
	"api googlesearch": "The API Key needed for Google plugin. You must edit the config directly to enter/change API keys. "+
		"Source: https://developers.google.com/custom-search/",
	"api youtube": "The API Key needed for the YouTube plugin. You must edit the config directly to enter/change API keys. "+
		"Source: https://developers.google.com/youtube/v3/getting-started#before-you-start",
	"local whippingboys": "Comma separated list of nicks / names to be used in comical replies by the bot.",
	"disabled plugins": "Comma separated list of plugins to not load. Currently: "+
		(config.disabled_plugins ? config.disabled_plugins.join(", ") : "None disabled"),
	"titlesnarfer inline": "Use inline html regex to find page titles, rather than the felt.ninja tool. Currently: "+config.titlesnarfer_inline,
	"youtube format": "Defines the format used in "+config.command_prefix+"yt search responses. Available fields are {title} {duration} {date}"+
		" {channel} {views} {link} {b}. {b} is the bold character, surround a word with it to make it bold. Currently: "+config.youtube_format,
	"titlesnarfer youtube format": "Defines the format used by titlesnarfer when it encounters YouTube links. Available fields are {title} "+
		"{duration} {date} {channel} {views} {b}. {b} is the bold character, surround a word with it to make it bold. Currently: "+
		config.titlesnarfer_youtube_format,
	"google format": "Defines the format used in "+config.command_prefix+"g search responses. Available fields are {title} {url} {content} {b}."+
		" {b} is the bold character, surround a word with it to make it bold. Currently: "+config.google_format
};

function configEntryToString(entry) {
	switch (typeof entry) {
	case "string":
		return entry;
	case "number":
		return entry.toString();
	case "object":
		if (Array.isArray(entry))
			return entry.join(", ");
		// must be the api object
		return "you have to edit the config directly to mess with APIs.";
	case "boolean":
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
	if (entry === undefined || entry.length === 0)
		return false;
	// new entry!? need a validator for this in future
	if (config[field] === undefined) {
		config[field] = entry;
		config.saveChanges();
		return true;
	}
	type = typeof config[field];
	switch (type) {
	case "string":
		config[field] = entry;
		config.saveChanges();
		return true;
	case "object":
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
	case "boolean":
		switch (entry.toLowerCase()) {
		case "1":
		case "on":
		case "yes":
		case "true":
			config[field] = true;
			config.saveChanges();
			return true;
		case "0":
		case "off":
		case "no":
		case "false":
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
	case "nickserv password":
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
	case "enabled plugins":
	case "disabled plugins":
		return " A bot restart is needed for this to take effect.";
	default:
		return "";
	}
}

bot.command({
	command: "config",
	help: "Edits the config. Don't touch this unless you know what you're doing.",
	syntax: config.command_prefix+"config set <field>: <new setting> / "+config.command_prefix+"config find <term>",
	admin: true,
	arglen: 1,
	callback: function (input) {
		var line, field, entry, index, entries, term, ret, send;
		switch (input.args[0].toLowerCase()) {
		case "find":
			if (!input.args[1]) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"config find <term> - Example: "+
					config.command_prefix+"config find youtube");
				return;
			}
			term = input.args.slice(1).join(" ").toLowerCase();
			entries = Object.keys(config); ret = []; send = [];
			entries.forEach(function (entry) {
				if (entry.indexOf(term) === -1)
					return;
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
			});
			if (ret.length) {
				if (ret.length >= 3) {
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
		case "help":
			term = input.args.slice(1).join(" ").toLowerCase();
			if (!term)
				irc.say(input.context, "Config fields are: "+lib.commaList(Object.keys(configHelp)), false);
			else if (!configHelp[term])
				irc.say(input.context, "That isn't a valid config entry.");
			else
				irc.say(input.context, term+" - "+configHelp[term].replace(/undefined$/, "Not set"), false);
			break;
		default:
			irc.say(input.context, bot.cmdHelp("config", "syntax"));
			break;
		}
	}
});
