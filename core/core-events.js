"use strict";
const nickServConfigured = (config.nickserv_nickname && config.nickserv_hostname && config.nickserv_password);
let ghostAttempts = 0;

if (config.gc) {
	let gcAndReport;
	if (config.memwatch) {
		gcAndReport = function () {
			let memuse, report, diff;
			globals.gc();
			memuse = process.memoryUsage().rss;
			if (memuse !== globals.memoryUsage) {
				report = lib.commaNum(Math.floor(memuse/1024));
				diff = Math.floor(((memuse-globals.memoryUsage)/1024));
				if (diff > 0)
					diff = " [+"+lib.space(lib.commaNum(diff), 6)+" KiB]";
				else
					diff = " [-"+lib.space(lib.commaNum(diff.toString().slice(1)), 6)+" KiB]";
				logger.memr(report+" KIB"+diff);
				globals.memoryUsage = memuse;
			}
		};
	}
	bot.event({
		handle: "gcWaitForConnect",
		event: "376",
		once: true,
		callback: function () {
			let time;
			if (globals.gc === undefined) {
				logger.error("You need to run node with --expose-gc -> $ node --expose-gc boot.js");
				logger.error("If you don't want regular garbage collection change gc to false in config.")
				return;
			}
			if (config.gcinterval) {
				time = parseInt(config.gcinterval);
				if (time <= 0 || time >= 120) {
					time = 30000; // 30s sane default
				} else {
					time = time*1000;
				}
			} else {
				time = 30000;
			}
			if (config.memwatch)
				setInterval(gcAndReport, time);
			else
				setInterval(globals.gc, time);
		}
	});
}

bot.event({
	handle: "corePing",
	event: "PING",
	callback: function (input) {
		irc.pong(input.challenge);
	}
});

function isNickServ(nick, hostname) {
	if (config.nickserv_nickname.toLowerCase() === nick.toLowerCase() &&
		config.nickserv_hostname.toLowerCase() === hostname.toLowerCase())
		return true;
}

/**
 * need to determine if our nick is taken. try to register with nickserv if so
 * and kill the person using for our nick. register an event to wait for that
 * to finish, then re-take our nick.
 */
function getNickBack(nick) {
	ghostAttempts++;
	if (ghostAttempts >= 3) {
		logger.info("Tried to ghost "+nick+" 3 times, giving up.");
		return;
	}
	logger.info("Attempting to get nickname back.. (Try #"+ghostAttempts+")");
	bot.event({
		handle: "waitingForLogin",
		event: "376",
		once: true,
		callback: function () {
			irc.raw("WHOIS "+config.nickserv_nickname);
		}
	});

	bot.event({
		handle: "grabWhois",
		event: "311",
		once: true,
		callback: function (input) {
			let args = input.raw.split(" "),
				nickserv_nick = args[3],
				nickserv_hostname = args[4]+"@"+args[5];
			if (!isNickServ(nickserv_nick, nickserv_hostname))
				return;
			irc.say(config.nickserv_nickname, `IDENTIFY ${nick} ${config.nickserv_password}`);
		}
	});

	bot.event({
		handle: "confirmIdentify",
		event: "NOTICE",
		once: true,
		condition: function (input) {
			if (!input.nick) // server notice
				return false;
			if (isNickServ(input.nick, input.address)) {
				if (input.data.slice(0,22) === "You are now identified")
					return true;
			}
		},
		callback: function () {
			irc.say(config.nickserv_nickname, `GHOST ${nick}`);
		}
	});

	bot.event({
		handle: "confirmGhosting",
		event: "NOTICE",
		once: true,
		condition: function (input) {
			if (!input.nick) // server notice
				return false;
			if (isNickServ(input.nick, input.address)) {
				if (input.data.slice(-17) === "has been ghosted.")
					return true;
			}
		},
		callback: function () {
			irc.raw("NICK "+nick);
		}
	});

	bot.event({
		handle: "confirmNickTaken",
		event: "NICK",
		once: true,
		condition: function (input) {
			if (input.newnick === nick)
				return true;
		},
		callback: function () {
			logger.info("Successfully reacquired "+config.nickname+". \\o/");
			ghostAttempts = 0;
		}
	});
}

bot.event({
	handle: "nickInUse",
	event: "433",
	callback: function nickInUse(input) {
		if (nickServConfigured)
			getNickBack(config.nickname);
		if (input.raw.split(" ")[3].toLowerCase() === config.nick.toLowerCase()) {
			config.nick = config.nick+"_";
			irc.raw("NICK "+config.nick);
		}
	}
});


if (nickServConfigured) {
	bot.event({
		handle: "nickservIdentify",
		event: "NOTICE",
		condition: function (input) {
			if (!input.nick) // server notice
				return false;
			if (isNickServ(input.nick, input.address)) {
				if (input.data.slice(0,27) === "This nickname is registered")
					return true;
			}
		},
		callback: function () {
			irc.say(config.nickserv_nickname, "IDENTIFY " + config.nickserv_password);
		}
	});
}

bot.event({
	handle: "ctcp",
	event: "PRIVMSG",
	condition: function (input) {
		if (input.context[0] === "#" || input.message.indexOf("\x01") === -1)
			return false;
		return lib.stringContainsAny(input.message, [ "\x01VERSION", "\x01PING", "\x01TIME" ], true);
	},
	regex: /^:[^ ]+ PRIVMSG [^ ]+ :\x01(VERSION|PING .*|TIME)\x01$/i,
	callback: function (input) {
		let ctcp = input.match[1].split(" ");
		switch (ctcp[0].toUpperCase()) {
		case "VERSION":
			irc.raw("NOTICE "+input.context+" :\x01VERSION Karionette ~ \x02"+lib.randSelect([
				"Wiggle wiggle wiggle wiggle",
				"Now with 90% more butts!",
				"All dem bot butts",
				"This one time, at band camp..",
				"I'm on a boat!",
				"Secretly loves fish fingers and custard",
				"I'm Batman",
				"Touch it",
				"LIKE A BOSS",
				"Stop touching it",
				"No wait, touch it",
				"OK STOP TOUCHING IT",
				"A little more..",
				"URRRRGGGHHHhhhhh Ahhhhhhhh ..... oh my god, sorry. I'm so sorry. Let me.. let me wipe that off..",
				"It's going to fall off",
				"Dun dun dunnnn",
				"N-Nya..",
				"Pantsu?",
				"PANTSU!",
				"Needs more Pantsu."])+
					"\x02 ~ https://github.com/Kaioshi/Karionette/ [based on Marionette by Deide @ EsperNet]\x01");
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

bot.event({
	handle: "coreAutojoin",
	event: "376",
	callback: function () {
		if (config.autojoin && config.autojoin.length > 0) {
			globals.autojoining = config.autojoin;
			logger.info("Autojoining "+lib.commaList(config.autojoin)+".");
			irc.join(config.autojoin.join(","));
		}
	}
});

bot.event({
	handle: "coreWhoFinished",
	event: "315",
	callback: function (input) {
		let channel;
		if (globals.autojoining === undefined || !globals.autojoining.length)
			return;
		channel = input.raw.slice(input.raw.indexOf("#"));
		channel = channel.slice(0, channel.indexOf(" ")).toLowerCase();
		globals.autojoining = globals.autojoining.filter(function (element) {
			return element.toLowerCase() !== channel;
		});
		if (globals.autojoining.length === 0) {
			delete globals.autojoining;
			bot.emitEvent("autojoinFinished");
		}
	}
});

bot.command({
	command: [ "say", "sayuni" ],
	help: "Makes me say something. Duh!",
	syntax: config.command_prefix+"say <what you want me to say>",
	arglen: 1,
	callback: function (input) {
		irc.say(input.context, input.data);
	}
});

bot.command({
	command: [ "action", "actionuni" ],
	help: "Makes me do something. Probably erotic.",
	syntax: config.command_prefix+"action <what you want me to do>",
	arglen: 1,
	callback: function (input) {
		irc.action(input.context, input.data);
	}
});

bot.command({
	command: [ "notice", "noticeuni" ],
	help: "Makes me notice things. Like your new shoes!",
	syntax: config.command_prefix+"notice <target> <what you want me to notice them>",
	arglen: 1,
	callback: function (input) {
		if (input.args[0][0] === "#" && !logins.isAdmin(input.nick)) {
			irc.notice(input.nick, "No. Only admins can make me notice an entire channel.");
			return;
		}
		irc.notice(input.args[0], input.data.slice(input.data.indexOf(" ")+1));
	}
});

bot.command({
	command: "help",
	help: "Seriously?",
	syntax: config.command_prefix+"help [<command or alias you want help with>] - supply no command in order to list commands (does not list aliases).",
	callback: function (input) {
		let cmd, help, syntax, options;
		if (!input.args) { // show all commands
			irc.say(input.context, "Available commands: "+bot.cmdList().sort().join(", "));
			return;
		}
		cmd = input.args[0].toLowerCase();
		help = bot.cmdHelp(cmd, "help");
		if (help) {
			syntax = bot.cmdHelp(cmd, "syntax");
			options = bot.cmdHelp(cmd, "options");
			irc.say(input.context, help);
			if (syntax)
				irc.say(input.context, syntax);
			if (options)
				irc.say(input.context, options);
		} else {
			// maybe it's an alias! with alias help set!
			help = alias.helpDB.getOne(cmd);
			if (help && (help.help || help.syntax)) {
				if (help.help)
					irc.say(input.context, "[Help] "+help.help);
				if (help.syntax)
					irc.say(input.context, "[Help] Alias syntax: "+config.command_prefix+cmd+" "+help.syntax);
			} else {
				irc.say(input.context, "\""+cmd+"\" either has no help set, or isn't a command or alias.");
			}
		}
	}
});

// Show node version
bot.command({
	command: "nodeversion",
	help: "Shows the node version I'm running.",
	admin: true,
	callback: function (input) {
		irc.notice(input.nick, lib.nodeVersion());
	}
});

// Memory usage report
bot.command({
	command: "memstats",
	help: "Shows how much memory I'm using.",
	callback: function (input) {
		irc.say(input.context, "I'm currently using "+lib.memUse()+" MiB of memory.");
	}
});

// get uptime
bot.command({
	command: "uptime",
	help: "Shows how long it's been since I was started.",
	callback: function (input) {
		irc.say(input.context, "I've been running for "+lib.duration(globals.startTime)+".");
	}
});

// Get Mari's age
bot.command({
	command: "age",
	help: "Tells you how old Mari is!",
	callback: function (input) {
		irc.say(input.context, "I am "+lib.duration(new Date("1 May 2013 18:40:00 GMT"))+" old, but always sweet as sugar.");
	}
});
