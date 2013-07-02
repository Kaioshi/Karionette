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
						if (checkAccessList(varName, input.from.toLowerCase())) {
							varDB.saveOne(varName, varString);
							checkAccessList(varName, input.from.toLowerCase(), true); // adds owner
							irc.say(input.context, "Created :)");
						} else {
							irc.reply(input, "you don't have permission to overwrite " + varName);
						}
					} else {
						varDB.saveOne(varName, varString);
						checkAccessList(varName, input.from.toLowerCase(), true); // adds owner
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
						if (checkAccessList(varName, input.from.toLowerCase())) {
							varDB.saveOne(varName, gotten + " " + varString);
							irc.say(input.context, "Added o7");
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, varString);
						checkAccessList(varName, input.from.toLowerCase(), true); // adds owner
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
						if (checkAccessList(varName, input.from.toLowerCase())) {
							varDB.saveOne(varName, gotten + (args[2] === "," ? ", "
								: " " + args[2] + " ") + varString.trim());
							irc.say(input.context, "Added o7");
						} else {
							irc.reply(input, "you don't have permission to do that.");
						}
					} else {
						varDB.saveOne(varName, varString.trim());
						checkAccessList(varName, input.from.toLowerCase(), true); // adds owner
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
						if (checkAccessList(varName, input.from.toLowerCase())) {
							if (gotten === varString) {
								varDB.removeOne(varName);
								vAccessDB.removeOne(varName);
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
					var varName = "{" + args[1] + "}";
					if (checkAccessList(varName, input.from.toLowerCase())) {
						varDB.removeOne(varName);
						vAccessDB.removeOne(varName);
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
						var varperms = vAccessDB.getOne(varName),
							permstr = "";
						if (varperms && varperms.owner) {
							permstr = permstr + " (Owner: " + varperms.owner;
							if (varperms.allow.length > 0) permstr = permstr + " -- Allow: " + varperms.allow.join(", ");
							if (varperms.deny.length > 0) permstr = permstr + " -- Deny: " + varperms.deny.join(", ");
							permstr = permstr + ")";
						}
						if (permstr) irc.say(input.context, "Variable " + varName + " contains: \"" + variable + "\"" + permstr);
						else irc.say(input.context, "Variable " +varName + " contains: \"" + variable + "\"");
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
			case "access":
				if (args[1]) {
					switch (args[1]) {
					case "owner":
						if (args[2] && args[3]) {
							var varName = "{"+args[2]+"}",
								gotten = varDB.getOne(varName);
							if (gotten) {
								var entry = vAccessDB.getOne(varName);
								if (!entry) {
									entry = { owner: args[3].toLowerCase() };
									vAccessDB.saveOne(varName, entry);
									irc.say(input.context, args[3] + " is the proud new owner of the previously unclaimed variable " + varName);
								} else if (entry.owner === input.from.toLowerCase()) {
									entry.owner = args[3].toLowerCase();
									vAccessDB.saveOne(varName, entry);
									irc.say(input.context, args[3] + " is the proud new owner of " + varName);
								} else {
									irc.reply(input, "you need to be the owner to transfer ownership.");
								}
							} else {
								irc.reply(input, "there is no " + varName + " variable.");
							}
						} else {
							irc.say(input.context, "[Help] Syntax: var access owner <varname> <newowner>");
						}
						break;
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
								var accessList = "Owner: " + entry.owner;
								if (entry.deny && entry.deny.length > 0) {
									accessList += " - Deny: " + entry.deny.join(", ");
								}
								if (entry.allow && entry.allow.length > 0) {
									accessList += " - Allow: " + entry.allow.join(", ");
								}
								irc.say(input.context, varName + " access list -> " + accessList);
							} else {
								irc.say(input.context, varName + " has no access list or doesn't exist.");
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
				irc.say(input.context, "[Help] Options are: " + this.command.options);
				break;
			}
		} else {
			irc.say(input.context, "[Help] Options are: " + this.command.options);
		}
	}
});

function checkAccessList(varName, user, create) {
	var entry = {};
	if (varName && user && create) {
		// someone is creating a variable, they need to be set as the owner
		entry = vAccessDB.getOne(varName);
		if (entry) {
			entry.owner = user;
		} else {
			entry = { owner: user, deny: [], allow: [] };
		}
		vAccessDB.saveOne(varName, entry);
	} else if (varName && user) {
		entry = vAccessDB.getOne(varName);
		if (entry) {
			if (entry.owner === user) return true;
			if (entry.deny.some(function (item) { return (item === user); })) { return false; }
			if (entry.allow.length > 0) {
				if (entry.allow.some(function (item) { return (item === user); })) { return true; }
				return false;
			}
		}
		return true;
	}
}

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
						// added to deny - check if they're in the allow list, remove if so
						if (entry.allow.some(function (item) { return (item === user); })) {
							entry.allow = entry.allow.filter(function (item) { return (item !== user); });
						}
					}
				} else {
					if (entry.allow.some(function (item) { return (item === user); })) {
						entry.allow = entry.allow.filter(function (item) { return (item !== user); });
						rm = 1;
					} else {
						entry.allow.push(user);
						// added to allow - check if they're in the deny list, remove them if so
						if (entry.deny.some(function (item) { return (item === user); })) {
							entry.deny = entry.deny.filter(function (item) { return (item !== user); });
						}
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
	}
}
