listen({
	plugin: "netcraft",
	handle: "netcraft",
	regex: regexFactory.startsWith("netcraft"),
	command: {
		root: "netcraft",
		help: "Net Crafts",
		syntax: "[Help] Syntax: "+config.command_prefix+"netcraft http://some.site.org"
	},
	callback: function (input, match) {
		var uri, reg, resp;
		if (!match[1].match(/https?:\/\/[^ ]+\.[^ ]+/i)) {
			irc.say(input.context, config.command_prefix+"netcraft http://www.pantsu.org");
			return;
		}
		uri = "http://mirror.toolbar.netcraft.com/check_url/"+match[1];
		web.get(uri, function (error, response, body) {
			reg = /(.*) (Rank:.*) Site Report (.*)$/i.exec(lib.stripHtml(body));
			resp = [ reg[1] ];
			if (reg[2].slice(-1) !== "-") resp.push(reg[2]);
			resp.push(reg[3]);
			irc.say(input.context, resp.join(", "));
		});
	}
});
