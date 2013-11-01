// Cache json DB object
var chanser = (function () {

	var DBCache = {};

	function setChannel(channel) {
		var cachedDB, newDB;
		channel = channel.toLowerCase();
		if (this.channel !== channel) {
			cachedDB = DBCache[channel];
			this.channel = channel;
			// if (this.DB) {
				// this.DB.unload(true);
				// delete this.DB;
			// }
			if (cachedDB) {
				newDB = cachedDB;
			} else {
				newDB = new DB.Json({filename: "users/" + channel, queue: true});
				DBCache[channel] = newDB;
			}
			this.DB = newDB;
			cachedDB = null;
			newDB = null;
		}
	}

	return {
		channel: null,
		DB: null,
		resolveChan: setChannel
	};
}());

// Check if ACTION
function isAction(data) {
	return (data.substring(0, 7) === "\u0001ACTION");
}

// This plugin handles stuff that goes into data/users
listen({
	plugin: "user",
	handle: "channelMsgListener",
	regex: /^:[^!]+![^ ]+@[^ ]+ PRIVMSG #[^ ]+ :.*/i,
	callback: function (input) {
		var user,
			from = input.from.toLowerCase(),
			date = new Date(),
			data = (isAction(input.data) ? "* " + input.from + input.data.slice(7, -1)
				: "<" + input.from + "> " + input.data);
		ial.addActive(input.context, input.from, input.data, date.getTime(), input.user);
		chanser.resolveChan(input.context);
		user = chanser.DB.getOne(from) || {};
		user.last = { nick: input.from, message: data, seen: date };
		if (user.left) {
			delete user.left;
		}
		chanser.DB.saveOne(from, user);
		input = null;
		from = null;
		user = null;
	}
});

listen({ // remove Quit entries if we've seen 'em join.
	plugin: "user",
	handle: "seenJoin",
	regex: regexFactory.onJoin(),
	callback: function (input, match) {
		var user,
			nick = match[1].toLowerCase();
		chanser.resolveChan(match[3]);
		if (match[1] === config.nick) { // remove stale entries
			setTimeout(function () {
				Object.keys(ial.Channel(match[3]).users).forEach(function (entry) {
					entry = entry.toLowerCase();
					user = chanser.DB.getOne(entry);
					if (user && user.left) {
						delete user.left;
						chanser.DB.saveOne(entry, user);
						user = null;
					}
				});
			}, 5000); // give ial time to update
		}
		user = chanser.DB.getOne(nick);
		if (user && user.left) {
			delete user.left;
			chanser.DB.saveOne(nick, user);
		}
	}
});

listen({
	plugin: "user",
	handle: "seenPart",
	regex: regexFactory.onPart(),
	callback: function (input, match) {
		var user,
			nick = match[1].toLowerCase();

		chanser.resolveChan(match[3]);
		user = chanser.DB.getOne(nick);
		if (user) {
			user.left = {
				type: "parted",
				date: new Date(),
				user: match[1] + " (" + match[2] + ")",
				msg: (match[4] ? " ~ " + match[4] : "")
			};
			chanser.DB.saveOne(nick, user);
		}
	}
});

listen({
	plugin: "user",
	handle: "seenNick",
	regex: regexFactory.onNick(),
	callback: function (input, match) {
		var user,
			oldnick = match[1].toLowerCase(),
			newnick = match[3].toLowerCase();
		ial.Channels(match[3]).forEach(function (channel) {
			chanser.resolveChan(channel);
			user = chanser.DB.getOne(newnick);
			if (user && user.left) {
				delete user.left;
				chanser.DB.saveOne(newnick, user);
			}
			user = chanser.DB.getOne(oldnick);
			if (user) {
				user.left = {
					type: "nick changed",
					date: new Date(),
					user: match[1] + " (" + match[2] + ")",
					msg: " ~ " + match[1] + " -> " + match[3]
				};
				chanser.DB.saveOne(oldnick, user);
			}
		});
	}
});

listen({
	plugin: "user",
	handle: "seenQuit",
	regex: regexFactory.onQuit(),
	callback: function (input, match) {
		var user,
			nick = match[1].toLowerCase();

		function neatenQuit(quitmsg) {
			if (quitmsg.slice(0, 6) === "Quit: ") {
				quitmsg = quitmsg.slice(6);
			}
			if (quitmsg.length > 0) {
				return " ~ " + quitmsg;
			}
			return "";
		}

		ial.Channels(match[1]).forEach(function (channel) {
			chanser.resolveChan(channel);
			user = chanser.DB.getOne(nick);
			if (user) { // don't bother recording quit time if they don't talk
				user.left = {
					type: "quit",
					date: new Date(),
					user: match[1] + " (" + match[2] + ")",
					msg: neatenQuit(match[3])
				};
				chanser.DB.saveOne(nick, user);
			}
		});
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
		if (target.toLowerCase() === config.nick.toLowerCase()) {
			irc.say(input.context, "I'm right here, baaaka.");
			return;
		}
		chanser.resolveChan(chan);
		user = chanser.DB.getOne(target.toLowerCase());
		if (!user) {
			irc.say(input.context, "I don't recognise that Pokermon.");
			return;
		}
		if (user.left) {
			irc.say(input.context, user.left.user
					+ " "
					+ (chan !== input.context ? user.left.type
							+ " "
							+ chan : user.left.type)
					+ " "
					+ lib.duration(new Date(user.left.date))
							+ " ago"
							+ user.left.msg, false);
		}
		target = user.last.nick || target;
		seen = (chan !== input.context ? target + " was last seen talking in " + chan + " " : target + " was last seen talking ");
		seen = seen + lib.duration(new Date(user.last.seen)) + " ago ~ " + user.last.message;
		irc.say(input.context, seen, false);
	}
});

