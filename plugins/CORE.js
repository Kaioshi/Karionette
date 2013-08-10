var autojoinDB = new DB.List({filename: 'autojoin'}),
	nickArr = config.nickname,
	currentNick = config.nickname[0];

// Keeps the bot connected
listen({
	plugin: "CORE",
	handle: 'ping',
	regex: /^PING :(.+)$/i,
	callback: function (input, match) {
		irc.pong(match[1]);
	}
});

listen({
	plugin: "CORE",
	handle: 'nickChange',
	regex: /^:[^ ]+ 433 [^ ]+ [^ ]+ :.*$/,
	once: true,
	callback: function () {
		nickArr = nickArr.filter(function (element) {
			return (currentNick !== element);
		});
		if (nickArr[0]) {
			currentNick = nickArr[0];
		} else {
			currentNick = config.nickname[0] + (Math.floor(Math.random() * 100));
		}
		// 433 is nick taken
		setTimeout(function () {
			irc.raw("NICK " + currentNick);
		}, 3000); // wait 3 seconds
	}
});

listen({
	plugin: "CORE",
	handle: 'nickserv',
	regex: new RegExp('^:' + config.nickserv_nickname + '!' + config.nickserv_hostname + ' NOTICE [^ ]+ :This nickname is registered', 'i'),
	callback: function () {
		irc.say('NickServ', 'IDENTIFY ' + config.nickserv_password);
	}
});

listen({
	plugin: "CORE",
	handle: "ctcp",
	regex: /^:[^ ]+ PRIVMSG [^ ]+ :\x01(VERSION|PING .*|TIME)\x01$/i,
	callback: function (input, match) {
		var ctcp = match[1].split(" ");
		switch (ctcp[0].toUpperCase()) {
			case "VERSION":
				irc.raw("NOTICE "+input.context+" :\x01VERSION Karionette ~ \x02"+lib.randSelect([
						"Now with 90% more butts!",
						"All dem bot butts",
						"This one time, at band camp..",
						"Secretly loves fish fingers and custard",
						"Dun dun dunnnn",
						"N-Nya..",
						"Pantsu?",
						"PANTSU!",
						"Needs more Pantsu."])+
					"\x02 ~ https://github.com/Kaioshi/Karionette.git [based on Marionette by Deide @ EsperNet]\x01");
				break;
			case "TIME":
				irc.raw("NOTICE "+input.context+" :\x01TIME "+new Date()+"\x01");
				break;
			case "PING":
				irc.raw("NOTICE "+input.context+" :\x01PING "+ctcp.slice(1).join(" ")+"\x01");
				break;
			default:
				break; // should never happen
		}
	}
});

listen({
	plugin: "CORE",
	handle: 'joinChannels',
	regex: /^:[^ ]+ 376 [^ ]+ :.*$/,
	once: true,
	callback: function () {
		// 376 is the end of MOTD
		if (autojoinDB.size() > 0) {
			setTimeout(function () {
				var channels = autojoinDB.getAll(), i;
				for (i in channels) {
					irc.join(channels[i]);
				}
			}, 2000); // wait 2 seconds for a cloak to apply
		}
	}
});

/*
 * COMMANDS:
 *	- say
 *	- sayuni
 *	- action
 *	- notice
 *	- help
 *	- memstats
 *	- uptime
 */

listen({
	plugin: "CORE",
	handle: 'say',
	regex: regexFactory.startsWith("say", "optional"),
	command: {
		root: "say",
		options: "{What you want me to say}",
		help: "Makes me say something. Duh!"
	},
	callback: function (input, match) {
		irc.say(input.context, match[1]);
	}
});

listen({
	plugin: "CORE",
	handle: 'sayuni',
	regex: regexFactory.startsWith("sayuni", "optional"),
	callback: function (input, match) {
		irc.say(input.context, match[1], false);
	}
});

listen({
	plugin: "CORE",
	handle: 'action',
	regex: regexFactory.startsWith("action"),
	command: {
		root: "action",
		options: "{What you want me to do}",
		help: "Makes me do something. Duh!"
	},
	callback: function (input, match) {
		irc.action(input.context, match[1]);
	}
});

listen({
	plugin: "CORE",
	handle: "actionuni",
	regex: regexFactory.startsWith("actionuni"),
	command: {
		root: "action",
		options: "{What you want me to do}",
		help: "Makes me do something. Der!"
	},
	callback: function (input, match) {
		irc.action(input.context, match[1], false);
	}
});

listen({
	plugin: "CORE",
	handle: "notice",
	regex: regexFactory.startsWith("notice"),
	command: {
		root: "notice",
		options: "{Who and what you want me to notice}",
		help: "I'll notice someone. Being shifty, probably.",
		syntax: "[Help] Syntax: " + config.command_prefix + "notice <nick> <notice message>"
	},
	callback: function (input, match) {
		var args = match[1].split(" "),
			target = args[0],
			notice = args.slice(1).join(" ");
		if (target[0] === "#" && !permissions.isAdmin(input.user)) {
			irc.notice(input.from, "No. Only admins can make me notice an entire channel.");
			return;
		}
		irc.notice(target, notice);
	}
});

listen({
	plugin: "CORE",
	handle: "help",
	regex: regexFactory.startsWith("help"),
	command: {
		root: "help",
		options: "{command you're interested in}",
		help: "Seriously?"
	},
	callback: function (input, match) {
		var i,
			args = match[1].split(" "),
			cmdArr = irc.help(),
			cmdList = "",
			notFound = true;
		if (args[0]) {
cmdChek:	for (i = 0; i < cmdArr.length; i += 1) {
				if (cmdArr[i].root === args[0]) {
					if (cmdArr[i].options) { irc.say(input.context, "Options: " + cmdArr[i].options); }
					if (cmdArr[i].help) { irc.say(input.context, cmdArr[i].help); }
					notFound = false;
					break cmdChek;
				}
			}
			if (notFound) { irc.say(input.context, "[Help] Didn't find that command. Check the list again."); }
		} else {
			cmdList = cmdArr.map(function (element) {
				return element.root;
			}).sort().join(", ");
			irc.say(input.context, "Commands: " + cmdList);
		}
	}
});

// Memory usage report
listen({
	plugin: "CORE",
	handle: "memstats",
	regex: regexFactory.startsWith("memstats"),
	command: {
		root: "memstats",
		help: "Shows memory usage."
	},
	callback: function (input) {
		irc.say(input.context, "I'm currently using " + lib.memUse() + " MiB of memory.");
	}
});

// get uptime
listen({
	plugin: "CORE",
	handle: "uptime",
	regex: regexFactory.startsWith("uptime"),
	command: {
		root: "uptime",
		help: "Shows uptime since the bot was started."
	},
	callback: function (input) {
		irc.say(input.context, "I've been running for " + lib.duration(globals.startTime) + ".");
	}
});
