// perms fondling
"use strict";
var aliasDB = new DB.Json({filename: "alias/alias", queue: true}),
	varDB = new DB.Json({filename: "alias/vars", queue: true});

function itemExists(type, item) {
	var variable, alias;
	switch (type) {
		case "variable":
			variable = varDB.getOne("{"+item.toLowerCase()+"}");
			if (variable) {
				variable = null;
				return true;
			}
			break;
		case "alias":
			alias = aliasDB.getOne(item);
			if (alias) {
				alias = null;
				return true;
			}
			break;
		case "command":
			if (cmdExists(item)) return true;
			break;
		default:
			logger.debug("[perms/itemExists] called with "+item+" item. this is not a thing.");
			break;
	}
}

cmdListen({
	command: [ "perms", "permissions" ],
	help: "Lets you set permissions on aliases/variables/commands. See also: claim, inspect",
	syntax: config.command_prefix+"perms <allow/deny/owner> <add/remove> <alias/variable/command> \
		<name of alias/variable/command> <username> - Example: "+config.command_prefix+"perms \
		deny add alias whip mitch",
	callback: function (input) {
		var reg, result, user;
		reg = /^(allow|deny|owner) (add|remove) (alias|variable|command) ([^ ]+) ([^ ]+)/.exec(input.data);
		if (!reg) {
			irc.say(input.context, cmdHelp("perms", "syntax"));
			return;
		}
		// does it exist?
		if (!perms.hasPerms(reg[3], reg[4])) {
			irc.say(input.context, reg[3]+" "+reg[4]+" has no owner set - or doesn't exist. \
				Someone needs to create or claim it first.");
			return;
		}
		result = perms.Action(input.user, reg[1]+" "+reg[2], reg[3], reg[4], reg[5]);
		if (result) {
			irc.say(input.context, "I've altered the permissions accordingly.");
		} else {
			irc.say(input.context, "Nope.");
		}
	}
});

cmdListen({
	command: "inspect",
	help: "Shows permission information on an alias, variable or command. See also: perms, claim",
	syntax: config.command_prefix+"inspect <variable/alias/command> <name of variable/alias/command>",
	callback: function (input) {
		var reg, result;
		reg = /^(variable|alias|command) ([^ ]+)/.exec(input.data.toLowerCase());
		if (!reg) {
			irc.say(input.context, cmdHelp("inspect", "syntax"));
			return;
		}
		result = perms.Info(input.user, reg[1], reg[2]);
		if (result === -1) {
			irc.say(input.context, reg[1]+" "+reg[2]+" either doesn't exist, or has no permissions set.");
			return;
		}
		if (result === -2) {
			irc.say(input.context, "You need to be an admin to inspect "+reg[1]+" "+reg[2]+".");
			return;
		}
		irc.notice(input.nick, result.join(" -- "));
	}
});

cmdListen({
	command: "claim",
	help: "Allows you to claim ownership of an unclaimed alias, variable or command. See also: perms, inspect",
	syntax: config.command_prefix+"claim <alias/variable/command> <name of alias/variable/command>",
	arglen: 2,
	callback: function (input) {
		var reg, result, admin, user;
		reg = /^(alias|variable|command) ([^ ]+)/.exec(input.data.toLowerCase());
		if (!reg) {
			irc.say(input.context, cmdHelp("claim", "syntax"));
			return;
		}
		if (!itemExists(reg[1], reg[2])) {
			irc.say(input.context, "There is no "+reg[2]+" "+reg[1]+" to claim.");
			return;
		}
		admin = userLogin.isAdmin(input.user);
		user = userLogin.Check(input.user);
		if (!user) {
			irc.say(input.context, "You need to be identified with me to claim anything.");
			return;
		}
		if (!perms.hasPerms(reg[1], reg[2])) {
			if (reg[1] === "command" && !admin) {
				irc.say(input.context, "Only admins can claim commands.");
				return;
			}
			if (!perms.DB[reg[1]]) perms.DB[reg[1]] = {};
			if (!perms.DB[reg[1]][reg[2]]) perms.DB[reg[1]][reg[2]] = {};
			if (!perms.DB[reg[1]][reg[2]].owner) perms.DB[reg[1]][reg[2]].owner = {};
			perms.DB[reg[1]][reg[2]].owner[user] = true;
			perms.Save();
			irc.say(input.context, "You're now the proud new owner of the "+reg[2]+" "+reg[1]+".");
		} else {
			irc.say(input.context, reg[1]+" "+reg[2]+" is not unclaimed.");
		}
	}
});

