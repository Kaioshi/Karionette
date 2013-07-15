// This script handles the following functions:
//     ~secret password - authenticate to become an admin
//     ~makeadmin user - make user an admin
//     ~unadmin user - demote user input.from admin status
//     ~admins - list admins
//     ~ignore user - the bot will no longer respond to messages input.from [user]
//     ~unignore user - the bot will once more respond to messages input.from [user]
//     ~reload - reload scripts

var adminDB = new DB.List({filename: 'admins'}),
	fs = require('fs');

// Admin Only
function listen_admin(params) {
	listen({
		plugin: params.plugin,
		handle: params.handle,
		regex: params.regex,
		command: params.command,
		callback: function (input, match) {
			if (permissions.isAdmin(input.user)) {
				params.callback(input, match);
			} else {
				irc.say(input.context, "Bitch_, please.");
			}
		}
	});
}


listen_admin({
	plugin: "admin",
	handle: "admin",
	regex: regexFactory.startsWith("admin"),
	command: {
		root: "admin",
		options: "add, remove, list",
		help: "Adds, removes and lists admins. Admin only."
	},
	callback: function (input, match) {
		var args = match[1].split(" ");
		if (args[0]) {
			switch (args[0]) {
			case "add":
				irc.say(input.context, permissions.Admin.Add(input.user, args[1], args[2]));
				break;
			case "remove":
				if (!args[2]) irc.say(input.context, permissions.Admin.Remove(input.user, args[1]));
				else irc.say(input.context, permissions.Admin.Remove(input.user, args[1], args[2]));
				break;
			case "list":
				if (args[1]) irc.notice(input.from, permissions.Admin.List(input.user, args[1]));
				else irc.notice(input.from, permissions.Admin.List(input.user));
				break;
			default:
				irc.say(input.context, "[Help] Options are: add, remove, list");
				break;
			}
		} else {
			irc.say(input.context, "You da admin.");
		}
	}
});

listen({
	plugin: "admin",
	handle: "secret",
	regex: regexFactory.startsWith("secret"),
	callback: function (input, match) {
		var args = match[1].split(" ");
		if (permissions.isAdmin(input.user)) {
			irc.say(input.context, "You are already an admin.");
			return;
		}
		if (!args[0]) { 
			irc.say(input.context, "[Help] Syntax: secret <secret> [mask]");
			return;
		}
		irc.say(input.context, permissions.Admin.Secret(input.user, args[0], args[1]));
	}
});

listen_admin({
	plugin: "admin",
	handle: "ignore",
	regex: regexFactory.startsWith("ignore"),
	callback: function (input, match) {
		irc.ignore(match[1]);
		irc.say(input.context, match[1] + " is now ignored.");
	}
});

listen_admin({
	plugin: "admin",
	handle: "unignore",
	regex: regexFactory.startsWith("unignore"),
	callback: function (input, match) {
		irc.unignore(match[1]);
		irc.say(input.context, match[1] + " unignored");
	}
});

listen_admin({
	plugin: "admin",
	handle: "ignorelist",
	regex: regexFactory.only("ignorelist"),
	callback: function (input) {
		irc.say(input.context, irc.ignoreList());
	}
});

listen_admin({
	plugin: "admin",
	handle: "reload",
	regex: regexFactory.startsWith('reload'),
	callback: function (input, match) {
		if (match[1]) {
			var args = match[1].split(" ");
			if (!fs.existsSync('plugins/'+args[0]+'.js')) {
				irc.say(input.context, "There is no such plugin. o.o;");
				return;
			}
			before = lib.memUse(true), gain;
			irc.reload(args[0]);
		} else {
			var before = lib.memUse(true), gain;
			irc.reload();
		}
		gain = (lib.memUse(true)-before)/1024;
		if (gain === 0) gain = "Gained NOTHING! HA! 8D";
		else {
			if (gain > 1024) gain = (gain/1024).toString().slice(0,3)+"Gained MiB.. ;~;";
			else gain = gain.toString()+"Gained KiB. :D";
		}
		irc.say(input.context, "Reloaded "+(args && args[0] ? args[0] : "scripts")+gain);
	}
});

listen_admin({
	plugin: "admin",
	handle: "raw",
	regex: regexFactory.startsWith("raw"),
	callback: function (input, match) {
		irc.raw(match[1]);
	}
});

listen_admin({
	plugin: "admin",
	handle: "join",
	regex: regexFactory.startsWith("join"),
	callback: function (input, match) {
		if (match[1][0] === "#") {
			irc.join(match[1]);
		}
	}
});

listen_admin({
	plugin: "admin",
	handle: "autojoin",
	regex: regexFactory.startsWith("autojoin"),
	callback: function (input, match) {
		if (match[1][0] === "#") {
			autojoinDB.saveOne(match[1]);
			irc.say(input.context, "Added " + match[1] + " to autojoin list");
		}
	}
});

listen_admin({
	plugin: "admin",
	handle: "unautojoin",
	regex: regexFactory.startsWith("unautojoin"),
	callback: function (input, match) {
		if (match[1][0] === "#") {
			autojoinDB.removeOne(match[1], true);
			irc.say(input.context, "Removed " + match[1] + " from autojoin list");
		}
	}
});

listen_admin({
	plugin: "admin",
	handle: "part",
	regex: regexFactory.startsWith("part"),
	callback: function (input, match) {
		if (match[1][0] === "#") {
			irc.part(match[1]);
		} else if (match[1].length === 0 && input.context[0] === "#") {
			irc.part(input.context);
		}
	}
});

