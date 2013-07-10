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
			if (ial.ison(input.context, msgMatch[1])) {
				for (var rev = [], i = msgMatch[2].length; i >= 0; i--) rev.push(msgMatch[2][i]);
				irc.say(input.context, msgMatch[1] + ": "+rev.join(""));
			} else {
				messagesDB.saveOne(input.context + "@" + msgMatch[1] + ": " + "message from " + input.from + ": " + msgMatch[2]);
				irc.say(input.context, "I'll tell them when they get back.");
			}
		} else {
			irc.say(input.context, "[Help] tell [user] [some message]");
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
			irc.say(match[3], match[1] + ", " + userMessages[i]);
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
					irc.say(channel, match[3] + ", " + userMessages[i]);
				}
			});
		}, 3000); // <- making sure IAL is updated first
	}
});

