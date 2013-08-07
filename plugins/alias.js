var aliasDB = new DB.Json({filename: "alias/alias"}),
	varDB = new DB.Json({filename: "alias/vars"});
// todo: add randVerb
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
		var aKeys, aliasList, i, alias, cmdArr, permission,
			args = match[1].split(" "),
			cmd = args[1],
			aliasString = args.slice(2).join(" ");
		if (args[0]) {
			// What option is picked
			switch (args[0]) {
			case "add":
				if (cmd && aliasString) {
					cmd = cmd.toLowerCase();
					alias = aliasDB.getOne(cmd);
					if (alias && !permissions.isOwner("alias", cmd, input.user)) {
						irc.say(input.context, "You need to own the "+cmd+" alias to overwrite it.");
						return;
					}
					cmdArr = [];
					irc.help().forEach(function (entry) {
						cmdArr.push(entry.root);
					});
					for (i = 0; i < cmdArr.length; i++) {
						if (cmdArr[i] === cmd) {
							irc.say(input.context, "The "+cmd+" command is taken by a plugin or core function. I declare shenanigans! SHENANIGANS!!#*&^! >:(");
							return;
						}
					}
					permissions.Owner.Add(input.user, "alias", cmd, ial.toMask(input.user));
					aliasDB.saveOne(cmd, aliasString);
					irc.say(input.context, "Added :)");
				} else {
					irc.say(input.context, "[Help] Syntax: alias add <alias name> <command> - Example: alias add mitchslap action mitchslaps {args1}");
				}
				break;
			case "remove":
				if (cmd) {
					alias = aliasDB.getOne(cmd);
					if (alias) { 
						if (!permissions.isOwner("alias", cmd, input.user)) {
							irc.say(input.context, "You need to own the "+cmd+" alias to remove it.");
							return;
						}
						aliasDB.removeOne(cmd);
						permissions.Delete(input.user, "alias", cmd);
						irc.say(input.context, "Removed :)");
					} else {
						irc.say(input.context, "There is no such alias. o.O");
					}
				} else {
					irc.say(input.context, "[Help] What should I remove?");
				}
				break;
			case "list":
				if (aliasDB.size() > 0) {
					list = [];
					aliasDB.getKeys().forEach(function (item) {
						list.push(item);
					});
					if (list.length > 0) {
						irc.say(input.context, list.sort().join(", "));
						break;
					}
				}
				irc.say(input.context, "There are no aliases yet.");
				break;
			case "info":
				if (cmd) {
					alias = aliasDB.getOne(cmd);
					if (alias) {
						permission = permissions.Info(input.user, "alias", cmd);
						irc.say(input.context, "The alias string for " + cmd + " is: " + alias);
						if (permission) irc.notice(input.from, permission);
					} else irc.say(input.context, "There is no such alias.");
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
		options: "add, remove, append, seppend, seprem, seprand, list, info",
		help: "Allows {vars} to be used in aliases. Default vars are: {me}, {from}, {channel}, {randThing}."
	},
	callback: function (input, match) {
		var keys, list, i, variable, varName, permission, owners,
			args = match[1].split(" "), arr,
			varString = args.slice(2).join(" ");
		if (args[0]) {
			switch (args[0]) {
			case "add":
			case "write":
				if (args[1] && varString) {
					args[1] = args[1].toLowerCase();
					varName = "{" + args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						permission = true;
						owners = permissions.List("variable", args[1], "owner");
						if (owners && owners.length > 0) {
							permission = permissions.isOwner("variable", args[1], input.user);
						} else {
							permission = permissions.Check("variable", args[1], input.user);
						}
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
					variable = varDB.getOne(varName);
					if (variable) {
						if (permissions.Check("variable", args[1], input.user)) {
							varDB.saveOne(varName, variable + " " + varString);
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
					variable = varDB.getOne(varName);
					if (variable) {
						if (permissions.Check("variable", args[1], input.user)) {
							varDB.saveOne(varName, variable + (args[2] === "," ? ", "
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
				varString = args.slice(3).join(" ");
				if (args[1] && args[2] && varString) {
					varName = "{" + args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (permissions.Check("variable", args[1], input.user)) {
							if (variable === varString) {
								if (permissions.isOwner("variable", args[1], input.user)) {
									varDB.removeOne(varName);
									permissions.Delete(input.user, "variable", args[1]);
									irc.say(input.context, "Removed o7");
								} else {
									irc.say(input.context, "This would remove the last entry, and thus the variable - you need to be an owner to do that.");
								}
							} else {
								varDB.saveOne(varName, variable.split((args[2] === "," ? ", " : " " + args[2] + " "))
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
			case "seprand":
				if (args[1] && args[2]) {
					varName = "{" + args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						arr = variable.split(" "+args[2]+" ");
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
					varName = "{"+args[1]+"}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (!permissions.isOwner("variable", args[1], input.user)) {
							irc.reply(input, "you don't have permission to do that.");
							return;
						}
						varDB.removeOne(varName);
						permissions.Delete(input.user, "variable", args[1]);
						irc.say(input.context, "Removed o7");
					} else {
						irc.say(input.context, "There is no such variable. O.o;");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: var remove <variable>");
				}
				break;
			case "info":
				if (args[1]) {
					varName = "{" + args[1] + "}";
					variable = varDB.getOne(varName)
					if (variable) {
						permission = permissions.Info(input.user, "variable", args[1]);
						irc.say(input.context, "Variable " +varName + " contains: \"" + variable + "\"");
						if (permission) irc.notice(input.from, permission);
					} else {
						irc.say(input.context, "There is no such variable.");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: var info <variable>");
				}
				break;
			case "list":
				if (varDB.size() > 0) {
					list = [];
					varDB.getKeys().forEach(function (item) {
						list.push(item);
					});
				}
				if (!list) irc.say(input.context, "There are no variables yet.");
				else irc.say(input.context, list.sort().join(", "));
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

