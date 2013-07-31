// permissions for any type of thing! huzzah.
listen({
	plugin: "permissions",
	handle: "permissions",
	regex: regexFactory.startsWith("permissions"),
	command: {
		root: "permissions",
		options: "allow, deny, owner, search",
		help: "Allows you to edit permissions for any command, alias or variable."
	},
	callback: function (input, match) {
		var user, access, args = match[1].split(" ");
		if (input.context[0] === "#") {
			irc.notice(input.from, "permissions can only be used via query.");
			return;
		}
		switch (args[0]) {
			case "allow":
				switch (args[1]) {
					case "add":
						irc.say(input.context, permissions.Allow.Add(input.user, args[2], args[3], args[4]));
						break;
					case "remove":
						irc.say(input.context, permissions.Allow.Remove(input.user, args[2], args[3], args[4]));
						break;
					case "list":
						irc.say(input.context, permissions.Allow.List(args[2], args[3]));
						break;
					default:
						irc.say(input.context, permissions.Allow.Syntax + " - " + permissions.Allow.Example);
						break;
				}
				break;
			case "deny":
				switch (args[1]) {
					case "add":
						irc.say(input.context, permissions.Deny.Add(input.user, args[2], args[3], args[4]));
						break;
					case "remove":
						irc.say(input.context, permissions.Deny.Remove(input.user, args[2], args[3], args[4]));
						break;
					case "list":
						irc.say(input.context, permissions.Deny.List(args[2], args[3]));
						break;
					default:
						irc.say(input.context, permissions.Deny.Syntax + " - " + permissions.Deny.Example);
						break;
				}
				break;
			case "owner":
				switch (args[1]) {
					case "add":
						irc.say(input.context, permissions.Owner.Add(input.user, args[2], args[3], args[4]));
						break;
					case "remove":
						irc.say(input.context, permissions.Owner.Remove(input.user, args[2], args[3], args[4]));
						break;
					case "list":
						irc.say(input.context, permissions.Owner.List(input.user, args[2], args[3]));
						break;
					default:
						irc.say(input.context, permissions.Owner.Syntax + " - " + permissions.Owner.Example);
						break;
				}
				break;
			case "admin":
				switch (args[1]) {
					case "add":
						irc.say(input.context, permissions.Admin.Add(input.user, args[2], args[3]));
						break;
					case "remove":
						irc.say(input.context, permissions.Admin.Remove(input.user, args[2], args[3]));
						break;
					case "list":
						irc.say(input.context, permissions.Admin.List(input.user, args[2]));
						break;
					default:
						irc.say(input.context, permissions.Admin.Syntax + " - " + permissions.Admin.Example);
						break;
				}
				break;
			case "check":
				if (!args[2]) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"permissions check <function/alias/variable> <name> [<user>]");
					irc.say(input.context, "Example: "+config.command_prefix+
						"permissions check variable anime_list mitch!mitchy@mitch.com");
					return;
				}
				user = args[3] || input.user;
				access = permissions.Check(args[1], args[2], user);
				if (access) irc.say(input.context, "Allowed! :D");
				else irc.say(input.context, "Denied! >:(");
				break;
			case "search":
				if (!args[1]) {
					irc.say(input.context, "[Help] Syntax: "
						+config.command_prefix+"permissions search <function name/variable name/plugin name> - Example: "
						+config.command_prefix+"permissions search anime_list");
					return;
				}
				access = permissions.Search(args[1]).slice(0, 3); // only the first 3 hits
				if (access.length > 0) {
					access.forEach(function (entry) {
						irc.say(input.context, entry[0]+" "+entry[1]+": "+permissions.Info(input.user, entry[0], entry[1]));
					});
				} else {
					irc.say(input.context, "No permissions found matching "+args[1]);
				}
				break;
			case "list":
				if (!args[2] || !args[1].match(/alias|function|variable/i)) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"permissions list <alias/function/variable> <name> - Example: "+config.command_prefix+
						"permissions list function ud");
					return;
				}
				access = permissions.Info(input.user, args[1], args[2]);
				if (access) {
					irc.say(input.context, args[1]+" "+args[2]+": "+access);
				} else {
					irc.say(input.context, "Couldn't find "+args[1]+" "+args[2]);
				}
				break;
			default:
				irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
				break;
		}
	}
});
