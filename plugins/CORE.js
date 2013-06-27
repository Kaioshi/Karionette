var autojoinDB = new DB.List({filename: 'autojoin'}),
	nickArr = config.nickname,
	currentNick = config.nickname[0];

function isChannelName(str) {
	return str[0] === "#";
}

// Keeps the bot connected
listen({
	handle: 'ping',
	regex: /^PING :(.+)$/i,
	callback: function (input) {
		irc.pong(input.match[1]);
	}
});

listen({
	handle: 'nickChange',
	regex: /433/i,
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
	handle: 'nickserv',
	regex: new RegExp('^:' + config.nickserv_nickname + '!' + config.nickserv_hostname + ' NOTICE [^ ]+ :This nickname is registered', 'i'),
	callback: function () {
		irc.say('NickServ', 'IDENTIFY ' + config.nickserv_password);
	}
});

listen({
	handle: 'joinChannels',
	regex: /376/i,
	once: true,
	callback: function () {
		// 376 is the end of MOTD
		setTimeout(function () {
			var channels = autojoinDB.getAll(), i;
			for (i in channels) {
				irc.join(channels[i]);
			}
		}, 5000); // wait 5 seconds for a cloak to apply
	}
});

/*
 * COMMANDS:
 *	- join
 *	- part
 *	- autojoin
 *	- unautojoin
 *	- say
 *	- sayuni
 *	- action
 *	- help
 *	- memstats
 */

listen({
	handle: 'say',
	regex: regexFactory.startsWith("say", "optional"),
	command: {
		root: "say",
		options: "{What you want me to say}",
		help: "Makes me say something. Duh!"
	},
	callback: function (input) {
		irc.say(input.context, input.match[1]);
	}
});

listen({
	handle: 'sayuni',
	regex: regexFactory.startsWith("sayuni", "optional"),
	callback: function (input) {
		irc.say(input.context, input.match[1], false);
	}
});

listen({
	handle: 'action',
	regex: regexFactory.startsWith("action"),
	command: {
		root: "action",
		options: "{What you want me to do}",
		help: "Makes me do something. Duh!"
	},
	callback: function (input) {
		irc.action(input.context, input.match[1]);
	}
});

listen({
	handle: "help",
	regex: regexFactory.startsWith("help"),
	command: {
		root: "help",
		options: "{command you're interested in}",
		help: "Seriously?"
	},
	callback: function (input) {
		var i,
			args = input.match[1].split(" "),
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
			}).join(", ");
			irc.say(input.context, "Commands: " + cmdList);
		}
	}
});

// Memory usage report
listen({
    handle: "memstats",
    regex: regexFactory.startsWith("memstats"),
    command: {
        root: "memstats",
        options: "No options",
        help: "Shows memory usage."
    },
    callback: function (input) {
        irc.say(input.context, input.from + ": I'm currently using " + lib.memUse() + " MiB of memory.");
    }
});
