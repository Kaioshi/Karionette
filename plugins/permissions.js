// permissions for any type of thing! huzzah.
listen({
	handle: "permissions",
	regex: regexFactory.startsWith("permissions"),
	command: {
		root: "permissions",
		options: "add, remove, check, info",
		help: "Allows you to edit permissions for any command, alias or variable."
	},
	callback: function (input, match) {
		var args = match[1].split(" ");
		if (args && args.length > 0) {
			switch (args[0]) {
				case "allow":
					switch (args[1]) {
						case "add":
							irc.say(input.context, permissions.Allow.Add(args[2], args[3], args[4]));
							break;
						case "remove":
							irc.say(input.context, permissions.Allow.Remove(args[2], args[3], args[4]));
							break;
						case "list":
							irc.say(input.context, permissions.Allow.List(args[2], args[3]));
							break;
						default:
							irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
							break;
					}
					break;
				case "deny":
					switch (args[1]) {
						case "add":
							irc.say(input.context, permissions.Deny.Add(args[2], args[3], args[4]));
							break;
						case "remove":
							irc.say(input.context, permissions.Deny.Remove(args[2], args[3], args[4]));
							break;
						case "list":
							irc.say(input.context, permissions.Deny.List(args[2], args[3]));
							break;
						default:
							irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
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
							irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
							break;
					}
					break;
				case "check":
					if (args[2]) {
						var user = args[3] || input.user,
							access = permissions.Check(args[1], args[2], user);
						if (access) irc.say(input.context, "Allowed! :D");
						else irc.say(input.context, "Denied! >:(");
					} else {
						irc.say(input.context, "[Help] Syntax: permissions check <function/alias/variable> <name> [<user>]");
						irc.say(input.context, "Example: permissions check variable anime_list mitch!mitchy@mitch.com");
					}
					break;
				case "search":
					if (args[1]) {
						permissions.Search(args[1]);
					} else {
						irc.say(input.context, "[Help] Syntax: permissions search <name>");
					}
					break;
				case "list":
					
				default:
					irc.say(input.context, permissions.Syntax + " - " + permissions.Example);
					break;
			}
		} else {
			irc.say(input.context, "[Help] Syntax: permissions " + this.command.options);
		}
	}
});
