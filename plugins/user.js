var fs = require('fs'),
	seen = {};

function loadSeen(channel) {
	var filename = "data/users/"+channel+".txt";
	if (fs.existsSync(filename)) {
		seen[channel] = fs.readFileSync(filename).toString().split("\n");
	} else {
		seen[channel] = [];
	}
}

function saveSeen(channel) {
	var filename = "data/users/"+channel+".txt";
	if (seen[channel] && seen[channel].length > 0) {
		try {
			fs.writeFileSync(filename, seen[channel].join("\n"));
			logger.info("Wrote seen data to "+filename);
		} catch (err) {
			logger.error("Problem writing seen data to "+filename, err);
		}
	}
}

function saveAllSeen() {
	Object.keys(seen).forEach(function (channel) {
		if (seen[channel] && seen[channel].length > 0 && seen[channel].altered) {
			saveSeen(channel);
			delete seen[channel].altered;
		}
	});
}

function findUserIndex(nick, channel) {
	var i;
	if (!seen[channel]) loadSeen(channel);
	//globals.lastSeen = seen;
	nick = nick.toLowerCase()+" ";
	for (i = 0; i < seen[channel].length; i++) {
		if (seen[channel][i].slice(0,nick.length).toLowerCase() === nick) {
			//console.log("Returning index "+i);
			return i;
		}
	}
	return -1;
}

function getSeen(nick, channel) {
	var i, reg,
		id = findUserIndex(nick, channel);
	if (id === -1) {
		logger.debug("Didn't find such a guy.");
		return;
	}
	// convert to object we like and return
	if (seen[channel][id].indexOf("left: ") > -1) {
		reg = /^([^ ]+) ([0-9]+) message: \"(.*)\" left: ([0-9]+) user: \"(.*)\" type: \"(.*)\" message: \"(.*)\"$/.exec(seen[channel][id]);
		return {
			last: {	nick: reg[1], seen: reg[2], message: reg[3] },
			left: { date: reg[4], user: reg[5],	type: reg[6], msg: reg[7] }
		};
	}
	reg = /^([^ ]+) ([0-9]+) message: \"(.*)\"$/.exec(seen[channel][id]);
	return {
		last: {
			nick: reg[1],
			seen: reg[2],
			message: reg[3]
		}
	};
}

function setLastMessage(nick, channel, message, date) {
	var entry = nick+" "+date+" message: \""+message+"\"",
		id = findUserIndex(nick, channel);
	if (id === -1) {
		seen[channel].push(entry);
	} else {
		seen[channel][id] = entry;
	}
	seen[channel].altered = true;
}

function setUserLeft(nick, address, channel, type, message) {
	var leftid,
		entry,
		id = findUserIndex(nick, channel);
	if (id === -1) return; // no messages from them so we don't care when they left~
	entry = "left: "+new Date().valueOf()+" user: \""+nick+" ("+address+")\" type: \""+type+"\" message: \""+message+"\"";
	leftid = seen[channel][id].indexOf("left: ");
	if (leftid > -1) {
		seen[channel][id] = seen[channel][id].slice(0, leftid)+entry;
	} else {
		seen[channel][id] = seen[channel][id]+" "+entry;
	}
	seen[channel].altered = true;
}

function removeUserLeft(nick, channel) {
	var leftid,
		id = findUserIndex(nick, channel);
	if (id === -1) return;
	leftid = seen[channel][id].indexOf("left: ");
	if (leftid > -1) {
		seen[channel][id] = seen[channel][id].slice(0, leftid-1);
		seen[channel].altered = true;
	}
}

// Check if ACTION
function isAction(data) {
	return (data.substring(0, 7) === "\u0001ACTION");
}

timers.Add(900000, saveAllSeen);

// This plugin handles stuff that goes into data/users
listen({
	plugin: "user",
	handle: "channelMsgListener",
	regex: /^:[^!]+![^ ]+@[^ ]+ PRIVMSG #[^ ]+ :.*/i,
	callback: function (input) {
		var user,
			from = input.from.toLowerCase(),
			date = new Date().valueOf(),
			data = (isAction(input.data) ? "* " + input.from + input.data.slice(7, -1)
				: "<" + input.from + "> " + input.data);
		ial.addActive(input.context, input.from, date, input.user);
		setLastMessage(input.from, input.context, data, date);
		data = null; date = null;
	}
});

listen({ // remove Quit entries if we've seen 'em join.
	plugin: "user",
	handle: "seenJoin",
	regex: regexFactory.onJoin(),
	callback: function (input, match) {
		if (match[1] === config.nick) loadSeen(match[3]);
		removeUserLeft(match[1], match[3]);
	}
});

listen({
	plugin: "user",
	handle: "seenPart",
	regex: regexFactory.onPart(),
	callback: function (input, match) {
		setUserLeft(match[1], match[2], match[3], "parted", (match[4] ? " ~ " + match[4] : ""));
	}
});

listen({
	plugin: "user",
	handle: "seenNick",
	regex: regexFactory.onNick(),
	callback: function (input, match) {
		ial.Channels(match[3]).forEach(function (channel) {
			setUserLeft(match[1], match[2], channel, "nick changed", " ~ "+match[1]+" -> "+match[3]);
		});
	}
});

listen({
	plugin: "user",
	handle: "seenQuit",
	regex: regexFactory.onQuit(),
	callback: function (input, match) {
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
			setUserLeft(match[1], match[2], channel, "quit", neatenQuit(match[3]));
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
		user = getSeen(target, chan);
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
					+ lib.duration(new Date(parseInt(user.left.date, 10)))
							+ " ago"
							+ user.left.msg, false);
		}
		target = user.last.nick || target;
		seen = (chan !== input.context ? target + " was last seen talking in " + chan + " " : target + " was last seen talking ");
		seen = seen + lib.duration(new Date(parseInt(user.last.seen, 10))) + " ago ~ " + user.last.message;
		irc.say(input.context, seen, false);
	}
});

// Save Cache on Exit
lib.events.on("closing", function () {
	saveAllSeen();
});

