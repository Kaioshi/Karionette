// ;learn keyword =/is/as string here
// !keyword [@ nick]
"use strict";
var learnDB = new DB.Json({filename: "learnedThings"}),
	learnRegex = /^([^=]+) = (.*)$/,
	knowledgeRegex = /^([^@]+) @ (.*)$/;

function getPrefix() {
	return config.learn_prefix || "!";
}

bot.command({
	command: "learn",
	help: "Teach me about things, so I can tell others about them! See also: unlearn, facts",
	syntax: config.command_prefix+"learn <keyword> = <tell me about the thing here> - Example: "+
		config.command_prefix+"learn mari = Mari is a node.js IRC robot. http://github.com/Kaioshi/Karionette"+
		" - you can then type "+getPrefix()+"mari to bring up that line, or "+getPrefix()+
		"mari @ Nick to make me yell it at someone.",
	arglen: 3,
	callback: function (input) {
		var learn = learnRegex.exec(input.data);
		if (!learn) {
			irc.say(input.context, bot.cmdHelp("learn", "syntax"));
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

bot.command({
	command: "unlearn",
	help: "Make me forget something I've learned. See also: learn, facts",
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

bot.command({
	command: "facts",
	help: "Shows a list of things I've "+config.command_prefix+"learn'd. See also: learn, unlearn",
	syntax: config.command_prefix+"facts",
	callback: function (input) {
		var prefix = getPrefix();
		if (learnDB.size() > 0)
			irc.say(input.context, learnDB.getKeys().map(function (key) { return prefix+key; }).join(", "), false);
		else
			irc.say(input.context, "I haven't been taught anything.");
	}
});

bot.event({
	handle: "learnChecker",
	event: "PRIVMSG",
	callback: function (input) {
		var entry, reg, target = "";
		if (input.message[0] === getPrefix()) {
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
