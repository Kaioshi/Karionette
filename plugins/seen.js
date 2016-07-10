"use strict";

const seen = {};

function setLast(chan, nick, type, line) {
	const lnick = nick.toLowerCase(),
		lchan = chan.toLowerCase(),
		entry = seen[lchan].getOne(lnick) || {};
	entry.nick = nick;
	entry[type] = { message: line, date: Date.now() };
	seen[lchan].saveOne(lnick, entry);
}

function removeUserLeft(chan, nick) {
	const lchan = chan.toLowerCase(),
		lnick = nick.toLowerCase(),
		entry = seen[lchan].getOne(lnick);
	if (!entry)
		return;
	if (entry.left) {
		delete entry.left;
		seen[lchan].saveOne(lnick, entry);
	}
	if (!entry.message)
		seen[lchan].removeOne(lnick, entry);
}

bot.event({
	handle: "seenMsg",
	event: "PRIVMSG",
	callback: function (input) {
		if (!input.channel)
			return;
		const message = (input.data.slice(0,7) === "\x01ACTION" ?
				"* "+input.nick+" "+input.message.slice(8,-1) :
				"<"+input.nick+"> "+input.message);
		setLast(input.context, input.nick, "message", message);
	}
});

bot.event({
	handle: "seenJoin",
	event: "JOIN",
	callback: function (input) {
		if (input.nick === config.nick) {
			const lchan = input.context.toLowerCase();
			seen[lchan] = new DB.Json({filename: "seen/"+lchan});
		}
		removeUserLeft(input.context, input.nick);
	}
});

bot.event({
	handle: "seenPart",
	event: "PART",
	callback: function (input) {
		const reason = input.reason ? ": "+input.reason : "";
		setLast(input.context, input.nick, "left", input.nick+" parted {timeAgo}"+reason);
	}
});

bot.event({
	handle: "seenKick",
	event: "KICK",
	callback: function (input) {
		const reason = input.reason.toLowerCase() !== input.kicked.toLowerCase() ? ": "+input.reason : "";
		setLast(input.context, input.kicked, "left", input.kicked+" was kicked by "+input.nick+" {timeAgo}"+reason);
	}
});

bot.event({
	handle: "seenNick",
	event: "NICK",
	callback: function (input) {
		const nick = input.nick,
			newnick = input.newnick;
		ial.User(newnick).channels.forEach(chan => {
			setLast(chan, nick, "left", nick+" nick changed {timeAgo}: "+nick+" -> "+newnick);
			removeUserLeft(chan, newnick);
		});
	}
});

bot.event({
	handle: "seenQuit",
	event: "QUIT",
	callback: function (input) {
		const nick = input.nick;
		let reason = input.reason.replace("Quit:", "");
		reason = reason.length ? " ~ "+reason : "";
		ial.User(nick).channels.forEach(chan => {
			setLast(chan, nick, "left", nick+" quit {timeAgo}"+reason);
		});
	}
});


bot.command({
	command: "seen",
	help: "Displayed the last known time someone was seen and what they said last.",
	syntax: config.command_prefix+"seen <nick>",
	arglen: 1,
	callback: function (input) {
		if (input.context[0] !== "#") {
			irc.say(input.context, "Use "+config.command_prefix+"seen in the channel.");
			return;
		}
		if (input.args[0].toLowerCase() === config.nick.toLowerCase()) {
			irc.say(input.context, "I'm right here, baaaka.");
			return;
		}
		const lchan = input.context.toLowerCase(),
			lnick = input.args[0].toLowerCase(),
			entry = seen[lchan].getOne(lnick);
		if (!entry) {
			const user = ial.User(input.args[0]);
			if (user && user.ison(input.context))
				irc.say(input.context, "They're right here, though I haven't seen them talk.");
			else
				irc.say(input.context, lib.randSelect([ "Haven't seen 'em.", "Who?", "I don't recognise that pokermon.", "Nope." ]));
			return;
		}
		if (entry.message)
			irc.say(input.context, `${entry.nick} was last seen talking ${lib.duration(entry.message.date)} ago ~ ${entry.message.message}`);
		if (entry.left)
			irc.say(input.context, entry.left.message.replace("{timeAgo}", lib.duration(entry.left.date))+" ago");
	}
});

function convertAllOldSeen() {
	const files = fs.readdirSync("data/users/").filter(file => file[0] === "#"),
		txtFiles = files.filter(file => file.slice(-4) === ".txt"),
		jsonFiles = files.filter(file => file.slice(-5) === ".json");
	if (txtFiles.length)
		txtFiles.forEach(convertOldSeenTxt);
	if (jsonFiles.length)
		jsonFiles.forEach(convertOldSeenJson);
}

function convertOldSeenTxt(file) {
	const fn = "data/users/"+file,
		lchan = file.slice(0,-4),
		db = new DB.Json({filename: "seen/"+lchan}),
		oldSeen = fs.readFileSync(fn).toString().split("\n"),
		leftReg = /^([^ ]+) ([0-9]+) message: \"(.*)\" left: ([0-9]+) user: \"(.*)\" type: \"(.*)\" message: \"(.*)\"$/,
		hereReg = /^([^ ]+) ([0-9]+) message: \"(.*)\"$/;
	logger.debug("Converting "+fn+" to new seen format.");
	oldSeen.filter(ln => ln && ln.length).forEach(entry => {
		if (entry.indexOf("\" left: ") > -1) {
			const reg = leftReg.exec(entry),
				lnick = reg[1].toLowerCase();
			if (db.hasOne(lnick))
				return; // don't kill new entries
			db.saveOne(lnick, {
				nick: reg[1],
				message: { message: reg[3], date: parseInt(reg[2]) },
				left: { message: `${reg[1]} ${reg[6]} {timeAgo}${reg[7]}`, date: parseInt(reg[4]) }
			});
		} else {
			const reg = hereReg.exec(entry),
				lnick = reg[1].toLowerCase();
			if (db.hasOne(lnick))
				return; // don't kill new entries
			db.saveOne(lnick, { nick: reg[1], message: { message: reg[3], date: reg[2] } });
		}
	});
	fs.renameSync(fn, "data/users/"+lchan+".txt.backup");
}

function convertOldSeenJson(file) {
	const fn = "data/users/"+file,
		lchan = file.slice(0, -5),
		db = new DB.Json({filename: "users/"+lchan}),
		oldSeen = JSON.parse(fs.readFileSync(fn).toString());
	logger.debug("Converting "+fn+" to new seen format.");
	Object.keys(oldSeen).forEach(lnick => {
		if (db.hasOne(lnick))
			return; // don't kill new entries
		const seenEntry = oldSeen[lnick], entry = {};
		entry.nick = seenEntry.last.nick || lnick;
		entry.message = { message: seenEntry.last.message, date: new Date(seenEntry.last.seen).valueOf() };
		if (seenEntry.left) {
			entry.left = {
				message: entry.nick+" "+seenEntry.left.type+" {timeAgo}"+seenEntry.left.msg,
				date: new Date(seenEntry.left.date).valueOf()
			};
		}
		db.saveOne(lnick, entry);
	});
	fs.renameSync(fn, "data/users/"+lchan+".json.backup");
}

convertAllOldSeen();
