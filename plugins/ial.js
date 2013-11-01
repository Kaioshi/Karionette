// internal address list, updates itself whenever there is movement.

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
	plugin: "ial",
	handle: "ialJoin",
	regex: regexFactory.onJoin(),
	callback: function (input, match) {
		if (match[1] === config.nick) {
			if (!config.address) config.address = match[2];
			irc.raw("WHO "+match[3]);
		} else {
			ial.Add(match[3], match[1], match[2]);
		}
	}
});

listen({
	plugin: "ial",
	handle: "ialPart",
	regex: regexFactory.onPart(),
	callback: function (input, match) {
		if (match[1] === config.nick) ial.Remove(match[3]);
		else ial.Remove(match[3], match[1]);
	}
});

listen({
	plugin: "ial",
	handle: "ialKick",
	regex: regexFactory.onKick(),
	callback: function (input, match) {
		if (match[4] === config.nick) {
			ial.Remove(match[3]);
			return;
		}
		ial.Remove(match[3], match[4]);
	}
});

listen({
	plugin: "ial",
	handle: "ialQuit",
	regex: regexFactory.onQuit(),
	callback: function (input, match) {
		var user;
		if (match[1] === config.nick) return;
		ial.Channels(match[1]).forEach(function (channel) {
			setTimeout(function () {
				ial.Remove(channel, match[1]);
			}, 200); // grace period so other plugins have time to fondle the entry if needed
		});
		user = match[1]+"!"+match[2];
		if (globals.admins[user] !== undefined) {
			logger.debug("Removed cached admin " + user);
			delete globals.admins[user];
		}
	}
});

listen({
	plugin: "ial",
	handle: "ialNick",
	regex: regexFactory.onNick(),
	callback: function (input, match) {
		var user,
			oldnick = match[1],
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
		ial.Channels(oldnick).forEach(function (channel) {
			ial.updateUser(channel, oldnick, newnick, address);
		});
		user = oldnick+"!"+address;
		if (globals.admins[user] !== undefined) {
			logger.debug("Removed cached admin " + user);
			delete globals.admins[user];
		}
	}
});

