// perms fondling
cmdListen({
	command: "perms",
	help: "Lets you set permissions on aliases/variables/commands.",
	syntax: config.command_prefix+"perms <allow/deny/owner> <add/remove> <alias/variable/command> \
		<alias/variable/command name> <username> - Example: "+config.command_prefix+"perms \
		deny add alias whip mitch",
	callback: function (input) {
		var reg, result, user;
		if (!input.data) {
			irc.say(input.context, cmdHelp("perms", "syntax"));
			return;
		}
		reg = /^(allow|deny|owner) (add|remove) (alias|variable|command) ([^ ]+) ([^ ]+)/i.exec(input.data);
		if (!reg) {
			irc.say(input.context, cmdHelp("perms", "syntax"));
			return;
		}
		// if it's an admin, do whatever they want.
		//user = userLogin.Check(input.user, true);
		
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

