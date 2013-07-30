var sys = require('sys');

listen({
	plugin: "git",
	handle: "git",
	regex: regexFatory.startsWith("git"),
	command: {
		root: "git",
		options: "pull",
		help: "git pull for people too lazy to open a shell"
	},
	callback: function (input, match) {
		var reg;
		if (match[1] === "pull" && permissions.isAdmin(input.user)) {
			sys.exec("git pull", function (error, stdout, stderr) {
				reg = /^ ([0-9]+) files changed, ([0-9]+) insertions(+), ([0-9]+) deletions(-)$/.exec(stdout);
				console.log(reg);
			});
		} else {
			irc.say(input.context, "There is only one option. "+config.command_prefix+"git pull");
		}
	}
});
