var url = require('url');

cmdListen({
	command: "geoip",
	help: "Stalks motherflippers",
	syntax: config.command_prefix + "geoip <nick/hostname/IP/url>",
	callback: function (input) {
		var uri, target, resp, nick, area, blame;
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
				if (target && target.address) {
					nick = target.nick;
					target = target.address.split("@")[1];
				} else {
					irc.say(input.context, "I don't see a "+input.args[0]+" in here.");
					irc.say(input.context, cmdHelp("geoip", "syntax"));
					return;
				}
			}
			uri = "http://ip-api.com/json/"+target;
			web.get(uri, function (error, response, body) {
				target = (nick ? nick : target);
				body = JSON.parse(body);
				if (body.status === "fail") {
					blame = lib.randSelect(ial.Active(input.context));
					if (!blame || blame === input.nick) blame = lib.randSelect(config.local_whippingboys);
					irc.say(input.context, "ip-api reported a failure status, sorry. Blame "+blame+lib.randSelect([".", "!", "?"]));
					return;
				} else {
					resp = target+" is in "+body.country;
					if (body.regionName) resp += " - "+body.regionName;
					if (body.city) resp += ", "+body.city;
				}
				irc.say(input.context, resp+".");
			});
		} else {
			irc.say(input.context, cmdHelp("geoip", "syntax"));
		}
	}
});
