// internal address list, updates itself whenever there is movement.
// NOTE: the ;ial command is there for testing the ial functions. It's not intended to be used this way.
listen({
	handle: "ial",
	regex: regexFactory.startsWith("ial"),
	command: {
		root: "ial",
		options: "[channel]",
		help: "Shows the contents of the internal address list."
	},
	callback: function (input, match) {
		var nicks = [],
			list = [],
			channel = input.context,
			args = match[1].split(" ");
		
		if (args[0]) {
			if (args[0][0] === '#') {
				if (ial.Channels().some(function (item) { return (args[0] === item); })) {
					var channel = args[0];
				} else {
					irc.say(input.context, "I'm not on that channel.");
					return;
				}
			}
		}
		nicks = ial.Nicks(channel);
		nicks.forEach(function (nick) {
			list.push(nick + " (" + ial.Channel(channel).users[nick].address + ")");
		});
		if (list) {
			list = list.join(", ");
			if (list.length > 400) irc.say(input.context, "The list is too long, sorry.");
			else irc.say(input.context, "Users in "+channel+": "+list);
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
		ial.Add(channel, nick, address);
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
		ial.Add(channel, nick, address);
	}
});

listen({
	handle: "ialPart",
	regex: regexFactory.onPart(),
	callback: function (input, match) {
		var nick = match[1],
			address = match[2],
			channel = match[3];
		if (nick === config.nick) ial.Remove(channel);
		else ial.Remove(channel, nick);
	}
});

listen({
	handle: "ialKick",
	regex: regexFactory.onKick(),
	callback: function (input, match) {
		var nick = match[3],
			channel = match[2];
		if (nick === config.nick) ial.Remove(channel);
		else ial.Remove(channel, nick);
	}
});

listen({
	handle: "ialQuit",
	regex: regexFactory.onQuit(),
	callback: function (input, match) {
		var nick = match[1];
		if (nick === config.nick) return;
		ial.Channels(nick).forEach(function (item) { ial.Remove(item, nick); });
	}
});

listen({
	handle: "ialNick",
	regex: regexFactory.onNick(),
	callback: function (input, match) {
		var oldnick = match[1],
			address = match[2],
			newnick = match[3];
		// update our own nicks
		if (config.nick === oldnick) {
			config.nick = newnick;
			if (!config.nickname.some(function (item) { return (item == newnick); })) {
				config.nickname = config.nickname.map(function (nick) {
					if (nick == oldnick) return newnick;
					return nick;
				});
			}
		}
		ial.Channels(oldnick).forEach(function (item) {
			ial.Remove(item, oldnick);
			ial.Add(item, newnick, address);
		});
	}
});

