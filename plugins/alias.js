var aliasDB = new DB.Json({filename: "alias/alias"}),
	varDB = new DB.Json({filename: "alias/vars"});

// Handles Alias interface
listen({
	plugin: "alias",
	handle: "alias",
	regex: regexFactory.startsWith("alias"),
	command: {
		root: "alias",
		options: "add, remove, list, info",
		help: "Allows user defined 'commands' (Eg: The command yt becomes google site:youtube.com). Vars can be used- see var help for more information"
	},
	callback: function (input, match) {
		var aKeys, aliasList, i,
			args = match[1].split(" "),
			cmd = args[1],
			aliasString = args.slice(2).join(" ");
		if (args[0]) {
			// What option is picked
			switch (args[0]) {
			case "add":
				if (cmd && aliasString) {
					var gotten = aliasDB.getOne(cmd);
					if (gotten && !permissions.isOwner("alias", cmd, input.user)) {
						irc.say(input.context, "You need to own the "+cmd+" alias to overwrite it.");
						return;
					}
					if (cmd !== "alias" && args[2] !== "alias") {
						permissions.Owner.Add(input.user, "alias", cmd, ial.toMask(input.user));
						aliasDB.saveOne(cmd, aliasString);
						irc.say(input.context, "Added :)");
					} else {
						irc.say(input.context, "Naughty :(");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: alias add <alias name> <command> - Example: alias add mitchslap action mitchslaps {args1}");
				}
				break;
			case "remove":
				if (cmd) {
					var gotten = aliasDB.getOne(cmd);
					if (gotten && !permissions.isOwner("alias", cmd, input.user)) {
						irc.say(input.context, "You need to own the "+cmd+" alias to remove it.");
						return;
					}
					aliasDB.removeOne(cmd);
					permissions.Delete("alias", cmd, input.user);
					irc.say(input.context, "Removed :)");
				} else {
					irc.say(input.context, "[Help] What should I remove?");
				}
				break;
			case "list":
				aKeys = aliasDB.getKeys();
				aliasList = "";
				for (i = 0; i < aKeys.length; i += 1) {
					aliasList += aKeys[i] + ", ";
				}
				irc.say(input.context, aliasList.substring(0, aliasList.length - 2));
				break;
			case "info":
				if (cmd) {
					irc.say(input.context, "The alias string for " + cmd + " is: " + aliasDB.getOne(cmd));
				} else {
					irc.say(input.context, "[Help] Which alias do you want info about?");
				}
				break;
			default:
				irc.say(input.context, "[Help] Options are: " + this.command.options);
				break;
			}
		} else {
			irc.say(input.context, "[Help] Options are: " + this.command.options);
		}
	}
});

listen({
	plugin: "alias",
	handle: "var",
	regex: regexFactory.startsWith("var"),
	command: {
		root: "var",
		options: "write, remove, append, seppend, seprem, list, access list, access allow, access deny",
		help: "Allows {vars} to be used in aliases. Default vars are:{input.from}, {channel}, {randThing}."
	},
	callback: function (input, match) {
		var keys, list, i, gotten, varName,
			args = match[1].split(" "),
			varString = args.slice(2).join(" ");
		if (args[0]) {
			switch (args[0]) {
			case "add":
			case "write":
				if (args[1] && varString) {
					varName = "{" + args[1] + "}";
					var gotten = varDB.getOne(varName);
					if (gotten) {
						var permission = true,
							owners = permissions.List("variable", args[1], "owner");
						if (owners && owners.length > 0) permission = permissions.isOwner("variable", args[1], input.user);
						else permission = permissions.Check("variable", args[1], input.user);
						if (permission) {
							varDB.saveOne(varName, varString);
							irc.say(input.context, "Overwritten :S");
						} else {
							irc.reply(input, "you don't have permission to overwrite " + varName);
						}
					} else {
						varDB.saveOne(varName, varString);
						permissions.Owner.Add(input.user, "variable", args[1], ial.toMask(input.user));
						irc.say(input.context, "Created :)");
					}
				} else {
					irc.say(input.context, "[Help] var write <variable> <entry>");
				}
				break;
			case "append":
				if (args[1] && varString) {
					varName = "{" + args[1] + "}";
					gotten = varDB.getOne(varName);
					if (gotten) {
						if (permissions.Check("variable", args[1], input.user)) {
							varDB.saveOne(varName, gotten + " " + varString);
							irc.say(input.context, "Added o7");
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, varString);
						permissions.Owner.Add(input.user, "variable", args[1], ial.toMask(input.user));
						irc.say(input.context, "Added o7");
					}
				} else {
					irc.say(input.context, "[Help] var append <variable> <entry>, for example: var append towatch ranma's DIY guide to unplugging a butt.");
				}
				break;
			case "seppend":
				varString = args.slice(3).join(" ");
				if (args[1] && args[2] && varString) {
					varName = "{" + args[1] + "}";
					gotten = varDB.getOne(varName);
					if (gotten) {
						if (permissions.Check("variable", args[1], input.user)) {
							varDB.saveOne(varName, gotten + (args[2] === "," ? ", "
								: " " + args[2] + " ") + varString.trim());
							irc.say(input.context, "Added o7");
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, varString.trim());
						permissions.Owner.Add(input.user, "variable", args[1], ial.toMask(input.user));
						irc.say(input.context, "Added o7");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: var seppend <variable> <separator> <entry>, for example: var seppend towatch | Black Books");
				}
				break;
			case "seprem":
				var varString = args.slice(3).join(" ");
				if (args[1] && args[2] && varString) {
					var varName = "{" + args[1] + "}",
						gotten = varDB.getOne(varName);
					if (gotten) {
						if (permissions.Check("variable", args[1], input.user)) {
							if (gotten === varString) {
								if (permissions.isOwner("variable", args[1], input.user)) {
									varDB.removeOne(varName);
									permissions.Delete("variable", args[1], input.user);
									irc.say(input.context, "Removed o7");
								} else {
									irc.say(input.context, "This would remove the last entry, and thus the variable - you need to be an owner to do that.");
								}
							} else {
								varDB.saveOne(varName, gotten.split((args[2] === "," ? ", " : " " + args[2] + " "))
									.filter(function (element) {
										return (element !== varString);
									})
									.join((args[2] === "," ? ", " : " " + args[2] + " ")));
								irc.say(input.context, "Removed o7");
							}
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						irc.say("[Error] There is no " + varName + " variable.");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: var seprem <varname> <separator> <entry>, for example: var seprem anime_list | Boku no Pico");
				}
				break;
			case "randstats":
				if (args[1] && args[2] && args[3]) {
					var varName = "{" + args[1] + "}",
						gotten = varDB.getOne(varName);
					if (gotten) {
						var arr = gotten.split(" "+args[2]+" "),
							stats = {},
							max = args[3],
							ret = [];
						for (var i = 0; i <= max; i++) {
							var entry = arr[Math.floor(Math.random() * arr.length)];
							if (!stats[entry]) stats[entry] = 1;
							stats[entry]++;
						}
						Object.keys(stats).some(function (item) { ret.push(item + ": "+stats[item]); });
						irc.say(input.context, ret.join(", "));
					} else irc.say(input.context, "There is no " + varName +" variable.");
				} else irc.say(input.context, "[Help] Syntax: var randstats <varname> <separator> <max>");
				break;
			case "seprand":
				if (args[1] && args[2]) {
					var varName = "{" + args[1] + "}",
						gotten = varDB.getOne(varName);
					if (gotten) {
						var arr = gotten.split(" "+args[2]+" ");
						irc.say(input.context, arr[Math.floor(Math.random() * arr.length)]);
					} else {
						irc.reply(input, "there is no " + varName + " variable.");
					}
				} else {
					irc.say(input.contex, "[Help] Syntax: var seprand <varname> <separator>");
				}
				break;
			case "remove":
				if (args[1]) {
					if (permissions.isOwner("variable", args[1], input.user)) {
						varDB.removeOne("{"+args[1]+"}");
						permissions.Delete("variable", args[1], input.user);
						irc.say(input.context, "Removed o7");
					} else {
						irc.reply(input, "you don't have permission to do that.");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: var remove <variable>");
				}
				break;
			case "info":
				if (args[1]) {
					var varName = "{" + args[1] + "}",
						variable = varDB.getOne(varName);
					if (variable) {
						irc.say(input.context, "Variable " +varName + " contains: \"" + variable + "\"");
					} else {
						irc.say(input.context, "There is no such variable.");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: var info <variable>");
				}
				break;
			case "list":
				keys = varDB.getKeys();
				list = "";
				for (i = 0; i < keys.length; i += 1) {
					list += keys[i] + ", ";
				}
				if (!list) irc.say(input.context, "There are no variables yet.");
				else irc.say(input.context, list);
				break;
			default:
				irc.say(input.context, "[Help] Options are: " + this.command.options);
				break;
			}
		} else {
			irc.say(input.context, "[Help] Options are: " + this.command.options);
		}
	}
});

