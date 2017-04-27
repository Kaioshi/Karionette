// Tell someone something on join if saved message for them
"use strict";
const [DB, lib, ial, setTimeout] = plugin.importMany("DB", "lib", "ial", "setTimeout"),
	msgDB = DB.Json({filename: "messages"});

function checkMessages(input, context, newnick) {
	let lnick, lcontext, msgs, send, len;
	context = context || input.context;
	if (context[0] !== "#") // only checking channels~
		return;
	lnick = newnick ? input.newnick.toLowerCase() : input.nick.toLowerCase();
	msgs = msgDB.getOne(lnick);
	if (!msgs)
		return;
	len = msgs.length;
	if (!len)
		return;
	lcontext = context.toLowerCase();
	for (let i = 0; i < len; i++) {
		if (!msgs[i].channel) { // another plugin must have queued a message
			send = send || [];
			send.push([ msgs[i].method, msgs[i].nick, msgs[i].message ]);
			msgs.splice(i, 1); i--; len--;
			continue;
		}
		if (lcontext !== msgs[i].channel)
			continue;
		send = send || [];
		send.push([
			msgs[i].method,
			msgs[i].channel,
			msgs[i].nick+", message from "+msgs[i].from+" ("+lib.duration(msgs[i].time, false, true)+" ago): "+msgs[i].message
		]);
		msgs.splice(i, 1); i--; len--;
	}
	if (send) {
		irc.rated(send);
		if (!msgs.length)
			msgDB.removeOne(lnick);
		else
			msgDB.saveOne(lnick, msgs); // DON'T LOOK AT ME
	} // I'm sorry
}

function addMessage(message) {
	let lnick = message.nick.toLowerCase(),
		msgs = msgDB.getOne(lnick) || [];
	msgs.push(message);
	msgDB.saveOne(lnick, msgs);
}

bot.event({
	handle: "messageMsg",
	event: "PRIVMSG",
	condition: function (input) { return input.channel !== undefined; },
	callback: checkMessages
});

bot.event({
	handle: "messageJoin",
	event: "JOIN",
	condition: function (input) { return input.nick !== config.nick; },
	callback: checkMessages
});

bot.event({
	handle: "messageNick",
	event: "NICK",
	callback: function (input) { // give IAL time to update
		setTimeout(() => ial.User(input.newnick).channels.forEach(channel => checkMessages(input, channel, true)), 250);
	}
});

bot.command({
	command: "tell",
	help: "Passes along a message when the person person in question is spotted next.",
	syntax: config.command_prefix+"tell <nick> <message> - Example: "+config.command_prefix+
		"tell ranma your pantsu are lovely 1/2 the time.",
	arglen: 2,
	callback: function (input) {
		if (!input.channel) {
			irc.say(input.context, "tell can only be used in channels.");
			return;
		}
		if (new RegExp(config.nick+"|"+input.nick, "i").test(input.args[0])) {
			irc.say(input.context, "Nope.");
			return;
		}
		addMessage({
			method: "say",
			nick: input.args[0],
			from: input.nick,
			channel: input.context,
			message: input.args.slice(1).join(" "),
			time: new Date().valueOf()
		});
		irc.say(input.context, "I'll tell them when I see them next.");
	}
});

bot.queueMessage = addMessage;
