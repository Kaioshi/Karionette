// Tell someone something on join if saved message for them
"use strict";
var msgwatch,
	noticesDB = new DB.Json({filename: 'notices'}),
	notices = noticesDB.getAll(),
	messagesDB = new DB.List({filename: 'messages'}),
	messages = messagesDB.getAll();

setTimeout(function () {
	if (!msgwatch) {
		msgwatch = {};
		prepareMessages();
	}
}, 1000); // wait for messagesDB to finish loading

function prepareMessages() {
	var reg, channel, nick,
		i = 0, l = messages.length,
		pruned = false;
	for (; i < l; i++) {
		reg = /^([^ ]+)@([^ ]+): (.*)$/.exec(messages[i]);
		if (!reg) {
			logger.warn("Removed invalidly formatted messages.txt entry: "+messages.splice(i,1));
			pruned = true;
		} else {
			channel = reg[1].toLowerCase();
			nick = reg[2].toLowerCase();
			if (channel[0] !== "#") { // prune bad entries. REMINDER: remove this after a while
				logger.warn("Removed invalid messages.txt entry: "+messages.splice(i,1));
				pruned = true;
			} else {
				if (!msgwatch[channel]) msgwatch[channel] = {};
				if (!msgwatch[channel][nick]) msgwatch[channel][nick] = [];
				msgwatch[channel][nick].push(reg[3]);
			}
		}
	}
	if (pruned) {
		logger.warn("Saving pruned messages.txt");
		messagesDB.saveAll(messages);
	}
}

function removeMessage(channel, nick, entry) {
	var i = 0, l = messages.length, altered = false;
	entry = channel+"@"+nick+": "+entry;
	entry = entry.toLowerCase();
	for (; i < l; i++) {
		if (messages[i].toLowerCase() === entry) {
			messages.splice(i,1);
			altered = true;
			break;
		}
	}
	if (altered) messagesDB.saveAll(messages);
}

function ratedMsg(channel, nick) {
	var i = 0,
		lnick = nick.toLowerCase(),
		msgs = msgwatch[channel][lnick];
	msgs.forEach(function (entry) {
		i++;
		setTimeout(function () {
			irc.say(channel, nick + ", " + entry);
			removeMessage(channel, lnick, entry);
		}, i*1000);
	});
}

function ratedNotice(nick) {
	var i = 0,
		lnick = nick.toLowerCase(),
		ntcs = notices[lnick];
	ntcs.forEach(function (message) {
		i++;
		setTimeout(function () {
			irc.notice(nick, message);
		}, i*1000);
	});
	delete notices[lnick];
	noticesDB.saveAll(notices);
}

// let other plugins add messages
lib.events.on("Event: messageQueued", function (nick, channel, message) {
	var lnick = nick.toLowerCase();
	channel = channel.toLowerCase();
	msgwatch[channel] = msgwatch[channel] || {};
	msgwatch[channel][lnick] = msgwatch[channel][lnick] || [];
	msgwatch[channel][lnick].push(nick+": "+message);
	messages.push(channel+"@"+nick+": "+message);
	messagesDB.saveAll(messages);
	logger.debug("Added message to queue for "+channel+": "+nick+": "+message);
});

lib.events.on("Event: noticeQueued", function (nick, message) {
	var lnick = nick.toLowerCase();
	notices[lnick] = notices[lnick] || [];
	notices[lnick].push(message);
	noticesDB.saveAll(notices);
	logger.debug("Added notice to queue for "+nick+": "+message);
});

function checkMessages(channel, nick) {
	var lnick;
	channel = channel.toLowerCase();
	if (msgwatch && msgwatch[channel]) {
		lnick = nick.toLowerCase();
		if (msgwatch[channel][lnick]) {
			if (msgwatch[channel][lnick].length === 1) {
				irc.say(channel, nick + ", " + msgwatch[channel][lnick][0], false);
				removeMessage(channel, lnick, msgwatch[channel][lnick][0]);
			} else {
				ratedMsg(channel, nick);
			}
			delete msgwatch[channel][lnick];
			if (Object.keys(msgwatch[channel]).length === 0) {
				delete msgwatch[channel];
			}
		}
	}
}

function checkNotices(nick) {
	var lnick = nick.toLowerCase(),
		altered = false;
	if (notices[lnick] && notices[lnick].length > 0) {
		if (notices[lnick].length === 1) {
			irc.notice(nick, notices[lnick][0], false);
			delete notices[lnick];
			noticesDB.saveAll(notices);
		} else {
			ratedNotice(nick);
		}
	}
}

cmdListen({
	command: "tell",
	help: "Passes along a message when the person person in question is spotted next.",
	syntax: config.command_prefix+"tell <nick> <message> - Example: "+config.command_prefix+
		"tell ranma your pantsu are lovely 1/2 the time.",
	callback: function (input) {
		var msgMatch, target, msg;
		if (!input.channel) {
			irc.say(input.context, "tell can only be used in channels.");
			return;
		}
		if (!input.args || !input.args[1]) {
			irc.say(input.context, cmdHelp("tell", "syntax"));
			return;
		}
		msgMatch = /^([^: ]+):? (.+)$/.exec(input.data);
		if (!msgMatch) {
			irc.say(input.context, cmdHelp("tell", "syntax"));
			return;
		}
		if (msgMatch[1].toLowerCase() === input.nick.toLowerCase()) {
			irc.say(input.context, "nou");
			return;
		}
		if (msgMatch[1].toLowerCase() === config.nick.toLowerCase()) {
			irc.say(input.context, "nome");
			return;
		}
		if (msgMatch && msgMatch[1][0] !== "#") {
			msg = "message from "+input.nick+": "+msgMatch[2];
			input.context = input.context.toLowerCase();
			target = msgMatch[1].toLowerCase();
			// check for dupes
			if (msgwatch[input.context] && msgwatch[input.context][target]) {
				if (msgwatch[input.context][target].some(function (entry) {
					return (entry.toLowerCase() === msg.toLowerCase());
				})) {
					irc.say(input.context, "You've already asked me to tell them that.");
					return;
				}
			}
			messages.push(input.context+"@"+msgMatch[1]+": "+msg);
			if (!msgwatch[input.context]) msgwatch[input.context] = {};
			if (!msgwatch[input.context][target]) msgwatch[input.context][target] = [];
			msgwatch[input.context][target].push(msg);
			messagesDB.saveAll(messages);
			irc.say(input.context, "I'll tell them when I see them next.");
		} else {
			irc.say(input.context, cmdHelp("tell", "syntax"));
		}
	}
});

evListen({
	handle: "tellMsg",
	event: "PRIVMSG",
	callback: function (input) {
		if (input.channel) checkMessages(input.channel, input.nick);
		checkNotices(input.nick);
	}
});

evListen({
	handle: "tellJoin",
	event: "JOIN",
	callback: function (input) {
		checkMessages(input.channel, input.nick);
		checkNotices(input.nick);
	}
});

evListen({
	handle: "tellNick",
	event: "NICK",
	callback: function (input) {
		setTimeout(function () {
			ial.Channels(input.newnick).forEach(function (channel) {
				checkMessages(channel, input.newnick);
			});
		}, 500); // <- making sure IAL is updated first
		checkNotices(input.newnick);
	}
});

