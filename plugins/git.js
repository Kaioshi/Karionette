var sys = require('sys');

cmdListen({
	command: "git",
	help: "git pull for people too lazy to open a shell",
	callback: function (input) {
		var reg;
		if (input.args && input.args[0] === "pull") { 
			if (userLogin.isAdmin(input.user)) {
				sys.exec("git pull", function (error, stdout, stderr) {
					stdout = stdout.split("\n");
					irc.say(input.context, stdout[stdout.length-2].slice(1));
				});
			} else {
				irc.say(input.context, "Only admins may pull the git.");
			}
		} else {
			irc.say(input.context, "There is only one option. "+config.command_prefix+"git pull");
		}
	}
});

