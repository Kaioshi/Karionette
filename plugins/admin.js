// This script handles the following functions:
//     ~secret password - authenticate to become an admin
//     ~makeadmin user - make user an admin
//     ~unadmin user - demote user input.nick admin status
//     ~admins - list admins
//     ~ignore user - the bot will no longer respond to messages input.nick [user]
//     ~unignore user - the bot will once more respond to messages input.nick [user]
//     ~reload - reload scripts

var	autojoinDB = new DB.List({filename: 'autojoin'}),
	ignoreDB = new DB.List({filename: "ignore"}),
	fs = require('fs');

cmdListen({
	command: "ignore",
	help: "Ignores people!",
	syntax: config.command_prefix+"ignore <nick>",
	admin: true,
	callback: function (input) {
		if (!input.args) {
			irc.notice(input.nick, cmdHelp("ignore", "syntax"));
			return;
		}
		ignoreDB.saveOne(input.args[0]);
		irc.say(input.context, input.args[0]+" is now ignored.");
	}
});


cmdListen({
	command: "unignore",
	help: "Unignores!",
	admin: true,
	syntax: config.command_prefix+"unignore <nick>",
	callback: function (input) {
		if (!input.args) {
			irc.notice(input.nick, cmdHelp("unignore", "syntax"));
			return;
		}
		ignoreDB.removeOne(input.args[0], true);
		irc.say(input.context, input.args[0] + " unignored");
	}
});

cmdListen({
	command: "ignorelist",
	help: "Shows ignore list.",
	admin: true,
	callback: function (input) {
		irc.say(input.context, (ignoreDB.getAll().join(", ") || "Ignoring no one. ;)"));
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
			irc.reload(input.args[0]);
		} else {
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
	command: "join",
	help: "Joins channels. What did you expect?",
	admin: true,
	callback: function (input) {
		if (input.args && input.args[0][0] === "#") {
			irc.join(input.data);
		}
	}
});

cmdListen({
	command: "part",
	help: "Leaves channels.",
	admin: true,
	callback: function (input) {
		if (input.args && input.args[0][0] === "#") {
			irc.part(input.data);
		} else if (input.context[0] === "#") {
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
			autojoinDB.saveOne(input.args[0]);
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
			autojoinDB.removeOne(input.args[0], true);
			irc.say(input.context, "Removed " + input.args[0] + " from autojoin list");
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
