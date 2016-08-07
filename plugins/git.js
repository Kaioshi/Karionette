"use strict";
const [web, DB] = plugin.importMany("web", "DB"),
	run = plugin.import("require")("child_process").execFile,
	gitDB = new DB.Json({filename: "gitannounce2"});

function checkGits(target) {
	if (!gitDB.hasOne("announce"))
		return;
	const aList = gitDB.getOne("announce");
	if (!aList.length)
		return;
	const latest = gitDB.getOne("latest");
	web.json("https://api.github.com/repos/Kaioshi/Karionette/commits"+(latest ? "?since="+latest : ""))
		.then(resp => {
			if (resp[0].commit.author.date === latest)
				return; // nothing new
			gitDB.saveOne("latest", resp[0].commit.author.date);
			if (target)
				resp.forEach(commit => irc.say(target, commit.commit.message+" ~ "+commit.html_url));
		}).catch(logger.error);
}

bot.command({
	command: "git",
	help: "git pull for people too lazy to open a shell. Admin only.",
	syntax: config.command_prefix+"git pull / fap (quieter pull) "+config.command_prefix+"git announce",
	admin: true,
	arglen: 1,
	callback: function (input) {
		switch (input.args[0].toLowerCase()) {
		case "fap": // quiet pull ;)
			run("git", ["pull"], {}, function (error, stdout) {
				let stats = "";
				stdout.split("\n").forEach(line => {
					if (line.includes(" files changed") || line.includes(" file changed"))
						stats = line.trim();
				});
				if (stats) {
					irc.say(input.context, stats);
					checkGits(); // no target since this needs to be quiet
				} else {
					irc.say(input.context, "Already up-to-date.");
				}
			});
			break;
		case "pull":
			run("git", [ "pull" ], {}, function (error, stdout) {
				let changes = false;
				stdout.split("\n").forEach(line => {
					if (line[0] === " " && line[1] !== " ") {
						changes = true;
						irc.say(input.context, line.trim());
					}
				});
				if (!changes)
					irc.say(input.context, "Already up-to-date.");
				else
					checkGits(input.context);
			});
			break;
		default:
			irc.say(input.context, bot.cmdHelp("git", "syntax"));
			break;
		}
	}
});
