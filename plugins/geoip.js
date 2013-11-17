var url = require('url');

cmdListen({
	command: "geoip",
	help: "Stalks motherflippers",
	syntax: config.command_prefix + "geoip <nick/hostname/IP/url>",
	callback: function (input) {
		var uri, uri2, target, resp, nick, area;
		if (input.args && input.args[0].length > 0) {
			if (input.args[0].match(/\.|\:/)) {
				if (input.args[0].match(/https?:\/\/[^ ]+/)) target = url.parse(input.args[0]).host;
				else target = input.args[0];
			} else {
				if (input.context[0] !== "#") {
					irc.say(input.context, "You need to give me a hostname in queries.");
					return;
				}
				target = ial.User(input.args[0], input.context);
				if (target.address) {
					nick = target.nick;
					target = target.address.split("@")[1];
				} else {
					irc.say(input.context, "I don't see a "+input.args[0]+" in here.");
					irc.say(input.context, cmdHelp("geoip", "syntax"));
					return;
				}
			}
			uri = "http://smart-ip.net/geoip-json/"+target;
			uri2 = "http://ip-api.com/json/"+target;
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
				target = (nick ? nick : target);
				resp = "";
				if (body.host) target += " ("+body.host+")";
				if (body.countryName) resp += " "+body.countryName;
				if (body.region) area = " - "+body.region;
				if (body.city) area += ", "+body.city;
				if (area) resp += ", "+area;
				if (resp.length === 0) {
					resp = target+" is in [smart-ip]: no idea!";
				} else {
					resp = target+" is in [smart-ip]:"+resp;
				}
				web.get(uri2, function (error, response, body) {
					body = JSON.parse(body);
					if (body.status === "fail") {
						irc.say(input.context, body.message);
						return;
					}
					resp += " -- [ip-api]: "+body.country;
					if (body.regionName) resp += " - "+body.regionName;
					if (body.city) resp += ", "+body.city;
					irc.say(input.context, resp);
				});
			});
		} else {
			irc.say(input.context, cmdHelp("geoip", "syntax"));
		}
	}
});
