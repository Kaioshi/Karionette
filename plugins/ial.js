// internal address list, updates globals.channels whenever there is movement.
listen({
	handle: "ial",
	regex: regexFactory.startsWith("ial"),
	command: {
		root: "ial",
		options: "[channel]",
		help: "Shows the contents of the internal address list."
	},
	callback: function (input, match) {
		var keys = [],
			list = [],
			channel = input.context,
			args = match[1].split(" ");
		
		if (args[0] && args[0][0] === '#') {
			if (ialChannels().some(function (item) { return (args[0] === item); })) {
				var channel = args[0];
			} else {
				irc.say(input.context, "I'm not on that channel.");
				return;
			}
		}
		keys = Object.keys(globals.channels[channel].users);
		keys.forEach(function (item) {
			list.push(globals.channels[channel].users[item].nick +
				" (" + globals.channels[channel].users[item].address + ")");
		});
		if (list) {
			list = list.join(" - ");
			if (list.length > 400) irc.say(input.context, "The list is too long, sorry.");
			else irc.say(input.context, "IAL for "+channel+": "+list);
		}
		else irc.say(input.context, "Something has gone awry.");
	}
});

/* this regex refuses to run for every WHO entry. doing a dirty hack in logger for now
listen({
	handle: "ialWho",
	regex: new RegExp("^:[^ ]+ 352 [^ ]+ ([^ ]+) ([^ ]+) ([^ ]+) [^ ]+ ([^ ]+) [^ ]+ :0 (.*)$", "i"),
	callback: function (input, match) {
		var channel = match[1],
			address = match[2]+"@"+match[3],
			nick = match[4];
		ialAdd(channel, nick, address);
	}
});
*/

listen({
	handle: "ialJoin",
	regex: regexFactory.onJoin(),
	callback: function (input, match) {
		var nick = match[1],
			address = match[2],
			channel = match[3];
		if (nick === config.nick) irc.raw("WHO "+channel);
		ialAdd(channel, nick, address);
	}
});

listen({
	handle: "ialPart",
	regex: regexFactory.onPart(),
	callback: function (input, match) {
		var nick = match[1],
			address = match[2],
			channel = match[3];
		if (nick === config.nick) ialRemove(channel);
		else ialRemove(channel, nick);
	}
});

listen({
	handle: "ialKick",
	regex: regexFactory.onKick(),
	callback: function (input, match) {
		var nick = match[3],
			channel = match[2];
		if (nick === config.nick) ialRemove(channel);
		else ialRemove(channel, nick);
	}
});

listen({
	handle: "ialQuit",
	regex: regexFactory.onQuit(),
	callback: function (input, match) {
		var nick = match[1];
		if (nick === config.nick) return;
		ialChannels(nick).forEach(function (item) { ialRemove(item, nick); });
	}
});

listen({
	handle: "ialNick",
	regex: regexFactory.onNick(),
	callback: function (input, match) {
		var oldnick = match[1],
			address = match[2],
			newnick = match[3],
			channels = [];
		// update our own nicks
		if (config.nick === oldnick) {
			config.nick = newnick;
			if (!config.nickname.some(function (item) { return (item == newnick); })) {
				config.nickname = config.nickname.map(function (nick) {
					if (nick == oldnick) return newnick;
					return nick;
				});
			}
		} else {
			channels = ialChannels(oldnick);
			channels.forEach(function (item) {
				delete globals.channels[item].users[oldnick];
				globals.channels[item].users[newnick] = { nick: newnick, address: address };
			});
		}
	}
});

function ialAdd(channel, nick, address) {
	if (!globals.channels[channel]) globals.channels[channel] = {};
	if (!globals.channels[channel].users) globals.channels[channel].users = {};
	globals.channels[channel].users[nick] = { nick: nick, address: address };
}

function ialRemove(channel, nick) {
	if (!nick) delete globals.channels[channel];
	else {
		if (globals.channels[channel].users[nick]) {
			delete globals.channels[channel].users[nick];
		}
	}
}

function ialChannels(nick) {
	// if nick is supplied, returns a list of channels we share with them
	// otherwise returns a list of all channels we're in.
	var keys = Object.keys(globals.channels),
		channels = [];
	if (keys.length > 0) {
		if (nick) {
			keys.forEach(function (item) {
				if (globals.channels[item].users[nick]) channels.push(item);
			});
		} else {
			keys.forEach(function (item) { channels.push(item); });
		}
	}
	if (channels.length > 0) return channels;
	return [];
}
