// This script handles the following functions:
//     ~secret password - authenticate to become an admin
//     ~makeadmin user - make user an admin
//     ~unadmin user - demote user input.nick admin status
//     ~admins - list admins
//     ~ignore user - the bot will no longer respond to messages input.nick [user]
//     ~unignore user - the bot will once more respond to messages input.nick [user]
//     ~reload - reload scripts
var fs = require('fs');

cmdListen({
	command: "errors",
	help: "Add/remove yourself to/from the error announcer. Admin only.",
	syntax: config.command_prefix+"errors announce/unannounce",
	admin: true,
	callback: function (input) {
		var user;
		if (!input.args) {
			irc.say(input.context, cmdHelp("errors", "syntax"));
			return;
		}
		switch (input.args[0].toLowerCase()) {
		case "announce":
			user = userLogin.Check(input.user);
			userLogin.setAttribute(user, "errorAnnounce", true);
			irc.say(input.context, "k.");
			break;
		case "unannounce":
			user = userLogin.Check(input.user);
			userLogin.unsetAttribute(user, "errorAnnounce");
			irc.say(input.context, "k.");
			break;
		default:
			irc.say(input.context, cmdHelp("errors", "syntax"));
			break;
		}
	}
});

function getErrorAnnounceList() {
	var ret = [];
	userLogin.List(true).forEach(function (user) {
		if (userLogin.getAttribute(user, "errorAnnounce"))
			ret.push(user);
	});
	return ret;
}

evListen({
	handle: "errorAnnouncer",
	event: "Error",
	callback: function (error) {
		getErrorAnnounceList().forEach(function (user) {
			irc.notice(userLogin.getNick(user), "\x02Error\x02: "+error);
		});
	}
});

evListen({
	handle: "errorStackAnnouncer",
	event: "Error Stack",
	callback: function (error) {
		var announceTo = getErrorAnnounceList(), i, l,
			messages;
		error = error.split("\n");
		announceTo.forEach(function (user) {
			messages = [];
			for (i = 0, l = error.length; i < l; i++)
				messages.push([ "notice", user, error[i], false ]);
			irc.rated(messages);
		});
	}
});

cmdListen({
	command: "ignore",
	help: "Ignores people!",
	syntax: config.command_prefix+"ignore <mask> - Example: "+config.command_prefix+
		"ignore mitch*!*@is.annoying.com",
	admin: true,
	callback: function (input) {
		if (!input.args) {
			irc.notice(input.nick, cmdHelp("ignore", "syntax"));
			return;
		}
		irc.say(input.context, ignore(input.args[0]));
	}
});


cmdListen({
	command: "unignore",
	help: "Unignores!",
	admin: true,
	syntax: config.command_prefix+"unignore <mask> - Example: "+config.command_prefix+
		"unignore mitch*!*@is.annoying.com",
	callback: function (input) {
		if (!input.args) {
			irc.notice(input.nick, cmdHelp("unignore", "syntax"));
			return;
		}
		irc.say(input.context, unignore(input.args[0]));
	}
});

cmdListen({
	command: "ignorelist",
	help: "Shows ignore list.",
	admin: true,
	callback: function (input) {
		irc.say(input.context, (ignoreList() || "Ignoring no one. ;)"));
	}
});

cmdListen({
	command: "reload",
	help: "Reloads plugins, or a single plugin.",
	syntax: config.command_prefix+"reload [<plugin>]",
	admin: true,
	callback: function (input) {
		if (input.args) {
			if (!fs.existsSync('plugins/'+input.args[0]+'.js')) {
				irc.say(input.context, "There is no such plugin. o.o;");
				return;
			}
			lib.events.emit("Event: Reloading plugin "+input.args[0]);
			if (config.disabled_plugins && config.disabled_plugins.length > 0 &&
				config.disabled_plugins.some(function (entry) { return (entry === input.args[0]); })) {
				irc.say(input.context, "This plugin is in the disabled plugins list, in config.js - loading it anyway.");
			}
			irc.reload(input.args[0]);
		} else {
			lib.events.emit("Event: Reloading all plugins");
			irc.reload();
		}
		irc.say(input.context, "Reloaded "+(input.args && input.args[0] ? "the "+input.args[0]+" plugin." : "all plugins."));
	}
});

cmdListen({
	command: "raw",
	help: "Sends raw text to the server.",
	admin: true,
	callback: function (input) {
		if (!input.data) return;
		irc.raw(input.data);
	}
});

cmdListen({
	command: "act",
	help: "Sends an action to a target. Admin only.",
	syntax: config.command_prefix+"act <target> <action to do> - Example: "
		+config.command_prefix+"act #anime whips Deide's behind.",
	admin: true,
	callback: function (input) {
		if (!input.args || !input.args[1]) {
			irc.say(input.context, cmdHelp("act", "syntax"));
			return;
		}
		irc.say(input.args[0], "\x01ACTION "+input.args.slice(1).join(" ")+"\x01", false);
	}
});

cmdListen({
	command: "join",
	help: "Joins channels. Admin only.",
	syntax: config.command_prefix+"join <channel> [<key>] - Example: "+config.command_prefix+"join #anime",
	admin: true,
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("join", "syntax"));
			return;
		}
		if (input.args[1]) {
			irc.join(input.args[0], input.args[1]);
		} else {
			irc.join(input.args[0]);
		}
	}
});

cmdListen({
	command: "part",
	help: "Leaves channels. Admin only.",
	admin: true,
	callback: function (input) {
		if (input.args) {
			if (input.args[1]) {
				//irc.raw("PART "+input.args[0]+" :"+input.args.slice(1).join(" "));
				irc.part(input.args[0], input.args.slice(1).join(" "));
			} else {
				irc.part(input.args[0]);
			}
		} else {
			irc.part(input.context);
		}
	}
});

cmdListen({
	command: "autojoin",
	help: "Adds channels to the autojoin list.",
	admin: true,
	callback: function (input) {
		if (input.args && input.args[0][0] === "#") {
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

cmdListen({
	command: "unautojoin",
	help: "Removes channels from the autojoin list.",
	admin: true,
	callback: function (input) {
		if (input.args && input.args[0][0] === "#") {
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

cmdListen({
	command: "quit",
	help: "Quits!",
	admin: true,
	callback: function (input) {
		irc.quit((input.data ? input.data : "PEACE! I'm out."));
	}
});
