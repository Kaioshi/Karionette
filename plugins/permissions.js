// permissions for any type of thing! huzzah.
cmdListen({
	command: "permissions",
	options: "allow, deny, owner, search",
	help: "Allows you to edit permissions for any command, alias or variable.",
	callback: function (input) {
		var user, access;
		if (input.channel) {
			irc.notice(input.from, "permissions can only be used via query.");
			return;
		}
		if (!input.args || !input.args[0]) {
			irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
			return;
		}
		input.user = input.nick+"!"+input.address;
		switch (input.args[0]) {
			case "allow":
				switch (input.args[1]) {
					case "add":
						irc.say(input.context, permissions.Allow.Add(input.user, input.args[2], input.args[3], input.args[4]));
						break;
					case "remove":
						irc.say(input.context, permissions.Allow.Remove(input.user, input.args[2], input.args[3], input.args[4]));
						break;
					case "list":
						irc.say(input.context, permissions.Allow.List(input.args[2], input.args[3]));
						break;
					default:
						irc.say(input.context, permissions.Allow.Syntax + " - " + permissions.Allow.Example);
						break;
				}
				break;
			case "deny":
				switch (input.args[1]) {
					case "add":
						irc.say(input.context, permissions.Deny.Add(input.user, input.args[2], input.args[3], input.args[4]));
						break;
					case "remove":
						irc.say(input.context, permissions.Deny.Remove(input.user, input.args[2], input.args[3], input.args[4]));
						break;
					case "list":
						irc.say(input.context, permissions.Deny.List(input.args[2], input.args[3]));
						break;
					default:
						irc.say(input.context, permissions.Deny.Syntax + " - " + permissions.Deny.Example);
						break;
				}
				break;
			case "owner":
				switch (input.args[1]) {
					case "add":
						irc.say(input.context, permissions.Owner.Add(input.user, input.args[2], input.args[3], input.args[4]));
						break;
					case "remove":
						irc.say(input.context, permissions.Owner.Remove(input.user, input.args[2], input.args[3], input.args[4]));
						break;
					case "list":
						irc.say(input.context, permissions.Owner.List(input.user, input.args[2], input.args[3]));
						break;
					default:
						irc.say(input.context, permissions.Owner.Syntax + " - " + permissions.Owner.Example);
						break;
				}
				break;
			case "admin":
				switch (input.args[1]) {
					case "add":
						irc.say(input.context, permissions.Admin.Add(input.user, input.args[2], input.args[3]));
						break;
					case "remove":
						irc.say(input.context, permissions.Admin.Remove(input.user, input.args[2], input.args[3]));
						break;
					case "list":
						irc.say(input.context, permissions.Admin.List(input.user, input.args[2]));
						break;
					default:
						irc.say(input.context, permissions.Admin.Syntax + " - " + permissions.Admin.Example);
						break;
				}
				break;
			case "check":
				if (!input.args[2]) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"permissions check <function/alias/variable> <name> [<user>]");
					irc.say(input.context, "Example: "+config.command_prefix+
						"permissions check variable anime_list mitch!mitchy@mitch.com");
					return;
				}
				user = input.args[3] || input.user;
				access = permissions.Check(input.args[1], input.args[2], user);
				if (access) irc.say(input.context, "Allowed! :D");
				else irc.say(input.context, "Denied! >:(");
				break;
			case "search":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] Syntax: "
						+config.command_prefix+"permissions search <function name/variable name/plugin name> - Example: "
						+config.command_prefix+"permissions search anime_list");
					return;
				}
				access = permissions.Search(input.args[1]).slice(0, 3); // only the first 3 hits
				if (access.length > 0) {
					access.forEach(function (entry) {
						irc.say(input.context, entry[0]+" "+entry[1]+": "+permissions.Info(input.user, entry[0], entry[1]));
					});
				} else {
					irc.say(input.context, "No permissions found matching "+input.args[1]);
				}
				break;
			case "list":
				if (!input.args[2] || !input.args[1].match(/alias|function|variable/i)) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"permissions list <alias/function/variable> <name> - Example: "+config.command_prefix+
						"permissions list function ud");
					return;
				}
				access = permissions.Info(input.user, input.args[1], input.args[2]);
				if (access) {
					irc.say(input.context, input.args[1]+" "+input.args[2]+": "+access);
				} else {
					irc.say(input.context, "Couldn't find "+input.args[1]+" "+input.args[2]);
				}
				break;
			default:
				irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
				break;
		}
	}
});
