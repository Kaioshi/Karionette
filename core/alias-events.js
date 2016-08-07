"use strict";
const [alias, perms, lib] = plugin.importMany("alias", "perms", "lib");

bot.command({
	command: "alias",
	help: "Allows user defined 'commands' (Eg: The alias "+config.command_prefix+
		"mal becomes google site:myanimelist.net). Vars can be used- see var help for more information",
	syntax: config.command_prefix+"alias <add/remove/info/list/help/syntax/arglen> <alias name> - Example: "+
		config.command_prefix+"alias add mal g site:myanimelist.net {args*}",
	arglen: 1,
	callback: function (input) {
		let aliasList, aliasEntry, cmd, aliasString, help;
		if (input.args[1])
			cmd = input.args[1].toLowerCase();
		aliasString = input.args.slice(2).join(" ");
		switch (input.args[0]) {
		case "help":
			if (!cmd) {
				irc.say(input.context, "Which alias do you want to set help for?");
				return;
			}
			aliasEntry = alias.db.getOne(cmd);
			if (!aliasEntry) {
				irc.say(input.context, "There is no such alias.");
				return;
			}
			if (!perms.isOwner(input.user, "alias", cmd)) {
				irc.say(input.context, "You need to own the \""+cmd+"\" alias to set it's help.");
				return;
			}
			if (bot.cmdExists(cmd)) {
				irc.say(input.context, "You can't set alias help for \""+cmd+"\", since it's a plugin or core command.");
				return;
			}
			help = alias.helpDB.getOne(cmd) || {};
			if (aliasString) {
				help.help = aliasString;
				alias.helpDB.saveOne(cmd, help);
				irc.say(input.context, "Help for the \""+cmd+"\" alias has been set.");
			} else {
				irc.say(input.context, (help.help ? "[Help] Alias: "+config.command_prefix+cmd+" - "+
					help.help : "There is no help set for the \""+cmd+"\" alias."));
			}
			break;
		case "syntax":
			if (!cmd) {
				irc.say(input.context, "Which alias do you want to set the syntax for?");
				return;
			}
			aliasEntry = alias.db.getOne(cmd);
			if (!aliasEntry) {
				irc.say(input.context, "There is no such alias.");
				return;
			}
			if (!perms.isOwner(input.user, "alias", cmd)) {
				irc.say(input.context, "You need to own the \""+cmd+"\" alias to set it's syntax.");
				return;
			}
			if (bot.cmdExists(cmd)) {
				irc.say(input.context, "You can't set alias syntax for \""+cmd+"\", since it's a plugin or core command.");
				return;
			}
			help = alias.helpDB.getOne(cmd) || {};
			if (aliasString) {
				help.syntax = aliasString;
				alias.helpDB.saveOne(cmd, help);
				irc.say(input.context, "Syntax for the \""+cmd+"\" alias has been set.");
			} else {
				irc.say(input.context, (help.syntax ? "[Help] Alias syntax: "+config.command_prefix+cmd+" "+
					help.syntax : "There is no syntax set for the \""+cmd+"\" alias."));
			}
			break;
		case "arglen":
			if (!cmd) {
				irc.say(input.context, "Which alias do you want to set the minimum argument length for?");
				return;
			}
			aliasEntry = alias.db.getOne(cmd);
			if (!aliasEntry) {
				irc.say(input.context, "There is no such alias.");
				return;
			}
			if (!perms.isOwner(input.user, "alias", cmd)) {
				irc.say(input.context, "You need to own the \""+cmd+"\" alias to set it's minimum argument length.");
				return;
			}
			if (bot.cmdExists(cmd)) {
				irc.say(input.context, "You can't set the minimum argument length for \""+cmd+
					"\", since it's a plugin or core command.");
				return;
			}
			help = alias.helpDB.getOne(cmd) || {};
			if (aliasString) {
				aliasString = parseInt(aliasString, 10);
				if (!Number.isInteger(aliasString) || aliasString < 0 || aliasString > 4) {
					irc.say(input.context, "The minimum argument length has to be a number between 0 and 4.");
					return;
				}
				help.arglen = aliasString;
				alias.helpDB.saveOne(cmd, help);
				irc.say(input.context, "The minimum argument length for alias \""+cmd+"\" has been set.");
			} else {
				irc.say(input.context, (help.arglen !== undefined ? "[Help] The minimum argument length for "+
					config.command_prefix+cmd+" is "+help.arglen :
					"There is no minimum argument length set for the \""+cmd+"\" alias."));
			}
			break;
		case "add":
			if (!cmd || !aliasString) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"alias add <alias name> <command> - Example: "+
					config.command_prefix+"alias add mitchslap action mitchslaps {args1}");
				return;
			}
			aliasEntry = alias.db.getOne(cmd);
			if (aliasEntry && !perms.isOwner(input.user, "alias", cmd)) {
				irc.say(input.context, "You need to own the \""+cmd+"\" alias to overwrite it.");
				return;
			}
			if (bot.cmdExists(cmd)) {
				irc.say(input.context, "The \""+cmd+"\" command is taken by a plugin or core function.");
				return;
			}
			perms.Action(input.user, "owner add", "alias", cmd);
			alias.db.saveOne(cmd, aliasString);
			irc.say(input.context, "Added :)");
			break;
		case "remove":
			if (!cmd) {
				irc.say(input.context, "What should I remove?");
				return;
			}
			aliasEntry = alias.db.getOne(cmd);
			if (!aliasEntry) {
				irc.say(input.context, "There is no such alias.");
				return;
			}
			if (!perms.isOwner(input.user, "alias", cmd)) {
				irc.say(input.context, "You need to own the \""+cmd+
					"\" alias to remove it. If you do own it, have you identified?");
				return;
			}
			alias.db.removeOne(cmd);
			if (alias.helpDB.getOne(cmd))
				alias.helpDB.removeOne(cmd);
			perms.Action(input.user, "delete all", "alias", cmd);
			irc.say(input.context, "Removed :)");
			break;
		case "list":
			aliasList = alias.db.getKeys().sort().join(", ") || "There are no aliases yet.";
			irc.say(input.context, aliasList);
			break;
		case "info":
			if (!cmd) {
				irc.say(input.context, "Which alias do you want info about?");
				return;
			}
			aliasEntry = alias.db.getOne(cmd);
			irc.say(input.context, (aliasEntry ? "The alias \""+cmd+"\" contains: "+aliasEntry : "There is no such alias."));
			break;
		default:
			irc.say(input.context, bot.cmdHelp("alias", "syntax"));
			break;
		}
	}
});

bot.command({
	command: "var",
	help: "Allows you to add variables for use in aliases (only). Default variables are: "+
		"{me} {from}, {channel}, {randThing}, {randNick}, {args*} (provided arguments), "+
		"{args1} (first argument) - {variableName} for your custom vars.",
	syntax: config.command_prefix+"let <add/remove/append/seppend/seprem/seprand/info> - "+
		"try each command on it's own for further help.",
	arglen: 1,
	callback: function (input) {
		let lcVarname, list, variable, varName, arr, varString, sep;
		input.user = input.nick+"!"+input.address;
		varString = input.args.slice(2).join(" ").trim();
		switch (input.args[0]) {
		case "add":
			if (!input.args[1] || !varString) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let add <variable> <entry> - Example: "+config.command_prefix+
					"let add anime_list Steins;Gate, Hellsing Ultimate, Hyouka");
				return;
			}
			lcVarname = input.args[1].toLowerCase();
			varName = "{" + lcVarname + "}";
			variable = alias.varDB.getOne(varName);
			if (variable) {
				if (perms.isOwner(input.user, "variable", lcVarname)) {
					alias.varDB.saveOne(varName, { handle: input.args[1], data: varString });
					irc.say(input.context, "Overwritten :S");
				} else {
					irc.say(input.context, "You need to own "+varName+" to overwrite it.");
				}
			} else {
				alias.varDB.saveOne(varName, { handle: input.args[1], data: varString });
				perms.Action(input.user, "owner add", "variable", lcVarname);
				irc.say(input.context, "Created :)");
			}
			break;
		case "append":
			if (!input.args[1] || !varString) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let append <variable> <entry> - Example: "+config.command_prefix+
					"let append towatch ranma's DIY guide to unplugging a butt.");
				return;
			}
			lcVarname = input.args[1].toLowerCase();
			varName = "{" + lcVarname + "}";
			variable = alias.varDB.getOne(varName);
			if (variable) {
				if (perms.Check(input.user, "variable", lcVarname)) {
					variable.data = variable.data+" "+varString;
					alias.varDB.saveOne(varName, variable);
					irc.say(input.context, "Added o7");
				} else {
					irc.say(input.context, "You don't have permission to do that.");
				}
			} else {
				alias.varDB.saveOne(varName, { handle: input.args[1], data: varString });
				irc.say(input.context, "Added o7");
			}
			break;
		case "seppend":
			varString = input.args.slice(3).join(" ");
			if (!input.args[1] || !input.args[2] || !varString) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let seppend <variable> <separator> <entry> - Example: "+config.command_prefix+
					"let seppend towatch | Black Books");
				return;
			}
			lcVarname = input.args[1].toLowerCase();
			varName = "{" + lcVarname + "}";
			variable = alias.varDB.getOne(varName);
			if (variable) {
				if (perms.Check(input.user, "variable", lcVarname)) {
					if (variable.data.length > 0) {
						variable.data = variable.data+(input.args[2] === "," ? ", " : " "+input.args[2]+" ")+varString;
					} else {
						variable.data = varString;
					}
					alias.varDB.saveOne(varName, variable);
					irc.say(input.context, "Added o7");
				} else {
					irc.say(input.context, "You don't have permission to do that.");
				}
			} else {
				alias.varDB.saveOne(varName, { handle: input.args[1], data: varString });
				irc.say(input.context, "Added o7");
			}
			break;
		case "seprem":
			varString = input.args.slice(3).join(" ");
			if (!input.args[1] || !input.args[2] || !varString) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let seprem <varname> <separator> <entry> - Example: "+config.command_prefix+
					"let seprem anime_list | Boku no Pico");
				return;
			}
			lcVarname = input.args[1].toLowerCase();
			varName = "{" + lcVarname + "}";
			variable = alias.varDB.getOne(varName);
			if (!variable) {
				irc.say(input.context, "There is no \""+input.args[1]+"\" variable.");
				return;
			}
			if (!perms.Check(input.user, "variable", lcVarname)) {
				irc.say(input.context, "You don't have permission to do that.");
				return;
			}
			if (variable === varString) {
				if (perms.isOwner(input.user, "variable", lcVarname)) {
					alias.varDB.removeOne(varName);
					perms.Action(input.user, "delete all", "variable", lcVarname);
					irc.say(input.context, "Removed o7");
				} else {
					irc.say(input.context, "This would remove the last entry, and thus the variable -"+
						" you need to be an owner to do that.");
				}
			} else {
				sep = (input.args[2] === "," ? ", " : " "+input.args[2]+" ");
				if (variable.data.toLowerCase().indexOf(varString.toLowerCase()) > -1) {
					variable.data = variable.data.split(sep);
					if (lib.hasElement(variable.data, varString)) {
						variable.data = variable.data.filter(function (element) {
							return (element.toLowerCase() !== varString.toLowerCase());
						});
						alias.varDB.saveOne(varName, variable);
						irc.say(input.context, "Removed o7");
						variable.data = variable.data.join(sep);
						return;
					}
					variable.data = variable.data.join(sep);
				}
				irc.say(input.context, "There's no \""+varString+"\" entry in the {"+input.args[1]+"} variable.");
			}
			break;
		case "seprand":
			if (!input.args[1] || !input.args[2]) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let seprand <varname> <separator> - Example: "+config.command_prefix+"let seprand anime_list |");
				return;
			}
			varName = "{" + input.args[1].toLowerCase()+ "}";
			variable = alias.varDB.getOne(varName);
			if (variable) {
				if (input.args[2] === ",")
					arr = variable.data.split(input.args[2]+" ");
				else
					arr = variable.data.split(" "+input.args[2]+" ");
				irc.say(input.context, lib.randSelect(arr));
			} else {
				irc.say(input.context, "There is no \"" + input.args[1] + "\" variable.");
			}
			break;
		case "remove":
			if (!input.args[1]) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let remove <variable> - Example: "+config.command_prefix+"let remove anime_list");
				return;
			}
			lcVarname = input.args[1].toLowerCase();
			varName = "{"+lcVarname+"}";
			variable = alias.varDB.getOne(varName);
			if (variable) {
				if (!perms.isOwner(input.user, "variable", lcVarname)) {
					irc.say(input.context, "You don't have permission to do that.");
					return;
				}
				alias.varDB.removeOne(varName);
				perms.Action(input.user, "delete all", "variable", lcVarname);
				irc.say(input.context, "Removed o7");
			} else {
				irc.say(input.context, "There is no \""+input.args[1]+"\" variable.");
			}
			break;
		case "info":
			if (!input.args[1]) {
				irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
					"let info <variable> - Example: "+config.command_prefix+"let info anime_list");
				return;
			}
			variable = alias.varDB.getOne("{"+input.args[1].toLowerCase()+"}");
			if (variable)
				irc.say(input.context, "Variable \""+input.args[1]+"\" contains: \""+variable.data+"\"");
			else
				irc.say(input.context, "There is no \""+input.args[1]+"\" variable.");
			break;
		case "list":
			list = [];
			alias.varDB.getKeys().sort().forEach(function (item) {
				list.push(alias.varDB.getOne(item).handle);
			});
			if (list.length)
				irc.say(input.context, list.join(", "));
			else
				irc.say(input.context, "There are no variables yet.");
			break;
		default:
			irc.say(input.context, bot.cmdHelp("var", "syntax"));
			break;
		}
	}
});
