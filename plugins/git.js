"use strict";
const [lib, web, DB] = plugin.importMany("lib", "web", "DB"),
	run = plugin.import("require")("child_process").execFile,
	gitDB = new DB.Json({filename: "gitannounce2"});

function checkGits(target) {
	if (!gitDB.hasOne("announce"))
		return;
	const aList = gitDB.getOne("announce");
	if (!aList || !aList.length)
		return;
	lib.runCallback(function *main(cb) { try {
		const latest = gitDB.getOne("latest");
		const resp = JSON.parse(yield web.fetchAsync("https://api.github.com/repos/Kaioshi/Karionette/commits"+(latest ? "?since="+latest : ""), null, cb));
		if (resp[0].commit.author.date === latest)
			return; // nothing new
		gitDB.saveOne("latest", resp[0].commit.author.date);
		if (target)
			resp.forEach(commit => irc.say(target, commit.commit.message+" ~ "+commit.html_url, true));
	} catch (error) {
		logger.error("checkGits - "+error.message, error.stack);
	}});
}

bot.command({
	command: "git",
	help: "git pull for people too lazy to open a shell. Admin only.",
	syntax: config.command_prefix+"git pull / fap (quieter pull) "+config.command_prefix+"git announce",
	admin: true,
	arglen: 1,
	callback: function (input) {
		switch (input.args[0].toLowerCase()) {
		case "pull":
			lib.runCallback(function *main(cb) { try {
				const stdout = yield run("git", ["pull"], null, cb);
				let changes = false;
				stdout.split("\n").forEach(line => {
					if (line[0] === " " && line[1] !== " ") {
						changes = true;
						irc.say(input.context, line.trim(), true);
					}
				});
				if (!changes)
					return irc.say(input.context, "Already up-to-date.");
				checkGits(input.context);
			} catch (error) {
				logger.error("git pull - "+error.message, error.stack);
			}});
			break;
		case "fap":
			lib.runCallback(function *main(cb) { try {
				const stdout = yield run("git", ["pull"], null, cb);
				const reg = / lines changed| line changed/;
				let stats = "";
				stdout.split("\n").forEach(line => {
					if (reg.test(line))
						stats = line.trim();
				});
				if (stats) {
					irc.say(input.context, stats);
					return checkGits(); // no announcements, but get it up to date
				}
				irc.say(input.context, "Already up-to-date.");
			} catch (error) {
				logger.error("git fap - "+error.message, error.stack);
			}});
			break;
		case "announce": {
			const announce = gitDB.getOne("announce") || [],
				lcontext = input.context.toLowerCase(),
				index = announce.findIndex(target => target.toLowerCase().includes(lcontext));
			if (index > -1) {
				announce.splice(index, 1);
				irc.say(input.context, "Removed "+input.context+" from git announce.");
			} else {
				announce.push(lcontext);
				irc.say(input.context, "Added "+input.context+" to git announce.");
			}
			gitDB.saveOne("announce", announce);
			break;
		}
		default:
			irc.say(input.context, bot.cmdHelp("git", "syntax"));
			break;
		}
	}
});
