// This script handles the following functions:
//     ~secret password - authenticate to become an admin
//     ~makeadmin user - make user an admin
//     ~unadmin user - demote user input.from admin status
//     ~admins - list admins
//     ~ignore user - the bot will no longer respond to messages input.from [user]
//     ~unignore user - the bot will once more respond to messages input.from [user]
//     ~reload - reload scripts

var adminDB = new DB.List({filename: 'admins'});

function isAdmin(user) {
	adminDB.getAll().forEach(function (entry) {
		if (entry) {
			var ret = ial.maskMatch(user, entry);
			console.log("isAdmin: ret = "+ret+" for "+user+" - "+entry);
			if (ret == true) return true;
		}
	});
	//console.log("Not an admin!");
	console.log("isAdmin: returning false");
	return false;
}

// Admin Only
function listen_admin(params) {
	listen({
		handle: params.handle,
		regex: params.regex,
		command: params.command,
		callback: function (input, match) {
			if (isAdmin(input.user)) {
				params.callback(input, match);
			} else {
				irc.say(input.context, "Bitchu_, please.");
			}
		}
	});
}


listen_admin({
	handle: 'admin',
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
				adminDB.saveOne(args[1]);
				irc.say(input.context, "Added :)");
				break;
			case "remove":
				adminDB.removeOne(args[1], true);
				irc.say(input.context, "Removed :)");
				break;
			case "list":
				irc.say(input.context, "Admins: " + adminDB.getAll().join(", "));
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
	handle: 'secret',
	regex: regexFactory.startsWith("secret"),
	callback: function (input, match) {
		if (isAdmin(input.user)) {
			irc.say(input.context, "You are already an admin.");
		} else if (match[1] === config.secret) {
			adminDB.saveOne(input.from);
			irc.say(input.context, "You are now an admin.");
		}
	}
});

listen_admin({
	handle: 'ignore',
	regex: regexFactory.startsWith("ignore"),
	callback: function (input, match) {
		irc.ignore(match[1]);
		irc.say(input.context, match[1] + " is now ignored.");
	}
});

listen_admin({
	handle: 'unignore',
	regex: regexFactory.startsWith("unignore"),
	callback: function (input, match) {
		irc.unignore(match[1]);
		irc.say(input.context, match[1] + " unignored");
	}
});

listen_admin({
	handle: 'ignorelist',
	regex: regexFactory.only("ignorelist"),
	callback: function (input) {
		irc.say(input.context, irc.ignoreList());
	}
});

listen_admin({
	handle: 'reload',
	regex: regexFactory.only('reload'),
	callback: function (input, match) {
		irc.reload();
		irc.say(input.context, "Reloaded scripts");
	}
});

listen_admin({
	handle: 'raw',
	regex: regexFactory.startsWith('raw'),
	callback: function (input, match) {
		irc.raw(match[1]);
	}
});

listen_admin({
	handle: 'join',
	regex: regexFactory.startsWith("join"),
	callback: function (input, match) {
		if (isChannelName(match[1])) {
			irc.join(match[1]);
		}
	}
});

listen_admin({
	handle: 'autojoin',
	regex: regexFactory.startsWith("autojoin"),
	callback: function (input, match) {
		if (isChannelName(match[1])) {
			autojoinDB.saveOne(match[1]);
			irc.say(input.context, "Added " + match[1] + " to autojoin list");
		}
	}
});

listen_admin({
	handle: 'unautojoin',
	regex: regexFactory.startsWith("unautojoin"),
	callback: function (input, match) {
		if (isChannelName(match[1])) {
			autojoinDB.removeOne(match[1], true);
			irc.say(input.context, "Removed " + match[1] + " from autojoin list");
		}
	}
});

listen_admin({
	handle: 'part',
	regex: regexFactory.startsWith("part"),
	callback: function (input, match) {
		if (isChannelName(match[1])) {
			irc.part(match[1]);
		} else if (match[1].length === 0 && isChannelName(input.context)) {
			irc.part(input.context);
		}
	}
});

