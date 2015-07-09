"use strict";
var fs = require("fs"),
	ignore = require("./lib/ignore.js")(DB, lib, ial);

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
			irc.say(input.context, "k.");
			break;
		case "unannounce":
			logins.unsetAttribute(input.nick, "errorAnnounce");
			irc.say(input.context, "k.");
			break;
		default:
			irc.say(input.context, bot.cmdHelp("errors", "syntax"));
			break;
		}
	}
});

function getErrorAnnounceList() {
	return logins.nickList(true).filter(function (nick) {
		return logins.getAttribute(nick, "errorAnnounce");
	});
}

bot.event({
	handle: "errorAnnouncer",
	event: "Event: Error",
	callback: function (error) {
		getErrorAnnounceList().forEach(function (nick) {
			irc.notice(nick, "\x02Error\x02: "+error);
		});
	}
});

bot.event({
	handle: "errorStackAnnouncer",
	event: "Event: Error Stack",
	callback: function (error) {
		var announceTo = getErrorAnnounceList(), i, messages,
			errorMessage = error.split("\n");
		announceTo.forEach(function (user) {
			messages = [];
			for (i = 0; i < errorMessage.length; i++)
				messages.push([ "notice", user, errorMessage[i] ]);
			irc.rated(messages);
		});
	}
});

bot.command({
	command: "ignore",
	help: "Ignores people!",
	syntax: config.command_prefix+"ignore <mask> - Example: "+config.command_prefix+
		"ignore mitch*!*@is.annoying.com",
	admin: true,
	arglen: 1,
	callback: function (input) {
		irc.say(input.context, ignore.add(input.args[0]));
	}
});


bot.command({
	command: "unignore",
	help: "Unignores!",
	syntax: config.command_prefix+"unignore <mask> - Example: "+config.command_prefix+
		"unignore mitch*!*@is.annoying.com",
	admin: true,
	arglen: 1,
	callback: function (input) {
		irc.say(input.context, ignore.remove(input.args[0]));
	}
});

bot.command({
	command: "ignorelist",
	help: "Shows ignore list.",
	admin: true,
	callback: function (input) {
		irc.say(input.context, (ignore.list() || "Ignoring no one. ;)"));
	}
});

bot.command({
	command: "reload",
	help: "Reloads plugins, or a single plugin.",
	syntax: config.command_prefix+"reload [<plugin>]",
	admin: true,
	callback: function (input) {
		var plugin;
		if (input.args) {
			plugin = input.args[0];
			if (!fs.existsSync("plugins/"+plugin+".js") && !fs.existsSync("plugins/core/"+plugin+".js")) {
				irc.say(input.context, "There is no such plugin. o.o;");
				return;
			}
			emitEvent("Event: Reloading plugin "+plugin);
			if (Array.isArray(config.disabled_plugins) && config.disabled_plugins.indexOf(plugin) > -1)
				irc.say(input.context, "This plugin is in the disabled plugins list - loading it anyway.");
			irc.reload(plugin);
			irc.say(input.context, "Reloaded the "+plugin+" plugin.");
		} else {
			emitEvent("Event: Reloading all plugins");
			irc.reload();
			irc.say(input.context, "Reloaded all plugins.");
		}
	}
});

bot.command({
	command: "raw",
	help: "Sends raw text to the server.",
	syntax: config.command_prefix+"raw <text to send to server>",
	admin: true,
	arglen: 1,
	callback: function (input) {
		irc.raw(input.data);
	}
});

bot.command({
	command: "act",
	help: "Sends an action to a target. Admin only.",
	syntax: config.command_prefix+"act <target> <action to do> - Example: "+
		config.command_prefix+"act #anime whips Deide's behind.",
	admin: true,
	arglen: 1,
	callback: function (input) {
		irc.say(input.args[0], "\x01ACTION "+input.args.slice(1).join(" ")+"\x01");
	}
});

bot.command({
	command: "join",
	help: "Joins channels. Admin only.",
	syntax: config.command_prefix+"join <channel> [<key>] - Example: "+config.command_prefix+"join #anime",
	admin: true,
	arglen: 1,
	callback: function (input) {
		if (input.args[1]) {
			irc.join(input.args[0], input.args[1]);
		} else {
			irc.join(input.args[0]);
		}
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
		if (input.args[0][0] === "#") {
			config.autojoin = config.autojoin || [];
			if (lib.hasElement(config.autojoin, input.args[0])) {
				irc.say(input.context, input.args[0]+" is already on the autojoin list.");
				return;
			}
			config.autojoin.push(input.args[0].toLowerCase());
			config.saveChanges();
			irc.say(input.context, "Added " + input.args[0] + " to autojoin list");
		} else {
			irc.say(input.context, "Herp.");
		}
	}
});

bot.command({
	command: "unautojoin",
	help: "Removes channels from the autojoin list.",
	syntax: config.command_prefix+"unautojoin <channel>",
	admin: true,
	arglen: 1,
	callback: function (input) {
		if (input.args[0][0] === "#") {
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
		} else {
			irc.say(input.context, "Derp.");
		}
	}
});

bot.command({
	command: "quit",
	help: "Quits!",
	admin: true,
	callback: function (input) {
		irc.quit((input.data ? input.data : "PEACE! I'm out."));
	}
});
