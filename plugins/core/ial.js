// internal address list, updates itself whenever there is movement.
"use strict";

bot.command({
	command: "ial",
	help: "Allows admins to poke the bot's internal address list.",
	syntax: config.command_prefix+"ial <scan / scanre> [<user!mask@*.here> / <RegExp here>]",
	admin: true,
	arglen: 2,
	callback: function ialCommand(input) {
		var reg, results, ch;
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
		var params = input.raw.split(" ");
		ial.addUser(params[7], params[4]+"@"+params[5]);
		ial.User(params[7]).addChannel(params[3]);
		ial.Channel(params[3]).addNick(params[7]);
		if (params[8].length > 1) {
			switch (params[8][1]) {
			case "@":
				ial.Channel(params[3]).giveStatus("opped", params[7]);
				break;
			case "%":
				ial.Channel(params[3]).giveStatus("halfopped", params[7]);
				break;
			case "+":
				ial.Channel(params[3]).giveStatus("voiced", params[7]);
				break;
			default:
				logger.debug("Unhandled user mode symbol: "+params[8]+" on "+params[7]+" in "+params[3]);
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
	handle: "ialMode",
	event: "MODE",
	condition: function ialModeCondition(input) {
		if (input.channel && input.affected.length)
			return true;
	},
	callback: function ialMode(input) {
		var i, give = false, affected = input.affected.slice();
		for (i = 0; i < input.mode.length; i++) {
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
		var params = input.raw.split(" ");
		ial.Channel(params[3]).topic = params.slice(4).join(" ").slice(1);
	}
});
