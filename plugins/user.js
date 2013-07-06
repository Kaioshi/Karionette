// Cache json DB object
var chanser = {
	channel: null,
	DB: null
};

// Handle channel transition and cleanup
function resolveChan(channel) {
	if (chanser.channel !== channel) {
		chanser.channel = channel;
		if (chanser.DB) {
			chanser.DB.unload(true);
			delete chanser.DB;
		}
		chanser.DB = new DB.Json({filename: "users/" + channel, queue: true});
	}
}
// Check if ACTION
function isAction(data) {
	return (data.substring(0,7) === "\u0001ACTION");
}

// This plugin handles stuff that goes into data/users
listen({
	plugin: "user",
	handle: "channelMsgListener",
	regex: /^:[^!]+!.*@.* PRIVMSG #[^ ]+ :.*/i,
	callback: function (input) {
		var user, data,
			from = input.from.toLowerCase(),
			date = new Date(),
			data = (isAction(input.data) ? "* " + input.from + input.data.slice(7, -1)
				: "<" + input.from + "> " + input.data);
		resolveChan(input.context);
		user = chanser.DB.getOne(from) || {};
		user.last = { message: data, seen: date };
		chanser.DB.saveOne(from, user);
	}
});

// Handles Last Seen interface
listen({
	plugin: "user",
	handle: "seen",
	regex: regexFactory.startsWith(["seen", "have you seen"]),
	command: {
		root: "seen",
		options: "{Person to search}",
		help: "Displays the last known time {person} was seen, and what they last said."
	},
	callback: function (input, match) {
		var last, time, seenString, user,
			args = match[1].split(" ");

		resolveChan(input.context);
		user = chanser.DB.getOne(args[0].toLowerCase());
		if (user) {
			irc.say(input.context, args[0] + " was last seen " 
				+ lib.duration(new Date(user.last.seen))
				+ " ago ~ " + user.last.message);
		} else {
			irc.say(input.context, "I don't recognise that Pokemon");
		}
	}
});

