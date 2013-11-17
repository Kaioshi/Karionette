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

evListen({
	handle: "nickChange",
	event: "433",
	callback: function (input) {
		var i;
		/*
		 * must be the one we set in config.js, and we're not connected yet.
		 * since it's tracked after that point, and only when it's changed
		 * successfully.
		 */
		input.args = input.raw.split(" ");
		if (input.args[3] === config.nick) {
			if (config.nickname.length === 0 || config.nickname.length === 1) {
				// we've used all possible nicks, lets try config.nick_.
				setTimeout(function () {
					config.nick = config.nick+"_";
					irc.raw("NICK "+config.nick);
				}, 1000);
			} else {
				for (i = 0; i < config.nickname.length; i++) {
					console.log(config.nickname[i]+" - "+i);
					if (config.nickname[i] === config.nick) {
						config.nickname.splice(i, 1);
					} else {
						config.nick = config.nickname[i];
						setTimeout(function () {
							irc.raw("NICK " + config.nick);
						}, 1000);
					}
				}
			}
		}
		input = null;
	}
});

evListen({
	handle: "nickserv",
	event: "NOTICE",
	regex: new RegExp("^:"+config.nickserv_nickname+"!"+config.nickserv_hostname+" NOTICE [^ ]+ :This nickname is registered", "i"),
	callback: function (input) {
		irc.say("NickServ", "IDENTIFY " + config.nickserv_password);
	}
});

evListen({
	handle: "ctcp",
	event: "PRIVMSG",
	regex: /^:[^ ]+ PRIVMSG [^ ]+ :\x01(VERSION|PING .*|TIME)\x01$/i,
	callback: function (input) {
		var ctcp = input.match[1].split(" ");
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
				var i, k = 0,
					channels = autojoinDB.getAll();
				for (i in channels) {
					irc.join(channels[i]);
				}
				// 315 signifies the end of a channel's WHO response,
				// at which point our IAL is fully updated.
				lib.events.on("Event: 315", function (input) {
					k++;
					if (k === channels.length) {
						logger.debug("Finished joins.");
						lib.events.emit("autojoinFinished");
					}
				});
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
		if (input.args[0][0] === "#" && !userLogin.isAdmin(input.user)) {
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
			irc.say(input.context, "\""+cmd+"\" either has no help or isn't a command.");
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

// Get Mari's age
cmdListen({
	command: "age",
	help: "Tells you how old Mari is!",
	callback: function (input) {
		irc.say(input.context, "I am " 
			+ lib.duration(new Date("1 May 2013 18:40:00 GMT"))	+ " old, but always sweet as sugar.");
	}
});
