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
	regex: /^:[^!]+![^ ]+@[^ ]+ PRIVMSG #[^ ]+ :.*/i,
	callback: function (input) {
		var user, data,
			from = input.from.toLowerCase(),
			date = new Date(),
			data = (isAction(input.data) ? "* " + input.from + input.data.slice(7, -1)
				: "<" + input.from + "> " + input.data);
		ial.addActive(input.context, input.from, input.data, date.getTime(), input.user);
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
		var user, chan, target, seen,
			args = match[1].split(" ");
		if (args[0][0] === "#" && args[1]) {
			chan = args[0];
			target = args[1].replace("?", "");
		} else {
			chan = input.context;
			target = args[0].replace("?", "");
		}
		resolveChan(chan);
		user = chanser.DB.getOne(target.toLowerCase());
		if (!user) {
			irc.say(input.context, "I don't recognise that Pokermon.");
			return;
		}
		seen = (chan !== input.context ? target+" was last seen in "+chan+" " : target+" was last seen ");
		seen = seen+lib.duration(new Date(user.last.seen))+" ago ~ "+user.last.message;
		irc.say(input.context, seen, false);
	}
});

