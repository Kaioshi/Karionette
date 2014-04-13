// internal address list, updates itself whenever there is movement.
"use strict";
evListen({
	handle: "ialWho",
	event: "352",
	callback: function (input) {
		input.raw = input.raw.split(" ");
		ial.Add(input.raw[3], input.raw[7], input.raw[4]+"@"+input.raw[5]);
	}
});

evListen({
	handle: "ialJoin",
	event: "JOIN",
	callback: function (input) {
		if (input.nick === config.nick) {
			if (!config.address) config.address = input.address;
			irc.raw("WHO "+input.channel);
		} else {
			ial.Add(input.channel, input.nick, input.address);
		}
	}
});

evListen({
	handle: "ialPart",
	event: "PART",
	callback: function (input) {
		if (input.nick === config.nick) ial.Remove(input.channel);
		else {
			setTimeout(function () {
				ial.Remove(input.channel, input.nick);
			}, 200);
		}
	}
});

evListen({
	handle: "ialKick",
	event: "KICK",
	callback: function (input) {
		if (input.kicked === config.nick) ial.Remove(input.channel);
		else {
			setTimeout(function () {
				ial.Remove(input.channel, input.kicked);
			}, 200);
		}
	}
});

evListen({
	handle: "ialQuit",
	event: "QUIT",
	callback: function (input) {
		if (input.nick === config.nick) return;
		ial.Channels(input.nick).forEach(function (channel) {
			setTimeout(function () {
				ial.Remove(channel, input.nick);
			}, 200);
		});
	}
});

evListen({
	handle: "ialNick",
	event: "NICK",
	callback: function (input) {
		if (input.nick === config.nick) { // update our nicks
			config.nick = input.newnick;
			if (!config.nickname.some(function (item) { return (item === input.newnick); })) {
				config.nickname = config.nickname.map(function (nick) {
					if (nick === input.nick) return input.newnick;
					return nick;
				});
			}
		}
		ial.Channels(input.nick).forEach(function (channel) {
			ial.updateUser(channel, input.nick, input.newnick, input.address);
		});
	}
});

