// internal address list, updates itself whenever there is movement.
"use strict";

const [lib, ial, setTimeout] = plugin.importMany("lib", "ial", "setTimeout");

bot.command({
	command: "ial",
	help: "Allows admins to poke the bot's internal address list.",
	syntax: config.command_prefix+"ial <scan / scanre> [<user!mask@*.here> / <RegExp here>]",
	admin: true,
	arglen: 2,
	callback: function ialCommand(input) {
		let reg, results, ch;
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
				irc.say(input.context, results.length+" matches: "+lib.commaList(lib.sort(results)));
			else
				irc.say(input.context, "No matches.");
			break;
		case "scan":
			results = ial.maskSearch(input.args[1]);
			if (results.length)
				irc.say(input.context, results.length+" matches: "+lib.commaList(lib.sort(results)));
			else
				irc.say(input.context, "No matches.");
			break;
		case "opped":
			ch = ial.Channel(input.args[1]);
			if (!ch) {
				irc.say(input.context, "I'm not on "+input.args[1]);
				return;
			}
			if (!ch.opped.length)
				irc.say(input.context, input.args[1]+" has no ops.");
			else
				irc.say(input.context, input.args[1]+" opped: "+ch.opped.join(", "));
			break;
		case "voiced":
			ch = ial.Channel(input.args[1]);
			if (!ch) {
				irc.say(input.context, "I'm not on "+input.args[1]);
				return;
			}
			if (!ch.voiced.length)
				irc.say(input.context, input.args[1]+" has no voiced users.");
			else
				irc.say(input.context, input.args[1]+" voiced: "+ch.voiced.join(", "));
			break;
		case "halfopped":
			ch = ial.Channel(input.args[1]);
			if (!ch) {
				irc.say(input.context, "I'm not on "+input.args[1]);
				return;
			}
			if (!ch.halfopped.length)
				irc.say(input.context, input.args[1]+" has no halfopped users.");
			else
				irc.say(input.context, input.args[1]+" halfopped: "+ch.halfopped.join(", "));
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
		let params = input.raw.split(" "),
			nick = params[7], channel = params[3], status = params[8];
		ial.addUser(nick, params[4]+"@"+params[5]);
		ial.User(nick).addChannel(channel);
		ial.Channel(channel).addNick(nick);
		if (status.length > 1) {
			switch (status[1]) {
			case "@":
				ial.Channel(channel).giveStatus("opped", nick);
				break;
			case "%":
				ial.Channel(channel).giveStatus("halfopped", nick);
				break;
			case "+":
				ial.Channel(channel).giveStatus("voiced", nick);
				break;
			case "*":
				ial.Channel(channel).giveStatus("ircop", nick);
				break;
			default:
				logger.debug("Unhandled user mode symbol: "+status+" on "+nick+" in "+channel);
				break;
			}
		}
	}
});

bot.event({
	handle: "ialJoin",
	event: "JOIN",
	callback: function ialJoin(input) {
		if (!ial.User(input.nick))
			ial.addUser(input.nick, input.address);
		if (input.nick === config.nick) {
			let ch = input.channel,
				nick = input.nick;
			ial.addChannel(ch);
			if (!config.address)
				config.address = input.address;
			setTimeout(function () {
				ial.userJoined(ch, nick);
				irc.raw("WHO "+ch);
			}, 50);
		} else {
			ial.userJoined(input.channel, input.nick);
		}
	}
});

bot.event({
	handle: "ialPart",
	event: "PART",
	callback: function ialPart(input) {
		let ch = input.channel,
			nick = input.nick,
			uid = ial.User(nick).uid;
		setTimeout(function () {
			ial.userLeft(ch, nick, uid);
		}, 50);
	}
});

bot.event({
	handle: "ialKick",
	event: "KICK",
	callback: function ialKick(input) {
		let ch = input.channel,
			kicked = input.kicked,
			uid = ial.User(kicked).uid;
		ial.Channel(input.context).setActive(input.nick);
		setTimeout(function () {
			ial.userLeft(ch, kicked, uid);
		}, 50);
	}
});

bot.event({
	handle: "ialQuit",
	event: "QUIT",
	callback: function ialQuit(input) {
		if (input.nick === config.nick)
			return;
		let nick = input.nick, uid = ial.User(nick).uid;
		setTimeout(function () {
			ial.userQuit(nick, uid);
		}, 50);
	}
});

bot.event({
	handle: "ialNick",
	event: "NICK",
	callback: function ialNick(input) {
		if (input.nick === config.nick) // update our nicks
			config.nick = input.newnick;
		ial.nickChange(input.nick, input.newnick);
	}
});

bot.event({
	handle: "ialMode",
	event: "MODE",
	condition: function ialModeCondition(input) {
		if (input.channel && input.affected.length)
			return true;
	},
	callback: function ialMode(input) {
		let give = false, affected = input.affected.slice();
		for (let i = 0; i < input.mode.length; i++) {
			if (input.mode[i] === "+") {
				give = true;
				continue;
			}
			if (input.mode[i] === "-") {
				give = false;
				continue;
			}
			switch (input.mode[i]) {
			case "o":
				if (give)
					ial.Channel(input.channel).giveStatus("opped", affected.shift());
				else
					ial.Channel(input.channel).removeStatus("opped", affected.shift());
				break;
			case "h":
				if (give)
					ial.Channel(input.channel).giveStatus("halfopped", affected.shift());
				else
					ial.Channel(input.channel).removeStatus("halfopped", affected.shift());
				break;
			case "v":
				if (give)
					ial.Channel(input.channel).giveStatus("voiced", affected.shift());
				else
					ial.Channel(input.channel).removeStatus("voiced", affected.shift());
				break;
			default:
				break;
			}
		}
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
		let params = input.raw.split(" ");
		ial.Channel(params[3]).topic = params.slice(4).join(" ").slice(1);
	}
});

bot.event({
	handle: "ialMsg",
	event: "PRIVMSG",
	condition: function (input) { return input.channel !== undefined; },
	callback: function (input) {
		ial.Channel(input.channel).setActive(input.nick);
	}
});
