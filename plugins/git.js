"use strict";
var run = require("child_process").execFile,
	gitDB = new DB.Json({filename: "gitannounce"});

function checkGits() {
	var aList = gitDB.getOne("announceList");
	if (gitDB.size() === 0 || !aList || !aList.length)
		return;
	web.fetch("https://github.com/Kaioshi/Karionette/commits/master.atom")
	.then(web.atom2json)
	.then(function (json) {
		var altered = false,
			latest = gitDB.getOne("latest") || [],
			announce = [];
		json.forEach(function (entry) {
			if (latest.indexOf(entry.link) === -1) {
				aList.forEach(function (target) {
					announce.push([ "say", target, "git: "+lib.decode(entry.title)+" ~ "+entry.link ]);
				});
				latest.push(entry.link);
				altered = true;
			}
		});
		if (altered) {
			irc.rated(announce);
			gitDB.saveOne("latest", latest);
		}
	});
}

bot.event({
	handle: "gitAnnouncerCheck",
	event: "Ticker: 300s tick",
	callback: checkGits
});

bot.event({ // check for updates when we start and joins are done
	handle: "gitAnnouncerCheckOnStart",
	event: "autojoinFinished",
	callback: checkGits
});

bot.command({
	command: "git",
	help: "git pull for people too lazy to open a shell. Admin only.",
	syntax: config.command_prefix+"git pull / fap (quieter pull) "+config.command_prefix+"git announce",
	admin: true,
	arglen: 1,
	callback: function (input) {
		var changes, i, target, aList;
		switch (input.args[0].toLowerCase()) {
		case "fap": // quiet pull ;)
			run("git", ["pull"], {}, function (error, stdout) {
				globals.gitOutput = stdout;
				stdout = stdout.split("\n");
				let stats = "";
				for (i = 0; i < stdout.length; i++) {
					if (stdout[i].indexOf(" files changed") > -1 || stdout[i].indexOf(" file changed") > -1)
						stats = stdout[i].trim();
				}
				if (stats)
					irc.say(input.context, stats);
				else
					irc.say(input.context, "Already up-to-date.");
			});
			break;
		case "pull":
			run("git", [ "pull" ], {}, function (error, stdout) {
				stdout = stdout.split("\n");
				for (i = 0, changes = []; i < stdout.length; i++) {
					if (stdout[i][0] === " " && stdout[i][1] !== " ")
						changes.push([ "say", input.context, stdout[i].trim() ]);
				}
				if (changes.length > 0)
					irc.rated(changes);
				else
					irc.say(input.context, "Already up-to-date.");
			});
			break;
		case "announce": // toggle
			target = input.context.toLowerCase();
			aList = gitDB.getOne("announceList") || [];
			if (lib.hasElement(aList, target)) {
				aList = aList.filter(function (entry) { return entry !== target; });
				gitDB.saveOne("announceList", aList);
				irc.say(input.context, "Removed "+input.context+" from the git commit announcer.");
			} else {
				aList.push(target);
				gitDB.saveOne("announceList", aList);
				irc.say(input.context, "Added "+input.context+" to the git commit announcer.");
				checkGits();
			}
			break;
		default:
			irc.say(input.context, bot.cmdHelp("git", "syntax"));
			break;
		}
	}
});
