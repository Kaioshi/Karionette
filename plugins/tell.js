﻿// Tell someone something on join if saved message for them
var messagesDB = new listDB('messages');

function isUser(str) {
    return str[0] !== "#";
}

function getMessages(room, user) {
    var i,
		userMessages = [],
		messagesToRemove = [],
		prefix = room + "@" + user + ": ",
		messages = messagesDB.getEntire();

    for (i = 0; i < messages.length; i += 1) {
        if (messages[i].toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
            messagesToRemove.push(messages[i]);
            userMessages.push(messages[i].substr(prefix.length));
        }
    }

    for (i = 0; i < messagesToRemove.length; i += 1) {
        messagesDB.remove(messagesToRemove[i], true);
    }

    return userMessages;
}

listen({
	handle: "tell",
	regex: regexFactory.startsWith("tell"),
	command: {
		root: "tell",
		options: "[person] [message]",
		help: "Passes along a message when the person in question next joins."
	},
	callback: function (input) {
		var msgMatch = /^([^ ]+) (.+)$/.exec(input.match[1]);
		if (msgMatch && isUser(msgMatch[1])) {
			messagesDB.store(input.context + "@" + msgMatch[1] + ": " + "message from " + input.from + ": " + msgMatch[2]);
			irc.say(input.context, "I'll tell them when they get back.");
		} else {
			irc.say(input.context, "[Help] tell [user] [some message]");
		}
	}
});
// Listen for join
listen({
	handle: "tell_join",
	regex: /:([^!]+)!.*JOIN :?(.*)$/i,
	callback: function (input) {
		var i,
			userMessages = getMessages(input.match[2], input.match[1]);
		for (i = 0; i < userMessages.length; i += 1) {
			irc.say(input.match[2], input.match[1] + ", " + userMessages[i]);
		}
	}
});
