var url = require('url');

listen({
	plugin: "geoip",
	handle: "geoip",
	regex: regexFactory.startsWith("geoip"),
	command: {
		root: "geoip",
		help: "Stalks motherflippers - Syntax: " + config.command_prefix + "geoip <nick/hostname/IP/url>",
		syntax: "[Help] Syntax: " + config.command_prefix + "geoip <nick/hostname/IP/url>"
	},
	callback: function (input, match) {
		var args = match[1].split(" "),
			uri, target, resp, nick, area;
		if (args && args[0].length > 0) {
			if (args[0].match(/\.|\:/)) {
				if (args[0].match(/https?:\/\/[^ ]+/)) target = url.parse(args[0]).host;
				else target = args[0];
			} else {
				if (input.context[0] !== "#") {
					irc.say(input.context, "You need to give me a hostname in queries.");
					return;
				}
				target = ial.User(args[0], input.context);
				if (target.address) {
					nick = target.nick;
					target = target.address.split("@")[1];
				} else {
					irc.say(input.context, "I don't see a "+args[0]+" in here.");
					irc.say(input.context, this.command.syntax);
					return;
				}
			}
			uri = "http://smart-ip.net/geoip-json/"+target;
			web.get(uri, function (error, response, body) {
				if (error) {
					logger.error("[GeoIP] Error - "+error);
					irc.say(input.context, "Something has gone awry.");
					return;
				}
				body = JSON.parse(body);
				if (!body) {
					irc.say(input.context, "GeoIP service didn't reply. :<");
					return;
				}
				if (body.error) {
					irc.say(input.context, body.error);
					return;
				}
				target = [ (nick ? nick : target) ];
				resp = [];
				if (body.host) target.push("("+body.host+")");
				if (body.countryName) resp.push(body.countryName);
				if (body.city) area = body.city;
				if (body.region) area += " "+body.region;
				if (area) resp.push(area);
				if (resp.length > 0) {
					irc.say(input.context, target.join(" ")+" is in "+resp.join(", "));
				} else {
					irc.say(input.context, "Ninja detected.");
				}
			});
		} else {
			irc.say(input.context, this.command.syntax);
		}
	}
});
