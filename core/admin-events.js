"use strict";
const console = plugin.import("console");
const [fs, lib, logins, ignore] = plugin.importMany("fs", "lib", "logins", "ignore");

bot.command({
	command: "errors",
	help: "Add/remove yourself to/from the error announcer. Admin only.",
	syntax: config.command_prefix+"errors announce/unannounce",
	admin: true,
	arglen: 1,
	callback: function (input) {
		switch (input.args[0].toLowerCase()) {
		case "announce":
			logins.setAttribute(input.nick, "errorAnnounce", true);
			irc.say(input.context, "You will get error announcements from now on.");
			break;
		case "unannounce":
			logins.unsetAttribute(input.nick, "errorAnnounce");
			irc.say(input.context, "Removed. Who's gonna fix me now? ;_;");
			break;
		default:
			irc.say(input.context, bot.cmdHelp("errors", "syntax"));
			break;
		}
	}
});

function getErrorAnnounceList() {
	return logins.nickList(true).filter(nick => logins.getAttribute(nick, "errorAnnounce"));
}

bot.event({
	handle: "errorAnnouncer",
	event: "Event: Error",
	callback: error => getErrorAnnounceList().forEach(nick => irc.notice(nick, "\x02Error\x02: "+error))
});

bot.event({
	handle: "errorStackAnnouncer",
	event: "Event: Error Stack",
	callback: function (error) {
		const errorMessage = error.split("\n");
		getErrorAnnounceList().forEach(nick => errorMessage.forEach(err => irc.notice(nick, err)));
	}
});

bot.command({
	command: "ignore",
	help: "Ignores people!",
	syntax: config.command_prefix+"ignore <mask> - Example: "+config.command_prefix+
		"ignore mitch*!*@is.annoying.com",
	admin: true,
	arglen: 1,
	callback: input => irc.say(input.context, ignore.add(input.args[0]))
});


bot.command({
	command: "unignore",
	help: "Unignores!",
	syntax: config.command_prefix+"unignore <mask> - Example: "+config.command_prefix+
		"unignore mitch*!*@is.annoying.com",
	admin: true,
	arglen: 1,
	callback: input => irc.say(input.context, ignore.remove(input.args[0]))
});

bot.command({
	command: "ignorelist",
	help: "Shows ignore list.",
	admin: true,
	callback: input => irc.say(input.context, (ignore.list() || "Ignoring no one. ;)"))
});

bot.command({
	command: "reload",
	help: "Reloads plugins, or a single plugin.",
	syntax: config.command_prefix+"reload [<dir>/<plugin>] Example: "+config.command_prefix+"reload core/admin",
	admin: true,
	arglen: 1,
	callback: function (input) {
		const plug = input.args[0].slice(-3) === ".js" ? input.args[0] : input.args[0]+".js";
		if (!fs.existsSync(plug)) {
			irc.say(input.context, "There is no such plugin. o.o;");
			return;
		}
		bot.emitEvent("Event: Reloading plugin "+plug.slice(0,-3));
		if (plugin.load(plug))
			irc.say(input.context, "Reloaded the "+plug+" plugin.");
		else
			irc.say(input.context, "Something broke.");
	}
});

bot.command({
	command: "raw",
	help: "Sends raw text to the server.",
	syntax: config.command_prefix+"raw <text to send to server>",
	admin: true,
	arglen: 1,
	callback: input => irc.raw(input.data)
});

bot.command({
	command: "act",
	help: "Sends an action to a target. Admin only.",
	syntax: config.command_prefix+"act <target> <action to do> - Example: "+
		config.command_prefix+"act #anime whips Deide's behind.",
	admin: true,
	arglen: 1,
	callback: input => irc.action(input.args[0], input.args.slice(1).join(" "))
});

bot.command({
	command: "join",
	help: "Joins channels. Admin only.",
	syntax: config.command_prefix+"join <channel> [<key>] - Example: "+config.command_prefix+"join #anime",
	admin: true,
	arglen: 1,
	callback: function (input) {
		if (input.args[1])
			irc.join(input.args[0], input.args[1]);
		else
			irc.join(input.args[0]);
	}
});

bot.command({
	command: "part",
	help: "Leaves channels. Admin only.",
	admin: true,
	callback: function (input) {
		if (input.args) {
			if (input.args[1])
				irc.part(input.args[0], input.args.slice(1).join(" "));
			else
				irc.part(input.args[0]);
		} else {
			irc.part(input.context);
		}
	}
});

bot.command({
	command: "autojoin",
	help: "Adds channels to the autojoin list.",
	syntax: config.command_prefix+"autojoin <channel>",
	admin: true,
	arglen: 1,
	callback: function (input) {
		if (input.args[0][0] !== "#") {
			irc.say(input.context, bot.cmdHelp("autojoin", "syntax"));
			return;
		}
		config.autojoin = config.autojoin || [];
		if (lib.hasElement(config.autojoin, input.args[0])) {
			irc.say(input.context, input.args[0]+" is already on the autojoin list.");
			return;
		}
		config.autojoin.push(input.args[0].toLowerCase());
		config.saveChanges();
		irc.say(input.context, "Added " + input.args[0] + " to autojoin list");
	}
});

bot.command({
	command: "unautojoin",
	help: "Removes channels from the autojoin list.",
	syntax: config.command_prefix+"unautojoin <channel>",
	admin: true,
	arglen: 1,
	callback: function (input) {
		if (input.args[0][0] !== "#") {
			irc.say(input.context, bot.cmdHelp("unautojoin", "syntax"));
			return;
		}
		if (config.autojoin && config.autojoin.length > 0 && lib.hasElement(config.autojoin, input.args[0])) {
			input.args[0] = input.args[0].toLowerCase();
			config.autojoin = config.autojoin.filter(function (element) {
				return (element.toLowerCase() !== input.args[0]);
			});
			config.saveChanges();
			irc.say(input.context, "Removed!");
		} else {
			irc.say(input.context, input.args[0]+" isn't on the autojoin list.");
		}
	}
});

bot.command({
	command: "quit",
	help: "Quits!",
	admin: true,
	callback: input => irc.quit(input.args && input.args.length ? input.args.join(" ") : "PEACE! I'm out.")
});
