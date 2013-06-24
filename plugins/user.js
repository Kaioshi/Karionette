// Cache json DB object
var chanser = {
	channel: null,
	DB: null
};
// Calculate difference in time
function timeDiff(base, altTime) {
	var timeBase = new Date(base),
		altTime = altTime || new Date(),
		secs = Math.floor((altTime - timeBase) / 1000),
		mins = Math.floor(secs / 60),
		hours = Math.floor(mins / 60),
		days = Math.floor(hours / 24) % 365.25,
		years = Math.floor(days / 365.25),
		diff = {
			years: years,
			days: days,
			hours: hours % 24,
			mins: mins % 60,
			secs: secs % 60
		};
	return diff;
}
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
	handle: "seen",
	regex: regexFactory.startsWith("seen"),
	command: {
		root: "seen",
		options: "{Person to search}",
		help: "Displays the last known time {person} was seen, and what they last said."
	},
	callback: function (input) {
		var last, time, seenString, user,
			args = input.match[1].split(" ");

		resolveChan(input.context);
		user = chanser.DB.getOne(args[0].toLowerCase());
		if (user) {
			time = timeDiff(user.last.seen);
			seenString = (time.years === 0 ? "" : time.years + " years, ")
				+ (time.days === 0 ? "" : time.days + " days, ")
				+ (time.hours === 0 ? "" : time.hours + " hours, ")
				+ (time.mins === 0 ? "" : time.mins + " mins, ")
				+ time.secs + " seconds ago ~ "
				+ user.last.message;
			irc.say(input.context, args[0] + " was last seen " + seenString);
		} else {
			irc.say(input.context, "I don't recognise that Pokemon");
		}
	}
});
/*
listen({
	handle: "onJoin",
	regex: regexFactory.onJoin(),
	callback: function (input) {
		input.from = input.match[1];
		input.host = input.match[2];
		input.channel = input.match[3];
		log2("info", "JOIN HAPPENED!");
	}
}); */
