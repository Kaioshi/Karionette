var fs = require('fs'),
	seen = {};

function getOldSeen(nick, channel) {
	var seenDB, entry;
	if (!fs.existsSync("data/users/"+channel+".json")) return;
	seenDB = new DB.Json({filename: "users/"+channel});
	entry = seenDB.getOne(nick.toLowerCase());
	if (entry) {
		seenDB = null;
		entry.last.seen = new Date(entry.last.seen).valueOf();
		if (!entry.last.nick) {
			entry.last.nick = /(\<|\* )([^> ]+)/.exec(entry.last.message)[2];
		}
		if (entry.left) entry.left.date = new Date(entry.left.date).valueOf();
		convertSeen(entry, channel);
		return entry;
	}
	entry = null; seenDB = null;
}

function convertSeen(entry, channel) {
	var line;
	
	function quote(text) {
		return "\""+text+"\"";
	}
	
	if (!entry.left) {
		line = [
			entry.last.nick,
			entry.last.seen,
			"message:",
			quote(entry.last.message)
		].join(" ");
	} else {
		line = [
			entry.last.nick,
			entry.last.seen,
			"message:",
			quote(entry.last.message),
			"left:",
			entry.left.date,
			"user:",
			quote(entry.left.user),
			"type:",
			quote(entry.left.type),
			"message:",
			quote(entry.left.msg)
		].join(" ");
	}
	seen[channel].push(line);
	seen[channel].altered = true;
	line = null;
}

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
	if (!nick) {
		logger.warn("findUserIndex("+[nick, channel].join(", ")+") called incorrectly.");
		return;
	}
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
		logger.debug("Didn't find such a guy. Checking old DB.");
		return getOldSeen(nick, channel);
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

evListen({
	handle: "seenMsg",
	event: "PRIVMSG",
	callback: function (input) {
		var date, data;
		if (!input.channel) return; // query
		date = new Date().valueOf();
		data = (isAction(input.message) ? "* "+input.nick+" "+input.message
			: "<"+input.nick+"> "+input.message);
		ial.addActive(input.channel, input.nick, date, input.address);
		setLastMessage(input.nick, input.channel, data, date);
		data = null; date = null;
	}
});

evListen({
	handle: "seenJoin",
	event: "JOIN",
	callback: function (input) {
		if (input.nick === config.nick) loadSeen(input.channel);
		removeUserLeft(input.nick, input.channel);
	}
});

evListen({
	handle: "seenPart",
	event: "PART",
	callback: function (input) {
		setUserLeft(input.nick, input.address, input.channel, "parted", input.reason);
	}
});

evListen({
	handle: "seenKick",
	event: "KICK",
	callback: function (input) {
		setUserLeft(input.kicked, ial.User(input.kicked, input.channel).address,
			input.channel, "was kicked",
			" by "+input.nick+
			(input.reason.toLowerCase() !== input.kicked.toLowerCase() ? " ("+input.reason+")" : ""));
	}
});

evListen({
	handle: "seenNick",
	event: "NICK",
	callback: function (input) {
		ial.Channels(input.newnick).forEach(function (channel) {
			setUserLeft(input.nick, input.address, channel, "nick changed", " ~ "+input.nick+" -> "+input.newnick);
			removeUserLeft(input.newnick, channel);
		});
	}
});

evListen({
	handle: "seenQuit",
	event: "QUIT",
	callback: function (input) {
		ial.Channels(input.nick).forEach(function (channel) {
			setUserLeft(input.nick, input.address, channel, "quit", (
				input.reason.slice(0,6) === "Quit: " ? input.reason = input.reason.slice(6) :
				(input.reason.length > 0 ? " ~ "+input.reason : "")
			));
		});
	}
});

// Handles Last Seen interface
cmdListen({
	command: "seen",
	help: "Displays the last known time {person} was seen, and what they last said.",
	syntax: config.command_prefix+"seen <nick>",
	callback: function (input) {
		var user, chan, target, seen;
		if (!input.args || !input.args[0]) {
			irc.say(input.context, cmdHelp("seen", "syntax"));
			return;
		}
		if (input.channel && input.args[1]) {
			chan = input.args[0];
			target = input.args[1].replace("?", "");
		} else {
			chan = input.context;
			target = input.args[0].replace("?", "");
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

