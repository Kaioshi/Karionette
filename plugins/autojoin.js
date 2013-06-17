// This script handles the following functions:
//     On end of MOTD, autojoin all channels in autojoin.txt
//     ~join channel - cause bot to join channel
//     ~autojoin channel - add channel to autojoin.txt, thus autojoining on next run
//     ~unautojoin channel - remove channel from autojoin.txt
//     ~part [channel] - part channel (current channel if not specified)

var autojoinDB = new listDB('autojoin');

function isChannelName(str) {
	return str[0] === "#";
}

listen({
	handle: 'nick',
	regex: /433/i,
	once: true,
	callback: function () {
		if (config.nickname[1]) {
			// 433 is nick taken
			setTimeout(function () {
				irc.raw("NICK " + config.nickname[1]);
			}, 3000); // wait 3 seconds
		} else {
			setTimeout(function () {
				irc.raw("NICK " + config.nickname[0] + (Math.floor(Math.random() * 100)));
			}, 3000);
		}
	}
});

listen({
	handle: 'channels',
	regex: /376/i,
	once: true,
	callback: function () {
		// 376 is the end of MOTD
		setTimeout(function () {
			var channels = autojoinDB.getEntire(), i;
			for (i in channels) {
				irc.join(channels[i]);
			}
		}, 5000); // wait 5 seconds for a cloak to apply
	}
});

listen({
	handle: 'join',
	regex: regexFactory.startsWith("join"),
	callback: function (input) {
		if (isChannelName(input.match[1])) {
			irc.join(input.match[1]);
		}
	}
});

listen({
	handle: 'autojoin',
	regex: regexFactory.startsWith("autojoin"),
	callback: function (input) {
		if (isChannelName(input.match[1])) {
			autojoinDB.store(input.match[1]);
			irc.say(input.context, "Added " + input.match[1] + " to autojoin list");
		}
	}
});

listen({
	handle: 'unautojoin',
	regex: regexFactory.startsWith("unautojoin"),
	callback: function (input) {
		if (isChannelName(input.match[1])) {
			autojoinDB.remove(input.match[1], true);
			irc.say(input.context, "Removed " + input.match[1] + " from autojoin list");
		}
	}
});

listen({
	handle: 'part',
	regex: regexFactory.startsWith("part"),
	callback: function (input) {
		if (isChannelName(input.match[1])) {
			irc.part(input.match[1]);
		} else if (input.match[1].length === 0 && isChannelName(input.context)) {
			irc.part(input.context);
		}
	}
});