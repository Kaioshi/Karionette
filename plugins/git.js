"use strict";
var run = require('child_process').exec,
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
					announce.push([ "say", target, "git: "+lib.decode(entry.title)+" ~ "+entry.link, false ]);
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

evListen({
	handle: "gitAnnouncerCheck",
	event: "300s tick",
	callback: checkGits
});

evListen({ // check for updates when we start and joins are done
	handle: "gitAnnouncerCheckOnStart",
	event: "autojoinFinished",
	callback: checkGits
});

cmdListen({
	command: "git",
	help: "git pull for people too lazy to open a shell. Admin only.",
	syntax: config.command_prefix+"git pull",
	admin: true,
	arglen: 1,
	callback: function (input) {
		var changes, i, l, target, aList;
		switch (input.args[0].toLowerCase()) {
		case "pull":
			if (userLogin.isAdmin(input.user)) {
				run("git pull", function (error, stdout, stderr) {
					stdout = stdout.split("\n");
					changes = []; i = 0; l = stdout.length;
					for (; i < l; i++) {
						if (stdout[i][0] === " " && stdout[i][1] !== " ")
							changes.push([ "say", input.context, stdout[i].trim(), false ]);
					}
					if (changes.length > 0)
						irc.rated(changes);
					else
						irc.say(input.context, "Nothing changed.");
				});
			} else {
				irc.say(input.context, "Only admins may pull the git.");
			}
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
			irc.say(input.context, "There is only one option. "+config.command_prefix+"git pull");
			break;
		}
	}
});
