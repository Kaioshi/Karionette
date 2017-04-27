// Reminders!
"use strict";
const [DB, setTimeout, ial] = plugin.importMany("DB", "setTimeout", "ial"),
	reminderDB = DB.List({filename: "reminders"});

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
	const [, remindTime, nick, channel, message] = /^([0-9]+) ([^ ]+)@([^ ]+) (.*)$/.exec(reminder);
	const time = new Date(parseInt(remindTime)).valueOf() - Date.now();
	if (time > 0) {
		setTimeout(function (nick, channel, message, reminderDB) {
			if (ial.User(nick) && ial.User(nick).channels.length) {
				irc.say(channel, nick+": "+message);
			} else {
				bot.queueMessage({
					method: "say",
					nick: nick,
					from: config.command_prefix+"remind",
					channel: channel,
					message: "late "+message,
					time: Date.now()
				});
			}
			reminderDB.removeOne(reminder);
		}, time, nick, channel, message, reminderDB);
	} else {
		irc.say(channel, nick+": Sorry, I was offline! ;_; late "+message);
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
