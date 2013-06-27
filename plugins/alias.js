var aliasDB = new DB.Json({filename: "alias/alias"}),
	varDB = new DB.Json({filename: "alias/vars"}),
	vAccessDB = new DB.Json({filename: "alias/vAccess"});

// Handles Alias interface
listen({
	handle: "alias",
	regex: regexFactory.startsWith("alias"),
	command: {
		root: "alias",
		options: "add, remove, list, info",
		help: "Allows user defined 'commands' (Eg: The command yt becomes google site:youtube.com). Vars can be used- see var help for more information"
	},
	callback: function (input) {
		var aKeys, aliasList, i,
			args = input.match[1].split(" "),
			cmd = args[1],
			aliasString = args.slice(2).join(" ");
		if (args[0]) {
			// What option is picked
			switch (args[0]) {
			case "add":
				if (cmd && aliasString) {
					if (cmd !== "alias" && args[2] !== "alias") {
						aliasDB.saveOne(cmd, aliasString);
						irc.say(input.context, "Added :)");
					} else {
						irc.say(input.context, "Naughty :(");
					}
				} else {
					irc.say(input.context, "[Help] alias add ALIASCOMMAND ALIAS STRING");
				}
				break;
			case "remove":
				if (cmd) {
					aliasDB.removeOne(cmd);
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
				irc.say(input.context, "[Help] Options are: add, remove, list, info");
				break;
			}
		} else {
			irc.say(input.context, "[Help] Options are: add, remove, list, info");
		}
	}
});

listen({
	handle: "var",
	regex: regexFactory.startsWith("var"),
	command: {
		root: "var",
		options: "write, remove, append, seppend, seprem, list",
		help: "Allows {vars} to be used in aliases. Default vars are:{input.from}, {channel}, {randThing}."
	},
	callback: function (input) {
		var keys, list, i, gotten, varName,
			args = input.match[1].split(" "),
			varString = args.slice(2).join(" ");
		if (args[0]) {
			// What option is picked
			switch (args[0]) {
			case "write":
				if (args[1] && varString) {
					varName = "{" + args[1] + "}";
					varDB.saveOne(varName, varString);
					irc.say(input.context, "Created :)");
				} else {
					irc.say(input.context, "[Help] var write VARNAME VARDATA");
				}
				break;
			case "append":
				if (args[1] && varString) {
					varName = "{" + args[1] + "}";
					gotten = varDB.getOne(varName);
					if (gotten) {
						varDB.saveOne(varName, gotten + " " + varString);
					} else {
						varDB.saveOne(varName, varString);
					}
					irc.say(input.context, "Added o7");
				} else {
					irc.say(input.context, "[Help] var append VARNAME VARDATA");
				}
				break;
			case "seppend":
				varString = args.slice(3).join(" ");
				if (args[1] && args[2] && varString) {
					varName = "{" + args[1] + "}";
					gotten = varDB.getOne(varName);
					if (gotten) {
						varDB.saveOne(varName, gotten + (args[2] === "," ? ", "
							: " " + args[2] + " ") + varString.trim());
					} else {
						varDB.saveOne(varName, varString.trim());
					}
					irc.say(input.context, "Added o7");
				} else {
					irc.say(input.context, "[Help] var seppend VARNAME SEPARATOR VARDATA");
				}
				break;
			case "seprem":
				varString = args.slice(3).join(" ");
				if (args[1] && args[2] && varString) {
					varName = "{" + args[1] + "}";
					gotten = varDB.getOne(varName);
					if (gotten) {
						if (gotten === varString) {
							varDB.removeOne(varName);
							irc.say(input.context, "Removed o7");
						} else {
							varDB.saveOne(varName, gotten.split((args[2] === "," ? ", " : " " + args[2] + " "))
								.filter(function (element) {
									return (element !== varString);
								})
								.join((args[2] === "," ? ", " : " " + args[2] + " ")));
							irc.say(input.context, "Removed o7");
						}
					} else {
						irc.say("[Error] seprem requires a variable to look up, a separator and an entry to remove");
					}
				} else {
					irc.say(input.context, "[Help] var seprem VARNAME SEPARATOR ENTRY");
				}
				break;
			case "remove":
				if (args[1]) {
					varName = "{" + args[1] + "}";
					varDB.removeOne(varName);
					irc.say(input.context, "Removed :)");
				} else {
					irc.say(input.context, "[Help] Tell me which var to remove");
				}
				break;
			case "list":
				keys = varDB.getKeys();
				list = "";
				for (i = 0; i < keys.length; i += 1) {
					list += keys[i] + ", ";
				}
				irc.say(input.context, list);
				break;
			case "access":
				if (args[1]) {
					switch (args[1]) {
					case "deny":
						if (args[2] && args[3]) {
							var varName = "{"+args[2]+"}",
								user = args[3].toLowerCase(),
								act = modifyAccessList(varName, "deny", user);
							if (!act) {
								irc.say(input.context, "Added " + args[3] + " to " + varName + "'s deny list.");
							} else {
								if (act == "removed") {
									irc.say(input.context, "Removed " + args[3] + " from " + varName + "'s deny list.");
								} else {
									irc.say(input.context, "[Help] There is no " + varName + " variable.");
								}
							}
						} else {
							irc.say(input.context, "[Help] Syntax: var access deny <varname> <user> - if the user is already in the list, they will be removed.");
						}
						break;
					case "allow":
						if (args[2] && args[3]) {
							var varName = "{"+args[2]+"}",
								user = args[3].toLowerCase(),
								act = modifyAccessList(varName, "allow", user);
							if (!act) {
								irc.say(input.context, "Added " + args[3] + " to " + varName + "'s allow list.");
							} else {
								if (act == "removed") {
									irc.say(input.context, "Removed " + args[3] + " from " + varName + "'s allow list.");
								} else {
									irc.say(input.context, "[Help] There is no " + varName + " variable.");
								}
							}
						} else {
							irc.say(input.context, "[Help] Syntax: var access allow <varname> <user> - if the user is already in the list, they will be removed.");
						}
						break;
					case "list":
						if (args[2]) {
							var varName = "{" + args[2] + "}";
							var entry = vAccessDB.getOne(varName);
							if (entry) { 
								if (entry.deny && entry.deny.length > 0) {
									irc.say(input.context, varName + "'s deny list: " + entry.deny.join(", "));
								} else {
									irc.say(input.context, varName + "'s deny list is empty.");
								}
								if (entry.allow && entry.allow.length > 0) {
									irc.say(input.context, varName + "'s allow list: " + entry.allow.join(", "));
								} else {
									irc.say(input.context, varName + "'s allow list is empty.");
								}
							} else {
								irc.say(input.context, varName + " has no access lists yet.");
							}
						} else {
							irc.say(input.context, "[Help] Syntax: var list <varname>");
						}
						break;
					default:
						irc.say(input.context, "[Help] Syntax: var access <allow / deny / list> [varname] [user]");
						break;
					}
				}
				break;
			default:
				irc.say(input.context, "[Help] Options are: add, remove, list");
				break;
			}
		} else {
			irc.say(input.context, "[Help] Options are: add, remove, list");
		}
	}
});

function modifyAccessList(varName, list, user) {
	// if it's in the list, remove, otherwise add.
	if (varName && user && (list == "deny" || list == "allow")) {
		if (varDB.getOne(varName)) {
			var entry = vAccessDB.getOne(varName),
				rm = 0;
			if (entry) {
				if (list == "deny") {
					if (entry.deny.some(function (item) { return (item === user); })) {
						entry.deny = entry.deny.filter(function (item) { return (item !== user); });
						rm = 1;
					} else {
						entry.deny.push(user);
					}
				} else {
					if (entry.allow.some(function (item) { return (item === user); })) {
						entry.allow = entry.allow.filter(function (item) { return (item !== user); });
						rm = 1;
					} else {
						entry.allow.push(user);
					}
				}
			} else { 
				if (list == "deny") var entry = { allow: [], deny: [ user ] };
				else var entry = { allow: [ user ], deny: [] };
			}
			vAccessDB.saveOne(varName, entry);
			if (rm == 1) return "removed";
			return;
		} else { return "novar"; }
	} else {
		log2("warn", "(modifyAccessList) improper syntax.");
	}
}
