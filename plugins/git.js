var sys = require('sys');

cmdListen({
	command: "git",
	help: "git pull for people too lazy to open a shell",
	callback: function (input) {
		var reg;
		if (input.args && input.args[0] === "pull") { 
			if (permissions.isAdmin(input.nick+"!"+input.address)) {
				sys.exec("git pull", function (error, stdout, stderr) {
					if (stdout === "Already up-to-date.\n") irc.say(input.context, stdout.slice(0,-1));
					else {
						reg = /\n ([0-9]+) files changed, ([0-9]+) insertions\(\+\), ([0-9]+) deletions\(\-\)\n/.exec(stdout);
						irc.say(input.context, reg[1]+" file(s) changed; "+reg[2]+" insertions, "+reg[3]+" deletions.");
					}
				});
			} else {
				irc.say(input.context, "Only admins may pull the git.");
			}
		} else {
			irc.say(input.context, "There is only one option. "+config.command_prefix+"git pull");
		}
	}
});

