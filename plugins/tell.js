// Tell someone something on join if saved message for them
"use strict";
var msgDB = new DB.Json({filename: 'messages'}),
	messages = msgDB.getAll();

function checkMessages(nick, context) {
	var i, l, lchannel, send, target,
		lnick = nick.toLowerCase();
	if (!messages[lnick]) return;
	i = 0; l = messages[lnick].length;
	for (; i < l; i++) {
		if (messages[lnick][i].channel) {
			if (context[0] === "#" && context.toLowerCase() === messages[lnick][i].channel) {
				if (!send) send = [];
				send.push([ messages[lnick][i].method, context, messages[lnick][i].message, messages[lnick][i].sanitise ]);
				messages[lnick].splice(i, 1); i--; l--;
			}
		} else {
			if (!send) send = [];
			send.push([ messages[lnick][i].method, nick, messages[lnick][i].message, messages[lnick][i].sanitise ]);
			messages[lnick].splice(i, 1); i--; l--;
		}
	}
	if (send && send.length) {
		irc.rated(send);
		if (!messages[lnick].length) delete messages[lnick];
		msgDB.saveAll(messages);
	}
}

function addMessage(message) {
	var lnick = message.nick.toLowerCase();
	if (!messages[lnick]) messages[lnick] = [];
	message.sanitise = message.sanitise || false;
	messages[lnick].push(message);
	msgDB.saveAll(messages);
}

evListen({
	handle: "messageQueueListener",
	event: "queueMessage",
	callback: addMessage
});

evListen({
	handle: "messageMsg",
	event: "PRIVMSG",
	callback: function (input) {
		checkMessages(input.nick, input.context);
	}
});

evListen({
	handle: "messageJoin",
	event: "JOIN",
	callback: function (input) {
		checkMessages(input.nick, input.context);
	}
});

evListen({
	handle: "messageNick",
	event: "NICK",
	callback: function (input) {
		setTimeout(function () {
			ial.Channels(input.newnick).forEach(function (channel) {
				checkMessages(input.newnick, channel);
			});
		}, 250); // <- making sure IAL is updated first
	}
});

cmdListen({
	command: "tell",
	help: "Passes along a message when the person person in question is spotted next.",
	syntax: config.command_prefix+"tell <nick> <message> - Example: "+config.command_prefix+
		"tell ranma your pantsu are lovely 1/2 the time.",
	callback: function (input) {
		if (!input.channel) {
			irc.say(input.context, "tell can only be used in channels.");
			return;
		}
		if (!input.args || !input.args[1]) {
			irc.say(input.context, cmdHelp("tell", "syntax"));
			return;
		}
		if (new RegExp(config.nick+"|"+input.nick, "i").test(input.args[0])) {
			irc.say(input.context, "Nope.");
			return;
		}
		addMessage({
			method: "say",
			nick: input.args[0],
			channel: input.context,
			message: input.args[0]+", message from "+input.nick+": "+input.args.slice(1).join(" ")
		});
		irc.say(input.context, "I'll tell them when I see them next.");
	}
});

