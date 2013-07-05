// Tell someone something on join if saved message for them
var messagesDB = new DB.List({filename: 'messages'});

function isUser(str) {
    return str[0] !== "#";
}

function getMessages(room, user) {
    var i,
		userMessages = [],
		messagesToRemove = [],
		prefix = room + "@" + user + ": ",
		messages = messagesDB.getAll();

    for (i = 0; i < messages.length; i += 1) {
        if (messages[i].toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
            messagesToRemove.push(messages[i]);
            userMessages.push(messages[i].substr(prefix.length));
        }
    }

    for (i = 0; i < messagesToRemove.length; i += 1) {
        messagesDB.removeOne(messagesToRemove[i], true);
    }

    return userMessages;
}

listen({
	plugin: "tell",
	handle: "tell",
	regex: regexFactory.startsWith("tell"),
	command: {
		root: "tell",
		options: "[person] [message]",
		help: "Passes along a message when the person in question next joins."
	},
	callback: function (input, match) {
		var msgMatch = /^([^ ]+) (.+)$/.exec(match[1]);
		if (msgMatch && isUser(msgMatch[1])) {
			messagesDB.saveOne(input.context + "@" + msgMatch[1] + ": " + "message from " + input.from + ": " + msgMatch[2]);
			irc.say(input.context, "I'll tell them when they get back.");
		} else {
			irc.say(input.context, "[Help] tell [user] [some message]");
		}
	}
});
// Listen for join
listen({
	plugin: "tell",
	handle: "tell_join",
	//regex: /:([^!]+)!.*JOIN :?(.*)$/i,
	regex: regexFactory.onJoin(),
	callback: function (input, match) {
		var i,
			userMessages = getMessages(match[2], match[1]);
		for (i = 0; i < userMessages.length; i += 1) {
			irc.say(match[2], match[1] + ", " + userMessages[i]);
		}
	}
});
