// Tell someone something on join if saved message for them
var messagesDB = new DB.List({filename: 'messages', queue: true}),
	messages = messagesDB.getAll();

function isUser(str) {
	return str[0] !== "#";
}

function getMessages(room, user) {
	var i,
		altered = false,
		userMessages = [],
		prefix = room + "@" + user + ": ";
	
	for (i = 0; i < messages.length; i += 1) {
		if (messages[i].toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
			userMessages.push(messages[i].substr(prefix.length));
			messages.splice(i,1);
			altered = true;
		}
	}
	if (altered) messagesDB.saveAll(messages);
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
		if (msgMatch[1].toLowerCase() === input.from.toLowerCase()) {
			irc.say(input.context, "nou");
			return;
		}
		if (msgMatch && isUser(msgMatch[1])) {
			messages.push(input.context + "@" + msgMatch[1] + ": " + "message from " + input.from + ": " + msgMatch[2]);
			messagesDB.saveAll(messages);
			irc.say(input.context, "I'll tell them when I see them next.");
		} else {
			irc.say(input.context, "[Help] tell [user] [some message]");
		}
	}
});

// Listen for next message
listen({
	plugin: "tell",
	handle: "tell_msg",
	regex: regexFactory.onMsg(),
	callback: function (input, match) {
		var i, userMessages = getMessages(match[3], match[1]);
		for (i = 0; i < userMessages.length; i++) {
			irc.say(match[3], match[1] + ", " + userMessages[i], false);
		}
	}
});

// Listen for join
listen({
	plugin: "tell",
	handle: "tell_join",
	regex: regexFactory.onJoin(),
	callback: function (input, match) {
		var i, userMessages = getMessages(match[3], match[1]);
		for (i = 0; i < userMessages.length; i += 1) {
			irc.say(match[3], match[1] + ", " + userMessages[i], false);
		}
	}
});

// Listen for nick change
listen({
	plugin: "tell",
	handle: "tell_nick",
	regex: regexFactory.onNick(),
	callback: function (input, match) {
		setTimeout(function () {
			var i, userMessages,
				channels = ial.Channels(match[3]);
			channels.forEach(function (channel) {
				userMessages = getMessages(channel, match[3]);
				for (i = 0; i < userMessages.length; i++) {
					irc.say(channel, match[3] + ", " + userMessages[i], false);
				}
			});
		}, 500); // <- making sure IAL is updated first
	}
});

