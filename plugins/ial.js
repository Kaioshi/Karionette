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
			if (args[0] == "-maskSearch" && args[1]) {
				var matches = ial.maskSearch(args[1]);
				if (matches.length > 0) {
					var channels = [],
						response = [];
					matches.forEach(function (nick) {
						response.push(nick+" ("+ial.Channels(nick).join(", ")+")");
					});
					irc.say(input.context, response.join(" - "));
				} else irc.say(input.context, "No matches found.");
				return;
			}
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
		if (match[1] === config.nick) irc.raw("WHO "+match[3]);
		ial.Add(match[3], match[1], match[2]);
	}
});

listen({
	handle: "ialPart",
	regex: regexFactory.onPart(),
	callback: function (input, match) {
		if (match[1] === config.nick) ial.Remove(match[3]);
		else ial.Remove(match[3], match[1]);
	}
});

listen({
	handle: "ialKick",
	regex: regexFactory.onKick(),
	callback: function (input, match) {
		if (match[3] === config.nick) ial.Remove(match[2]);
		else ial.Remove(match[2], match[3]);
	}
});

listen({
	handle: "ialQuit",
	regex: regexFactory.onQuit(),
	callback: function (input, match) {
		if (match[1] === config.nick) return;
		ial.Channels(match[1]).forEach(function (item) { ial.Remove(item, match[1]); });
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

