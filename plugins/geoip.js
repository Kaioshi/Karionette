listen({
	plugin: "geoip",
	handle: "geoip",
	regex: regexFactory.startsWith("geoip"),
	command: {
		root: "geoip",
		help: "Stalks motherflippers",
		syntax: "[Help] Syntax: " + config.command_prefix + "geoip <hostname/IP address/nick>"
	},
	callback: function (input, match) {
		var args = match[1].split(" "),
			target, resp = [], isnick = false;
		if (args && args[0].length > 0) {
			if (args[0].indexOf('.') > -1) {
				if (args[0].indexOf('http') > -1) target = args[0].replace(/https?:\/\//,'');
				else target = args[0];
			} else {
				target = ial.User(args[0], input.context);
				if (target) {
					target = target.address.split("@")[1];
					isnick = true;
				} else {
					irc.say(input.context, "I don't see a "+args[0]+" in here.");
					irc.say(input.context, this.command.syntax);
					return;
				}
			}
			web.get("http://freegeoip.net/json/"+target, function (error, response, body) {
				if (error) {
					logger.error("[GeoIP] Error - "+error);
					irc.say(input.context, "Something has gone awry.");
					return;
				}
				body = JSON.parse(body);
				if (body) {
					if (body.country_name) resp.push(body.country_name);
					if (body.city) resp.push(body.city);
				}
				if (resp.length > 0) {
					if (isnick) target = args[0];
					irc.say(input.context, target + " is in "+resp.join(", "));
				} else {
					irc.say(input.context, "Ninja detected.");
				}
			});
		} else {
			irc.say(input.context, this.command.syntax);
		}
	}
});
