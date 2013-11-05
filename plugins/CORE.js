var autojoinDB = new DB.List({filename: 'autojoin'}),
	nickArr = config.nickname,
	currentNick = config.nickname[0];

// Keeps the bot connected
evListen({
	handle: "corePing",
	event: "PING",
	callback: function (input) {
		irc.pong(input.challenge);
	}
});

listen({
	plugin: "CORE",
	handle: "nickChange",
	regex: /^:[^ ]+ 433 [^ ]+ [^ ]+ :.*$/,
	once: true,
	callback: function () {
		nickArr = nickArr.filter(function (element) {
			return (currentNick !== element);
		});
		if (nickArr[0]) {
			currentNick = nickArr[0];
		} else {
			currentNick = config.nickname[0] + lib.randNum(100);
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

evListen({
	handle: "coreAutojoin",
	event: "376",
	callback: function () {
		// 376 is the end of MOTD
		if (autojoinDB.size() > 0) {
			setTimeout(function () {
				var channels = autojoinDB.getAll(), i;
				for (i in channels) {
					irc.join(channels[i]);
				}
				setTimeout(function () {
					lib.events.emit("autojoinFinished");
				}, 3000); // wait for the joins to finish
			}, 2000); // wait 2 seconds for a cloak to apply
		}
	},
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

cmdListen({
	command: "say",
	help: "Makes me say something. Duh!",
	syntax: config.command_prefix+"say <what you want me to say>",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("say", "syntax"));
			return;
		}
		irc.say(input.context, input.data);
	}
});

cmdListen({
	command: "sayuni",
	help: "Makes me say something, Unicode-style. Represent!",
	syntax: config.command_prefix+"sayuni <what you want me to say>",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("sayuni", "syntax"));
			return;
		}
		irc.say(input.context, input.data, false);
	}
});

cmdListen({
	command: "action",
	help: "Makes me do something. Probably erotic.",
	syntax: config.command_prefix+"action <what you want me to do>",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("action", "syntax"));
			return;
		}
		irc.action(input.context, input.data);
	}
});

cmdListen({
	command: "actionuni",
	help: "Makes me do stuff in a Unicode-kinda way.",
	syntax: config.command_prefix+"actionuni <what you want me to do>",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("actionuni", "syntax"));
			return;
		}
		irc.action(input.context, input.data, false);
	}
});

cmdListen({
	command: "notice",
	help: "Makes me notice things. Like your new shoes!",
	syntax: config.command_prefix+"notice <target> <what you want me to notice them>",
	callback: function (input) {
		if (input.args[0][0] === "#" && !permissions.isAdmin(input.nick+"!"+input.address)) {
			irc.notice(input.nick, "No. Only admins can make me notice an entire channel.");
			return;
		}
		console.log(input.data);
		irc.notice(input.args[0], input.data.slice(input.data.indexOf(" ")+1));
	}
});

cmdListen({
	command: "help",
	help: "Seriously?",
	syntax: config.command_prefix+"help [<command you want help with>] - supply no command in order to list commands.",
	callback: function (input) {
		var found, cmd, cmdArr, i, help, syntax, options, commandList;
		if (!input.args || !input.args[0]) {
			// show all commands
			commandList = cmdList();
			irc.help().forEach(function (entry) {
				commandList.push(entry.root);
			});
			irc.say(input.context, "Available commands: "+commandList.sort().join(", "));
			return;
		}
		found = false;
		cmd = input.args[0].toLowerCase();
		help = cmdHelp(cmd, "help");
		if (help) {
			syntax = cmdHelp(cmd, "syntax");
			options = cmdHelp(cmd, "options");
			irc.say(input.context, help);
			if (syntax) irc.say(input.context, syntax);
			if (options) irc.say(input.context, options);
			found = true;
		} else {
			// must not be caveman'd yet
			cmdArr = irc.help();
cmdCheck:	for (i = 0; i < cmdArr.length; i++) {
				if (cmdArr[i].root === input.args[0]) {
					if (cmdArr[i].options) { irc.say(input.context, "Options: "+cmdArr[i].options); }
					if (cmdArr[i].help) { irc.say(input.context, cmdArr[i].help); }
					found = true;
					break cmdCheck;
				}
			}
			cmdArr = null;
		}
		if (!found) {
			irc.say(input.context, "[Help] Couldn't find a \""+cmd+"\" command, or it had no help. Try "+
				config.command_prefix+"help on it's own to see a list of available commands.");
		}
	}
});

// Show node version
cmdListen({
	command: "nodeversion",
	help: "Shows the node version I'm running.",
	callback: function (input) {
		irc.say(input.context, lib.nodeVersion());
	}
});

// Memory usage report
cmdListen({
	command: "memstats",
	help: "Shows how much memory I'm using.",
	callback: function (input) {
		irc.say(input.context, "I'm currently using "+lib.memUse()+" MiB of memory.");
	}
});

// get uptime
cmdListen({
	command: "uptime",
	help: "Shows how long it's been since I was started.",
	callback: function (input) {
		irc.say(input.context, "I've been running for "+lib.duration(globals.startTime)+".");
	}
});

