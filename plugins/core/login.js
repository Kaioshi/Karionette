// user logins :<
"use strict";
bot.command({
	command: "identify",
	help: "Identifies you with "+config.nick+". See also: unidentify, whoami, adduser, deluser, passwd",
	syntax: config.command_prefix+"identify <username> <password> - via query. You can supply the bot's secret code as the password, if need be.",
	arglen: 2,
	callback: function (input) {
		if (input.channel)
			irc.say(input.context, "Why would you do that here? I suggest you change your password with "+config.command_prefix+"passwd ... in a query.");
		else
			irc.say(input.nick, logins.identify(input.nick, input.args[0], input.args[1]));
	}
});

bot.command({
	command: "unidentify",
	help: "Unidentifies you with "+config.nick+". See also: identify, whoami, adduser, deluser",
	syntax: config.command_prefix+"unidentify",
	callback: function (input) {
		irc.say(input.nick, logins.unidentify(input.nick));
	}
});

bot.command({
	command: "whoami",
	help: "Tells you who you're identified as, if you are. See also: identify, unidentify, adduser, deluser",
	syntax: config.command_prefix+"whoami",
	callback: function (input) {
		var user = logins.getUsername(input.nick);
		if (user)
			irc.say(input.context, "I recognize you as \""+user+"\".");
		else {
			irc.say(input.context, "I don't recognize you. Try identifying! "+config.command_prefix+
				"identify <username> <password> - if not, add a user: "+config.command_prefix+"adduser <username> <password>");
		}
	}
});

bot.command({
	command: "setattr",
	help: "Sets or shows per-login user defined attributes. See also: unsetattr, getattr",
	syntax: config.command_prefix+"setattr <attribute> <value> - Attribute keys may not contain spaces - Example: "+config.command_prefix+"setattr errorAnnounce true",
	arglen: 2,
	callback: function (input) {
		irc.say(input.context, logins.setAttribute(input.nick, input.args[0], input.args.slice(1).join(" ")));
	}
});

bot.command({
	command: "unsetattr",
	help: "Unsets per-login user defined attributes. See also: setattr, getattr", // huhu. getatter. geddit?
	syntax: config.command_prefix+"unsetattr <attribute> - Example: "+config.command_prefix+"unsetattr errorAnnounce",
	arglen: 1,
	callback: function (input) {
		irc.say(input.context, logins.unsetAttribute(input.nick, input.args[0]));
	}
});

bot.command({
	command: "getattr",
	help: "Gets per-login user defined attributes.",
	syntax: config.command_prefix+"getattr <attribute> - Example: "+config.command_prefix+"getattr errorAnnounce",
	arglen: 1,
	callback: function (input) {
		irc.say(input.context, logins.getAttribute(input.nick, input.args[0]));
	}
});

bot.command({
	command: "adduser",
	help: "Adds a user to the bot. See also: deluser, whoami, identify, unidentify",
	syntax: config.command_prefix+"adduser <username> <password> [<secret>] - via query. Supply the bot's secret code to be recognised as an admin.",
	arglen: 2,
	callback: function (input) {
		if (input.channel) {
			irc.say(input.context, "Why would you do this here? Try again via query. Hopefully with a different password!");
			return;
		}
		if (input.args[2]) // SECRET SQUIRRELS
			irc.say(input.nick, logins.addLogin(input.nick, input.args[0], input.args[1], input.args[2]));
		else
			irc.say(input.nick, logins.addLogin(input.nick, input.args[0], input.args[1]));
	}
});

bot.command({
	command: "deluser",
	help: "Removes a user from the bot. See also: adduser, whoami, identify, unidentify",
	syntax: config.command_prefix+"deluser <username> [<password>] - via query. Admins don't need the password.",
	arglen: 1,
	callback: function (input) {
		if (input.args[1]) // password supplied
			irc.say(input.context, logins.remLogin(input.nick, input.args[0], input.args[1]));
		else
			irc.say(input.context, logins.remLogin(input.nick, input.args[0]));
	}
});

bot.command({
	command: "passwd",
	help: "Changes your password. Only admins can set passwords for other accounts.",
	syntax: config.command_prefix+"passwd [<account>] <new password> - via query. Must be logged in first.",
	arglen: 1,
	callback: function (input) {
		if (input.channel) {
			irc.say(input.context, "Why would you do this here? Try again via query. Hopefully with a different password!");
			return;
		}
		if (input.args[1]) // account name supplied
			irc.say(input.nick, logins.passwd(input.nick, input.args[1], input.args[0]));
		else
			irc.say(input.nick, logins.passwd(input.nick, input.args[0]));
	}
});

bot.event({
	handle: "loginNick",
	event: "NICK",
	callback: function (input) {
		if (logins.isLoggedIn(input.nick)) {
			//setTimeout(function () {
				logins.nickChange(input.nick, input.newnick);
			// }, 2000);
		}
	}
});

bot.event({
	handle: "loginQuit",
	event: "QUIT",
	callback: function (input) {
		if (logins.isLoggedIn(input.nick))
			logins.unidentify(input.nick);
	}
});
