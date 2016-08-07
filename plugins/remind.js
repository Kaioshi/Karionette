// Reminders!
"use strict";
const [DB, setTimeout, ial] = plugin.importMany("DB", "setTimeout", "ial"),
	reminderDB = new DB.List({filename: "reminders"});

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
	reminderDB.forEach(reminder => startReminder(reminder));
}

function startReminder(reminder) {
	let reg = /^([0-9]+) ([^ ]+)@([^ ]+) (.*)$/.exec(reminder),
		now = new Date().valueOf(),
		time = new Date(parseInt(reg[1])).valueOf();
	time = time-now;
	if (time > 0) {
		setTimeout(function () {
			if (ial.Channels(reg[2]).length) {
				irc.say(reg[3], reg[2]+": "+reg[4]);
			} else {
				bot.queueMessage({
					method: "say",
					nick: reg[2],
					channel: reg[3],
					message: reg[2]+", you weren't here! ;_; late "+reg[4]
				});
			}
			reminderDB.removeOne(reminder);
		}, time);
	} else {
		irc.say(reg[3], reg[2]+": Sorry, I was offline! ;_; late "+reg[4]);
		reminderDB.removeOne(reminder);
	}
}

function addReminder(time, nick, context, reminder) {
	time = expectedTime(time);
	reminder = time+" "+nick+"@"+context+" "+reminder;
	startReminder(reminder);
	reminderDB.saveOne(reminder);
}

bot.event({
	handle: "loadRemindersListener",
	event: "autojoinFinished",
	callback: loadReminders
});

// Reminds you about things
bot.command({
	command: "remind",
	help: "Reminds you to do something in",
	syntax: config.command_prefix+"remind me in <N seconds/minutes/hours> to/that <reminder here>",
	callback: function (input) {
		let time, timeUnits, what, rMatch;

		rMatch = /^me in (\d*) (seconds?|minutes?|hours?) (to|that) (.*)$/i.exec(input.data);
		if (rMatch) {
			time = parseInt(rMatch[1], 10);
			timeUnits = rMatch[2];
			time = transformTime(timeUnits, time);
			what = rMatch[4];
		} else {
			rMatch = /^me (to|that) (.*) in (\d*) (seconds?|minutes?|hours?)[.!?]?$/i.exec(input.data);
			if (!rMatch) {
				irc.say(input.context, "Bad syntax - "+bot.cmdHelp("remind", "syntax"));
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
