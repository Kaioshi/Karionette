var fs = require('fs'),
	reminders = [];

﻿function transformTime(timeUnits, time) {
	if (timeUnits.indexOf("second") > -1) { time = time * 1000; }
	if (timeUnits.indexOf("minute") > -1) { time = time * 1000 * 60; }
	if (timeUnits.indexOf("hour") > -1) { time = time * 1000 * 60 * 60; }
	return time;
}

function expectedTime(time) {
	return (new Date().valueOf()+parseInt(time));
}

function loadReminders() {
	if (fs.lstatSync("data/reminders.txt").size <= 0) return;
	try {
		reminders = fs.readFileSync("data/reminders.txt", "utf8").split("\n");
	} catch (err) {
		if (err.code === "ENOENT") {
			fs.writeFileSync("data/reminders.txt", "");
		} else {
			logger.error("reminders plugin - loadReminders(): "+err, err);
		}
		return;
	}
	reminders.forEach(function (reminder) {
		startReminder(reminder);
	});
}

function startReminder(reminder) {
	var reg = /^([0-9]+) ([^ ]+)@([^ ]+) (.*)$/.exec(reminder),
		now = new Date().valueOf(),
		time = new Date(parseInt(reg[1])).valueOf();
	time = time-now;
	if (time > 0) {
		setTimeout(function () {
			irc.say(reg[3], reg[2]+": "+reg[4], false);
			removeReminder(reminder);
		}, time);
	} else {
		irc.say(reg[3], reg[2]+": Sorry, I was offline! ;~; late "+reg[4], false);
		removeReminder(reminder);
	}
}

function removeReminder(reminder) {
	var i;
	for (i = 0; i < reminders.length; i++) {
		if (reminders[i] === reminder) {
			reminders.splice(i,1);
			reminder = null;
			fs.writeFileSync("data/reminders.txt", reminders.join("\n"));
			return;
		}
	}
	logger.error("Failed to remove reminder \""+reminder+"\" - dumped reminders into globals.lastReminders");
	globals.lastReminders = reminders;
}

function addReminder(time, nick, context, reminder) {
	time = expectedTime(time);
	reminder = time+" "+nick+"@"+context+" "+reminder;
	startReminder(reminder);
	reminders.push(reminder);
	fs.writeFileSync("data/reminders.txt", reminders.join("\n"));
}

lib.events.on("autojoinFinished", loadReminders);

// Reminds you about things
listen({
	plugin: "remind",
	handle: "remind",
	regex: regexFactory.startsWith("remind"),
	command: {
		root: "remind",
		options: "me in {when} {time unit} to/that {what}",
		help: "Reminds you to do something in"
	},
	callback: function (input, match) {
		var time, timeUnits, what, rMatch;
		
		rMatch = (/^me in (\d*) (seconds?|minutes?|hours?) (to|that) (.*)$/i).exec(match[1]);
		if (rMatch) {
			time = parseInt(rMatch[1], 10);
			timeUnits = rMatch[2];
			time = transformTime(timeUnits, time);
			what = rMatch[4];
		} else {
			rMatch = (/^me (to|that) (.*) in (\d*) (seconds?|minutes?|hours?)[.!?]?$/i).exec(match[1]);
			if (!rMatch) {
				irc.say(input.context, "Wrong syntax ~ ;remind " + this.command.options);
				return;
			}
			time = parseInt(rMatch[3], 10);
			timeUnits = rMatch[4];
			time = transformTime(timeUnits, time);
			what = rMatch[2];
		}
		if (time >= 1000) {
			irc.say(input.context, "I will remind you! .. if you're here at the time, I mean!");
			addReminder(time, input.from, input.context, "reminder ~ "+what);
		} else {
			irc.say(input.context, "nou");
		}
	}
});

