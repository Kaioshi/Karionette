// internal address list, updates itself whenever there is movement.
"use strict";
bot.event({
	handle: "ialWho",
	event: "352",
	callback: function (input) {
		var params = input.raw.split(" ");
		ial.addUser(params[7], params[4]+"@"+params[5]);
		ial.User(params[7]).addChannel(params[3]);
		ial.Channel(params[3]).addNick(params[7]);
	}
});

bot.event({
	handle: "ialJoin",
	event: "JOIN",
	callback: function (input) {
		if (!ial.User(input.nick))
			ial.addUser(input.nick, input.address);
		if (input.nick === config.nick) {
			ial.addChannel(input.channel);
			if (!config.address)
				config.address = input.address;
			setTimeout(function () {
				ial.userJoined(input.channel, input.nick);
				irc.raw("WHO "+input.channel);
			}, 200);
		} else {
			ial.userJoined(input.channel, input.nick);
		}
	}
});

bot.event({
	handle: "ialPart",
	event: "PART",
	callback: function (input) {
		setTimeout(function () {
			ial.userLeft(input.channel, input.nick);
		}, 200);
	}
});

bot.event({
	handle: "ialKick",
	event: "KICK",
	callback: function (input) {
		ial.Channel(input.context).setActive(input.nick);
		setTimeout(function () {
			ial.userLeft(input.channel, input.kicked);
		}, 200);
	}
});

bot.event({
	handle: "ialQuit",
	event: "QUIT",
	callback: function (input) {
		var uid;
		if (input.nick === config.nick)
			return;
		uid = ial.User(input.nick).uid;
		setTimeout(function () {
			ial.userQuit(input.nick, uid);
		}, 200);
	}
});

bot.event({
	handle: "ialNick",
	event: "NICK",
	callback: function (input) {
		if (input.nick === config.nick) { // update our nicks
			config.nick = input.newnick;
			if (config.nicks.indexOf(config.nick) === -1)
				config.nicks.push(config.nick);
		}
		ial.nickChange(input.nick, input.newnick);
	}
});

bot.event({
	handle: "ialTopic",
	event: "TOPIC",
	callback: function (input) {
		ial.Channel(input.context).topic = input.topic;
		ial.Channel(input.context).setActive(input.nick);
	}
});

bot.event({
	handle: "ialRawTopic",
	event: "332",
	callback: function (input) {
		var params = input.raw.split(" ");
		ial.Channel(params[3]).topic = params.slice(4).join(" ").slice(1);
	}
});
