// I hate XML.
var fs = require("fs"),
	ent = require("./lib/entities.js");

/*function rssToJson(body) {
	var entries = [];
	globals.body = body;
	body = body.slice(body.indexOf("<item>"), body.lastIndexOf("</item>")+7)
		.replace(/_|\./g, " ")
		.replace(/\n|\t|  /g, "")
		.replace(/<item><title>/g, "{ \"release\": \"")
		.replace(/<\/title>/g, "\", ")
		.replace(/<category>/g, "\"category\": \"")
		.replace(/<\/category>/g, "\", ")
		.replace(/<link>/g, "\"link\": \"")
		.replace(/<\/link>/g, "\", ")
		.replace(/<guid>/g, "\"guid\": \"")
		.replace(/<\/guid>/g, "\", ")
		.replace(/<description>/g, "\"description\": \"")
		.replace(/<\/description>/g, "\", ")
		.replace(/<pubDate>/g, "\"date\": \"")
		.replace(/<\/pubDate>/g, "\"}")
		.replace(/<\!\[CDATA\[/g, "")
		.replace(/\]\]>/g, "")
		.split("</item>").slice(0,-1);
	body.forEach(function (item) {
		entries.push(JSON.parse(item));
	});
	body = null;
	return entries;
}*/

cmdListen({
	command: "nyaa",
	help: "Tracks shows / groups on Nyaa",
	syntax: config.command_prefix+"nyaa <search term>",
	callback: function (input) {
		var entries, uri;
		if (!input.args) {
			irc.say(input.context, cmdHelp("nyaa", "syntax"));
			return;
		}
		uri = "http://www.nyaa.se/?page=rss&cats=1_37&filter=2&term="+input.data;
		web.get(uri, function (error, resp, body) {
			if (body) {
				body = ent.decode(body);
				entries = [];
				body = body.slice(body.indexOf("<item>"), body.lastIndexOf("</item>")+7);
				if (body.length === 0) {
					irc.say(input.context, "There were no matches. I'm not sorry. :>");
					return;
				}
				body = body.replace(/_|\./g, " ")
					.replace(/<item>/g, "{").replace(/<title>/g, " \"release\": \"")
					.replace(/<\/title[^{]+>/g, "\" }OHEYMITCH_").slice(0,-10).split("OHEYMITCH_");
				body.forEach(function (entry) {
					entries.push(JSON.parse(entry).release);
				});
				lib.events.emit("Event: processNyaaDone", input, entries);
			}
		}, 4000);
	}
});

evListen({
	handle: "handleNyaa",
	event: "processNyaaDone",
	callback: function (input, results) {
		var i, line, reg, rel = {}, tmp;
		if (results.length === 0) {
			irc.say(input.context, "There were no matches, sorry.");
			return;
		}
		for (i = 0; i < results.length; i++) {
			reg = /\[(.*[^\&]+)\] (.*) - (.*) \[(.*)$/.exec(results[i]);
			if (reg) {
				if (!rel[reg[1]]) rel[reg[1]] = {};
				if (!rel[reg[1]][reg[2]]) rel[reg[1]][reg[2]] = [];
				if (!rel[reg[1]][reg[2]].some(function (item) { return (item === reg[3]); })) {
					rel[reg[1]][reg[2]].push(reg[3]);
				}
			} else {
				reg = /\[(.*[^\&]+)\] (.*) (\(|\[)(.*)$/.exec(results[i]);
				if (reg) {
					if (!rel[reg[1]]) rel[reg[1]] = {};
					rel[reg[1]][reg[2]] = [];
				}
			}
		}
		Object.keys(rel).forEach(function (group) {
			tmp = "["+group+"] have released: ";
			Object.keys(rel[group]).forEach(function (show) {
				if (rel[group][show].length > 0) {
					tmp = tmp+show+" - "+rel[group][show].join(", ")+" :: ";
				} else {
					tmp = tmp+show+" :: ";
				}
			});
			irc.say(input.context, ent.decode(tmp.slice(0,-4)));
		});
		tmp = null; reg = null;
	}
});
