/**
 * Scripts should use these functions to populate the regex parameter
 * of the listen function in a standardized way.
 */
"use strict";

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gi, "\\$&");
}

function matchAny(strings) {
	return "(?:"+strings.map(function (s) { return escapeRegExp(s); }).join("|")+")";
}

exports.matchAny = matchAny;

exports.actionMatching = function (nicknames) {
	return new RegExp("(?:\\x01ACTION (.*)\\s(" + matchAny(nicknames) + "[,\\'\\s]?)(.*)\\x01)", "i");
};
