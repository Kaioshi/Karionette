var convertCheck = false, tmp,
	aliasDB = new DB.Json({filename: "alias/alias"}),
	varDB = new DB.Json({filename: "alias/vars"});

// Handles Alias interface
cmdListen({
	command: "alias",
	help: "Allows user defined 'commands' (Eg: The alias "+config.command_prefix+
		"mal becomes google site:myanimelist.net). Vars can be used- see var help for more information",
	syntax: config.command_prefix+"alias <add/remove/info/list> <alias name> - \
		Example: "+config.command_prefix+"alias add mal g site:myanimelist.net {args*}",
	callback: function (input) {
		var aKeys, aliasList, i, alias, cmdArr, permission, cmd, aliasString;
		if (input.args && input.args[0]) {
			if (input.args[1]) cmd = input.args[1];
			aliasString = input.args.slice(2).join(" ");
			input.user = input.nick+"!"+input.address;
			switch (input.args[0]) {
			case "add":
				if (cmd && aliasString) {
					cmd = cmd.toLowerCase();
					alias = aliasDB.getOne(cmd);
					if (alias && !perms.isOwner(input.user, "alias", cmd)) {
						irc.say(input.context, "You need to own the "+cmd+" alias to overwrite it.");
						return;
					}
					cmdArr = cmdList();
					for (i = 0; i < cmdArr.length; i++) {
						if (cmdArr[i] === cmd) {
							irc.say(input.context, "The "+cmd+" command is taken by a plugin or core \
								function. I declare shenanigans! SHENANIGANS!!#*&^! >:(");
							return;
						}
					}
					perms.Action(input.user, "owner add", "alias", cmd);
					aliasDB.saveOne(cmd, aliasString);
					irc.say(input.context, "Added :)");
				} else {
					irc.say(input.context, config.command_prefix+"alias add <alias name> <command> - \
						Example: "+config.command_prefix+"alias add mitchslap action mitchslaps {args1}");
				}
				break;
			case "remove":
				if (cmd) {
					alias = aliasDB.getOne(cmd);
					if (alias) { 
						if (!perms.isOwner(input.user, "alias", cmd)) {
							irc.say(input.context, "You need to own the "+cmd+" alias to remove it. If you \
								do own it, have you identified?");
							return;
						}
						aliasDB.removeOne(cmd);
						perms.Action(input.user, "delete all", "alias", cmd);
						irc.say(input.context, "Removed :)");
					} else {
						irc.say(input.context, "There is no such alias. o.O");
					}
				} else {
					irc.say(input.context, "What should I remove?");
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
					list = null;
				}
				irc.say(input.context, "There are no aliases yet.");
				break;
			case "info":
				if (cmd) {
					alias = aliasDB.getOne(cmd);
					if (alias) {
						irc.say(input.context, "The alias string for " + cmd + " is: " + alias, false);
					} else {
						irc.say(input.context, "There is no such alias.");
					}
				} else {
					irc.say(input.context, "Which alias do you want info about?");
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

// THIS IS BAD. I'M SORRY.
if (!convertCheck) {
	tmp = {};
	varDB.getKeys().forEach(function (entry) {
		tmp[entry] = varDB.getOne(entry);
		if (!tmp[entry].handle) {
			tmp[entry] = { handle: entry.slice(1, -1), data: tmp[entry] };
			convertCheck = true;
		}
	});
	// if convertCheck is already true, save changes. else nothing happened.
	if (convertCheck) {
		logger.debug("Updated vars.json format! Now with Case!");
		varDB.saveAll(tmp);
		tmp = null;
	} else {
		convertCheck = true;
	}
}

cmdListen({
	command: "var",
	help: "Allows you to add variables for use in aliases (only). Default variables are: "+
		"{me} {from}, {channel}, {randThing}, {randNick}, {args*} (provided arguments), "+
		"{args1} (first argument) - {variableName} for your custom vars.",
	syntax: config.command_prefix+"var <add/remove/append/seppend/seprem/seprand/info> - "+
		"try each command on it's own for further help.",
	callback: function (input) {
		var lcVarname, keys, list, i, variable, varName, permission, owners, arr, varString;
		if (input.args) {
			input.user = input.nick+"!"+input.address;
			varString = input.args.slice(2).join(" ").trim();
			switch (input.args[0]) {
			case "add":
				if (input.args[1] && varString) {
					lcVarname = input.args[1].toLowerCase();
					varName = "{" + lcVarname + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (perms.isOwner(input.user, "variable", lcVarname)) {
							varDB.saveOne(varName, { handle: input.args[1], data: varString });
							irc.say(input.context, "Overwritten :S");
						} else {
							irc.say(input.context, "You need to own "+varName+" to overwrite it.");
						}
					} else {
						varDB.saveOne(varName, { handle: input.args[1], data: varString });
						perms.Action(input.user, "owner add", "variable", lcVarname);
						irc.say(input.context, "Created :)");
					}
				} else {
					irc.say(input.context, "[Help] "+config.command_prefix+"var add <variable> <entry> - \
						Example: "+config.command_prefix+"var add anime_list Steins;Gate, \
						Hellsing Ultimate, Hyouka");
				}
				break;
			case "append":
				if (input.args[1] && varString) {
					lcVarname = input.args[1].toLowerCase();
					varName = "{" + lcVarname + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (perms.Check(input.user, "variable", lcVarname)) {
							variable.data = variable.data+" "+varString;
							varDB.saveOne(varName, variable);
							irc.say(input.context, "Added o7");
						} else {
							irc.say(input.context, "You don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, { handle: input.args[1], data: varString });
						irc.say(input.context, "Added o7");
					}
				} else {
					irc.say(input.context, "[Help] "+config.command_prefix+"var append <variable> <entry> - \
						Example: "+config.command_prefix+"var append towatch ranma's DIY guide to \
						unplugging a butt.");
				}
				break;
			case "seppend":
				varString = input.args.slice(3).join(" ");
				if (input.args[1] && input.args[2] && varString) {
					lcVarname = input.args[1].toLowerCase();
					varName = "{" + lcVarname + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (perms.Check(input.user, "variable", lcVarname)) {
							variable.data = variable.data+(input.args[2] === "," ? ", " : " "+input.args[2]+" ")+varString;
							varDB.saveOne(varName, variable);
							irc.say(input.context, "Added o7");
						} else {
							irc.say(input.context, "You don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, { handle: input.args[1], data: varString });
						irc.say(input.context, "Added o7");
					}
				} else {
					irc.say(input.context, "[Help] "+config.command_prefix+"var seppend <variable> <separator> <entry> - \
						Example: "+config.command_prefix+"var seppend towatch | Black Books");
				}
				break;
			case "seprem":
				varString = input.args.slice(3).join(" ");
				if (input.args[1] && input.args[2] && varString) {
					lcVarname = input.args[1].toLowerCase();
					varName = "{" + lcVarname + "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (perms.Check(input.user, "variable", lcVarname)) {
							if (variable === varString) {
								if (perms.isOwner(input.user, "variable", lcVarname)) {
									varDB.removeOne(varName);
									perms.Action(input.user, "delete all", "variable", lcVarname);
									irc.say(input.context, "Removed o7");
								} else {
									irc.say(input.context, "This would remove the last entry, and thus the \
										variable - you need to be an owner to do that.");
								}
							} else {
								variable.data = variable.data.split((input.args[2] === "," ? ", " : " "+input.args[2]+" "))
									.filter(function (element) { return (element !== varString); })
									.join((input.args[2] === "," ? ", " : " "+input.args[2]+" "));
								varDB.saveOne(varName, variable);
								irc.say(input.context, "Removed o7");
							}
						} else {
							irc.say(input.context, "You don't have permission to do that.");
						}
					} else {
						irc.say(input.context, "There is no {" + input.args[1] + "} variable.");
					}
				} else {
					irc.say(input.context, "[Help] "+config.command_prefix+"var seprem <varname> <separator> <entry> - \
						Example: "+config.command_prefix+"var seprem anime_list | Boku no Pico");
				}
				break;
			case "seprand":
				if (input.args[1] && input.args[2]) {
					varName = "{" + input.args[1].toLowerCase()+ "}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (input.args[2] === ",") arr = variable.data.split(input.args[2]+" ");
						else arr = variable.data.split(" "+input.args[2]+" ");
						irc.say(input.context, lib.randSelect(arr));
					} else {
						irc.say(input.context, "There is no {" + input.args[1] + "} variable.");
					}
				} else {
					irc.say(input.contex, "[Help] "+config.command_prefix+"var seprand <varname> <separator> - \
						Example: "+config.command_prefix+"var seprand anime_list |");
				}
				break;
			case "remove":
				if (input.args[1]) {
					lcVarname = input.args[1].toLowerCase();
					varName = "{"+lcVarname+"}";
					variable = varDB.getOne(varName);
					if (variable) {
						if (!perms.isOwner(input.user, "variable", lcVarname)) {
							irc.say(input.context, "You don't have permission to do that.");
							return;
						}
						varDB.removeOne(varName);
						perms.Action(input.user, "delete all", "variable", lcVarname);
						irc.say(input.context, "Removed o7");
					} else {
						irc.say(input.context, "There is no {"+input.args[1]+"} variable. O.o;");
					}
				} else {
					irc.say(input.context, "[Help] "+config.command_prefix+"var remove <variable> - \
						Example: "+config.command_prefix+"var remove anime_list");
				}
				break;
			case "info":
				if (input.args[1]) {
					variable = varDB.getOne("{"+input.args[1].toLowerCase()+"}")
					if (variable) {
						irc.say(input.context, "Variable {"+input.args[1]+"} contains: \""+variable.data+"\"");
					} else {
						irc.say(input.context, "There is no {"+input.args[1]+"} variable.");
					}
				} else {
					irc.say(input.context, "[Help] "+config.command_prefix+"var info <variable> - \
						Example: "+config.command_prefix+"var info anime_list");
				}
				break;
			case "list":
				if (varDB.size() > 0) {
					list = [];
					varDB.getKeys().sort().forEach(function (item) {
						list.push(varDB.getOne(item).handle);
					});
				}
				if (!list) irc.say(input.context, "There are no variables yet.");
				else irc.say(input.context, list.join(", "));
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

