// Reminders!
"use strict";
var reminders,
	reminderDB = new DB.List({filename: "reminders", queue: true});

function transformTime(timeUnits, time) {
	if (timeUnits.indexOf("second") > -1) { time = time * 1000; }
	if (timeUnits.indexOf("minute") > -1) { time = time * 1000 * 60; }
	if (timeUnits.indexOf("hour") > -1) { time = time * 1000 * 60 * 60; }
	return time;
}

function expectedTime(time) {
	return (new Date().valueOf()+parseInt(time));
}

function loadReminders() {
	reminders = reminderDB.getAll() || [];
	if (reminders.length > 0) {
		reminders.forEach(function (reminder) {
			startReminder(reminder);
		});
	}
}

function startReminder(reminder) {
	var reg = /^([0-9]+) ([^ ]+)@([^ ]+) (.*)$/.exec(reminder),
		now = new Date().valueOf(),
		time = new Date(parseInt(reg[1])).valueOf();
	time = time-now;
	if (time > 0) {
		setTimeout(function () {
			if (ial.Channels(reg[2]).length) {
				irc.say(reg[3], reg[2]+": "+reg[4], false);
			} else {
				lib.events.emit("Event: queueMessage", {
					method: "say",
					nick: reg[2],
					channel: reg[3],
					message: reg[2]+", you weren't here! ;_; late "+reg[4],
					sanitise: false
				});
			}
			removeReminder(reminder);
		}, time);
	} else {
		irc.say(reg[3], reg[2]+": Sorry, I was offline! ;_; late "+reg[4], false);
		removeReminder(reminder);
	}
}

function removeReminder(reminder) {
	var i;
	for (i = 0; i < reminders.length; i++) {
		if (reminders[i] === reminder) {
			reminders.splice(i,1);
			reminder = null;
			reminderDB.saveAll(reminders);
			return;
		}
	}
	logger.error("Failed to remove reminder \""+reminder+"\" - dumped reminders into globals.lastReminders");
}

function addReminder(time, nick, context, reminder) {
	time = expectedTime(time);
	reminder = time+" "+nick+"@"+context+" "+reminder;
	startReminder(reminder);
	reminders.push(reminder);
	reminderDB.saveAll(reminders);
}

evListen({
	handle: "loadRemindersListener",
	event: "autojoinFinished",
	callback: loadReminders
});

// Reminds you about things
cmdListen({
	command: "remind",
	help: "Reminds you to do something in",
	syntax: config.command_prefix+"remind me in <N seconds/minutes/hours> to/that <reminder here>",
	callback: function (input) {
		var time, timeUnits, what, rMatch;

		rMatch = /^me in (\d*) (seconds?|minutes?|hours?) (to|that) (.*)$/i.exec(input.data);
		if (rMatch) {
			time = parseInt(rMatch[1], 10);
			timeUnits = rMatch[2];
			time = transformTime(timeUnits, time);
			what = rMatch[4];
		} else {
			rMatch = /^me (to|that) (.*) in (\d*) (seconds?|minutes?|hours?)[.!?]?$/i.exec(input.data);
			if (!rMatch) {
				irc.say(input.context, "Bad syntax - "+cmdHelp("remind", "syntax"));
				return;
			}
			time = parseInt(rMatch[3], 10);
			timeUnits = rMatch[4];
			time = transformTime(timeUnits, time);
			what = rMatch[2];
		}
		if (time >= 1000) {
			irc.say(input.context, "I will remind you! .. if you're here at the time, I mean!");
			addReminder(time, input.nick, input.context, "reminder ~ "+what);
		} else {
			irc.say(input.context, "nou");
		}
	}
});
