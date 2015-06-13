// ;learn keyword =/is/as string here
// !keyword [@ nick]
"use strict";
var learnDB = new DB.Json({filename: "learnedThings"}),
	learnRegex = /^(.*) = (.*)$/,
	knowledgeRegex = /^(.*) @ (.*)$/;

cmdListen({
	command: "learn",
	help: "Teach me about things, so I can tell others about them!",
	syntax: config.command_prefix+"learn <keyword> = <tell me about the thing here> - Example: "+
		config.command_prefix+"learn mari = Mari is a node.js IRC robot. http://github.com/Kaioshi/Karionette"+
		" - you can then type !mari to bring up that line, or !mari @ Nick to make me yell it at someone.",
	arglen: 3,
	callback: function (input) {
		var learn = learnRegex.exec(input.data);
		if (!learn) {
			irc.say(input.context, cmdHelp("learn", "syntax"));
			return;
		}
		learn[1] = learn[1].toLowerCase();
		if (learnDB.hasOne(learn[1]))
			irc.say(input.context, "Overwritten.");
		else
			irc.say(input.context, "Added! o7");
		learnDB.saveOne(learn[1], learn[2]);
	}
});

cmdListen({
	command: "unlearn",
	help: "Make me forget something I've learned.",
	syntax: config.command_prefix+"unlearn <learned thing> - Example: "+config.command_prefix+"unlearn the meaning of life",
	arglen: 1,
	callback: function (input) {
		if (learnDB.hasOne(input.data)) {
			irc.say(input.context, "I've forgotten about "+input.data+".", false);
			learnDB.removeOne(input.data);
		} else {
			irc.say(input.context, "I'm not familiar with that.");
		}
	}
});

cmdListen({
	command: "facts",
	help: "Shows a list of things I've "+config.command_prefix+"learn'd",
	syntax: config.command_prefix+"facts",
	callback: function (input) {
		irc.say(input.context, learnDB.size() > 0 ? lib.commaNum(learnDB.getKeys()) : "I haven't been taught anything.", false);
	}
});

evListen({
	handle: "learnChecker",
	event: "PRIVMSG",
	callback: function (input) {
		var entry, reg, target = "";
		if (input.message[0] === "!") {
			entry = input.message.slice(1);
			reg = knowledgeRegex.exec(entry);
			if (reg) {
				target = reg[2]+": ";
				entry = reg[1];
			}
			if (learnDB.hasOne(entry))
				irc.say(input.context, target+learnDB.getOne(entry), false);
		}
	}
});
