var aliasDB = new DB.Json({filename: "alias/alias"}),
	varDB = new DB.Json({filename: "alias/vars"});

// Handles Alias interface
cmdListen({
	command: "alias",
	help: "Allows user defined 'commands' (Eg: The alias "+config.command_prefix+
		"mal becomes google site:myanimelist.net). Vars can be used- see var help for more information",
	syntax: config.command_prefix+"alias <add/remove/info/list> <alias name> - Example: "+
		config.command_prefix+"alias add mal g site:myanimelist.net {args*}",
	callback: function (input) {
		var aKeys, aliasList, i, alias, cmdArr, permission, cmd, aliasString;
		if (input.args && input.args[0] && input.args[1]) {
			cmd = input.args[1];
			aliasString = input.args.slice(2).join(" ");
			input.user = input.nick+"!"+input.address;
			switch (input.args[0]) {
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
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"alias add <alias name> <command> - Example: "+config.command_prefix+
						"alias add mitchslap action mitchslaps {args1}");
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
				irc.say(input.context, cmdHelp("alias", "syntax"));
				break;
			}
		} else {
			irc.say(input.context, cmdHelp("alias", "syntax"));
		}
	}
});

cmdListen({
	command: "var",
	help: "Allows you to add variables for use in aliases (only). Default variables are: "+
		"{me} {from}, {channel}, {randThing}, {randNick}, {args*} (provided arguments), "+
		"{args1} (first argument) - {variableName} for your custom vars.",
	syntax: config.command_prefix+"var <add/remove/append/seppend/seprem/seprand> - "+
		"try each command on it's own for further help.",
	callback: function (input) {
		var keys, list, i, variable, varName, permission, owners, arr, varString;
		if (input.args && input.args[0]) {
			varString = input.args.slice(2).join(" ");
			switch (input.args[0]) {
			case "add":
				if (input.args[1] && varString) {
					input.args[1] = input.args[1].toLowerCase();
					varName = "{" + input.args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						permission = true;
						owners = permissions.List("variable", input.args[1], "owner");
						if (owners && owners.length > 0) {
							permission = permissions.isOwner("variable", input.args[1], input.user);
						} else {
							permission = permissions.Check("variable", input.args[1], input.user);
						}
						if (permission) {
							varDB.saveOne(varName, varString);
							irc.say(input.context, "Overwritten :S");
						} else {
							irc.reply(input, "you don't have permission to overwrite " + varName);
						}
					} else {
						varDB.saveOne(varName, varString);
						permissions.Owner.Add(input.user, "variable", input.args[1], ial.toMask(input.user));
						irc.say(input.context, "Created :)");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"var add <variable> <entry> - Example: "+config.command_prefix+
						"var add anime_list Steins;Gate, Hellsing Ultimate, Hyouka");
				}
				break;
			case "append":
				if (input.args[1] && varString) {
					varName = "{" + input.args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (permissions.Check("variable", input.args[1], input.user)) {
							varDB.saveOne(varName, variable + " " + varString);
							irc.say(input.context, "Added o7");
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, varString);
						permissions.Owner.Add(input.user, "variable", input.args[1], ial.toMask(input.user));
						irc.say(input.context, "Added o7");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"var append <variable> <entry> - Example: "+config.command_prefix+
						"var append towatch ranma's DIY guide to unplugging a butt.");
				}
				break;
			case "seppend":
				varString = input.args.slice(3).join(" ");
				if (input.args[1] && input.args[2] && varString) {
					varName = "{" + input.args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (permissions.Check("variable", input.args[1], input.user)) {
							varDB.saveOne(varName, variable + (input.args[2] === "," ? ", "
								: " " + input.args[2] + " ") + varString.trim());
							irc.say(input.context, "Added o7");
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, varString.trim());
						permissions.Owner.Add(input.user, "variable", input.args[1], ial.toMask(input.user));
						irc.say(input.context, "Added o7");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"var seppend <variable> <separator> <entry> - Example: "+config.command_prefix+
						"var seppend towatch | Black Books");
				}
				break;
			case "seprem":
				varString = input.args.slice(3).join(" ");
				if (input.args[1] && input.args[2] && varString) {
					varName = "{" + input.args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (permissions.Check("variable", input.args[1], input.user)) {
							if (variable === varString) {
								if (permissions.isOwner("variable", input.args[1], input.user)) {
									varDB.removeOne(varName);
									permissions.Delete(input.user, "variable", input.args[1]);
									irc.say(input.context, "Removed o7");
								} else {
									irc.say(input.context, "This would remove the last entry, and thus the variable - you need to be an owner to do that.");
								}
							} else {
								varDB.saveOne(varName, variable.split((input.args[2] === "," ? ", " : " " + input.args[2] + " "))
									.filter(function (element) {
										return (element !== varString);
									})
									.join((input.args[2] === "," ? ", " : " " + input.args[2] + " ")));
								irc.say(input.context, "Removed o7");
							}
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						irc.say("[Error] There is no " + varName + " variable.");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"var seprem <varname> <separator> <entry> - Example: "+config.command_prefix+
						"var seprem anime_list | Boku no Pico");
				}
				break;
			case "seprand":
				if (input.args[1] && input.args[2]) {
					varName = "{" + input.args[1] + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (input.args[2] === ",") arr = variable.split(input.args[2]+" ");
						else arr = variable.split(" "+input.args[2]+" ");
						irc.say(input.context, lib.randSelect(arr));
					} else {
						irc.reply(input, "there is no " + varName + " variable.");
					}
				} else {
					irc.say(input.contex, "[Help] Syntax: "
						+config.command_prefix+"var seprand <varname> <separator> - Example: "
						+config.command_prefix+"var seprand anime_list |");
				}
				break;
			case "remove":
				if (input.args[1]) {
					varName = "{"+input.args[1]+"}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (!permissions.isOwner("variable", input.args[1], input.user)) {
							irc.reply(input, "you don't have permission to do that.");
							return;
						}
						varDB.removeOne(varName);
						permissions.Delete(input.user, "variable", input.args[1]);
						irc.say(input.context, "Removed o7");
					} else {
						irc.say(input.context, "There is no such variable. O.o;");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"var remove <variable> - Example: "+config.command_prefix+"var remove anime_list");
				}
				break;
			case "info":
				if (input.args[1]) {
					varName = "{" + input.args[1] + "}";
					variable = varDB.getOne(varName)
					if (variable) {
						permission = permissions.Info(input.user, "variable", input.args[1]);
						irc.say(input.context, "Variable " +varName + " contains: \"" + variable + "\"");
						if (permission) irc.notice(input.from, permission);
					} else {
						irc.say(input.context, "There is no such variable.");
					}
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"var info <variable> - Example: "+config.command_prefix+"var info anime_list");
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
				irc.say(input.context, cmdHelp("var", "syntax"));
				break;
			}
		} else {
			irc.say(input.context, cmdHelp("var", "syntax"));
		}
	}
});

