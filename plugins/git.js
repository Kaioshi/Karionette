var run = require('child_process').exec;

cmdListen({
	command: "git",
	help: "git pull for people too lazy to open a shell",
	callback: function (input) {
		var changes, i, l;
		if (input.args && input.args[0] === "pull") { 
			if (userLogin.isAdmin(input.user)) {
				run("git pull", function (error, stdout, stderr) {
					stdout = stdout.split("\n");
					changes = []; i = 0; l = stdout.length;
					for (; i < l; i++) {
						if (stdout[i][0] === " " && stdout[i][1] !== " ") {
							changes.push([
								"say",
								input.context,
								stdout[i].trim(),
								false
							]);
						}
					}
					if (changes.length > 0) irc.rated(changes);
					else irc.say(input.context, "Nothing changed?");
				});
			} else {
				irc.say(input.context, "Only admins may pull the git.");
			}
		} else {
			irc.say(input.context, "There is only one option. "+config.command_prefix+"git pull");
		}
	}
});

