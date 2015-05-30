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

exports.actionMatching = function (nicknames) {
	return new RegExp(
		"(?:\\x01ACTION (.*)\\s(" + matchAny(nicknames) + "[,\\'\\s]?)(.*)\\x01)", "i");
}
