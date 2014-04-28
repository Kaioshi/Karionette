/**
 * Scripts should use these functions to populate the regex parameter
 * of the listen function in a standardized way.
 */
"use strict";

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gi, "\\$&");
}

function ensureArray(stringOrArray) {
	if (typeof stringOrArray === "string") {
		return [stringOrArray];
	}
	return stringOrArray;
}

function makePrefix(prefixed) {
	if (prefixed === false) {
		return "";
	} else {
		return "(?:"
			+ escapeRegExp(irc_config.command_prefix) + " ?"
			+ "|"
			+ irc_config.nickname.map(function (nick) { return escapeRegExp(nick); }).join("[:,-]? |")
			+ "[:,-]? )"
			+ (prefixed === "optional" ? "?" : "");
	}
}

function matchAny(strings) {
	return "(?:"
		+ strings.map(function (s) { return escapeRegExp(s); }).join("|")
		+ ")";
}

exports.matchAny = matchAny;

exports.onJoin = function () {
	return new RegExp("^:([^ ]+)!([^ ]+) JOIN :?([^ ]+)$");
}

exports.onPart = function () {
	return new RegExp("^:([^ ]+)!([^ ]+) PART ([^ ]+) ?:?(.*)$");
}

exports.onKick = function () {
	return new RegExp("^:([^ ]+)!([^ ]+) KICK ([^ ]+) ([^ ]+) :(.*)$");
}

exports.onQuit = function () {
	return new RegExp("^:([^ ]+)!([^ ]+) QUIT :(.*)$");
}

exports.onNick = function () {
	return new RegExp("^:([^ ]+)!([^ ]+) NICK :([^ ]+)$");
}

exports.onMsg = function () {
	return new RegExp("^:([^ ]+)!([^ ]+) PRIVMSG ([^ ]+) :(.*)$");
}

exports.actionMatching = function (nicknames) {
	return new RegExp(
		"(?:\\x01ACTION (.*)\\s(" + matchAny(nicknames) + "[,\\'\\s]?)(.*)\\x01)", "i");
}

exports.only = function (keywords, prefixed) {
	keywords = ensureArray(keywords);
	return new RegExp(
		"^:[^ ]+ PRIVMSG [^ ]+ :" + makePrefix(prefixed) + matchAny(keywords) + "$", "i");
};

exports.startsWith = function (keywords, prefixed) {
	keywords = ensureArray(keywords);
	return new RegExp(
		"^:[^ ]+ PRIVMSG [^ ]+ :" + makePrefix(prefixed) + matchAny(keywords) + "\\b ?(.*)$", "i");
};
