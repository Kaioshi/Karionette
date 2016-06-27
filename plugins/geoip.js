"use strict";
let url = require("url");

bot.command({
	command: "geoip",
	help: "Stalks motherflippers",
	syntax: config.command_prefix + "geoip <nick/hostname/IP/url>",
	arglen: 1,
	callback: function (input) {
		let uri, target, nick, blame;
		if (input.args[0].match(/\.|\:/)) {
			if (input.args[0].match(/https?:\/\/[^ ]+/))
				target = url.parse(input.args[0]).host;
			else
				target = input.args[0];
		} else {
			if (input.context[0] !== "#") {
				irc.say(input.context, "You need to give me a hostname in queries.");
				return;
			}
			target = ial.User(input.args[0]);
			if (target) {
				nick = target.nick;
				target = target.hostname;
			} else {
				irc.say(input.context, "I don't see a "+input.args[0]+" in here.");
				irc.say(input.context, bot.cmdHelp("geoip", "syntax"));
				return;
			}
		}
		uri = "http://ip-api.com/json/"+target;
		web.json(uri).then(function (resp) {
			target = (nick ? nick : target);
			if (resp.status === "fail") {
				blame = lib.randSelect(ial.Active(input.context));
				if (!blame || blame === input.nick)
					blame = lib.randSelect(config.local_whippingboys);
				throw Error("ip-api reported a failure status, sorry. Blame "+blame+lib.randSelect([".", "!", "?"]));
			} else {
				resp = target+" is in "+resp.country;
				if (resp.regionName)
					resp += " - "+resp.regionName;
				if (resp.city)
					resp += ", "+resp.city;
			}
			irc.say(input.context, resp+".");
		}).catch(function (error) {
			irc.say(input.context, error.message);
		});
	}
});
