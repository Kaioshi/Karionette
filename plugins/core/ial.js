// internal address list, updates itself whenever there is movement.
"use strict";
bot.event({
	handle: "ialWho",
	event: "352",
	callback: function (input) {
		var who = input.raw.split(" ");
		ial.Add(who[3], who[7], who[4]+"@"+who[5]);
	}
});

bot.event({
	handle: "ialJoin",
	event: "JOIN",
	callback: function (input) {
		if (input.nick === config.nick) {
			if (!config.address)
				config.address = input.address;
			irc.raw("WHO "+input.channel);
		} else {
			ial.Add(input.channel, input.nick, input.address);
		}
	}
});

bot.event({
	handle: "ialPart",
	event: "PART",
	callback: function (input) {
		if (input.nick === config.nick)
			ial.Remove(input.channel);
		else {
			setTimeout(function () {
				ial.Remove(input.channel, input.nick);
			}, 200);
		}
	}
});

bot.event({
	handle: "ialKick",
	event: "KICK",
	callback: function (input) {
		if (input.kicked === config.nick)
			ial.Remove(input.channel);
		else {
			setTimeout(function () {
				ial.Remove(input.channel, input.kicked);
			}, 200);
		}
	}
});

bot.event({
	handle: "ialQuit",
	event: "QUIT",
	callback: function (input) {
		if (input.nick === config.nick)
			return;
		ial.Channels(input.nick).forEach(function (channel) {
			setTimeout(function () {
				ial.Remove(channel, input.nick);
			}, 200);
		});
	}
});

bot.event({
	handle: "ialNick",
	event: "NICK",
	callback: function (input) {
		if (input.nick === config.nick) { // update our nicks
			config.nick = input.newnick;
			if (!config.nickname.some(function (item) { return (item === input.newnick); })) {
				config.nickname = config.nickname.map(function (nick) {
					if (nick === input.nick)
						return input.newnick;
					return nick;
				});
			}
		}
		ial.Channels(input.nick).forEach(function (channel) {
			ial.updateUser(channel, input.nick, input.newnick, input.address);
		});
	}
});

