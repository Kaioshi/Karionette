// internal address list, updates itself whenever there is movement.
"use strict";

bot.command({
	command: "ial",
	help: "Allows admins to poke the bot's internal address list.",
	syntax: config.command_prefix+"ial <scan> [<user!mask@*.here>]",
	admin: true,
	arglen: 2,
	callback: function ialCommand(input) {
		var reg, results;
		switch (input.args[0].toLowerCase()) {
		case "scanre": // regex scan
			try {
				reg = new RegExp(input.args.slice(1).join(" "));
			} catch (err) {
				irc.say(input.context, "Invalid RegExp: "+err.message);
				return;
			}
			results = ial.regexSearch(reg);
			if (results.length)
				irc.say(input.context, "Matches: "+lib.commaList(results));
			else
				irc.say(input.context, "No matches.");
			break;
		case "scan":
			results = ial.maskSearch(input.args[1]);
			if (results.length)
				irc.say(input.context, "Matches: "+lib.commaList(results));
			else
				irc.say(input.context, "No matches.");
			break;
		default:
			irc.say(input.context, bot.cmdHelp("ial", "syntax"));
			break;
		}
	}
});

bot.event({
	handle: "ialWho",
	event: "352",
	callback: function ialWho(input) {
		var params = input.raw.split(" ");
		ial.addUser(params[7], params[4]+"@"+params[5]);
		ial.User(params[7]).addChannel(params[3]);
		ial.Channel(params[3]).addNick(params[7]);
	}
});

bot.event({
	handle: "ialJoin",
	event: "JOIN",
	callback: function ialJoin(input) {
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
// TODO: these need the same treatment as ialQuit
bot.event({
	handle: "ialPart",
	event: "PART",
	callback: function ialPart(input) {
		setTimeout(function () {
			ial.userLeft(input.channel, input.nick);
		}, 200);
	}
});

bot.event({
	handle: "ialKick",
	event: "KICK",
	callback: function ialKick(input) {
		ial.Channel(input.context).setActive(input.nick);
		setTimeout(function () {
			ial.userLeft(input.channel, input.kicked);
		}, 200);
	}
});

bot.event({
	handle: "ialQuit",
	event: "QUIT",
	callback: function ialQuit(input) {
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
	callback: function ialNick(input) {
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
	callback: function ialTopic(input) {
		ial.Channel(input.context).topic = input.topic;
		ial.Channel(input.context).setActive(input.nick);
	}
});

bot.event({
	handle: "ialRawTopic",
	event: "332",
	callback: function ialRawTopic(input) {
		var params = input.raw.split(" ");
		ial.Channel(params[3]).topic = params.slice(4).join(" ").slice(1);
	}
});
