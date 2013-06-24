function transformTime(timeUnits, time) {
	if (timeUnits.match("second")) { time = time * 1000; }
	if (timeUnits.match("minute")) { time = time * 1000 * 60; }
	if (timeUnits.match("hour")) { time = time * 1000 * 60 * 60; }
	return time;
}

// Reminds you about things
listen({
	handle: "remind",
	regex: regexFactory.startsWith("remind"),
	command: {
		root: "remind",
		options: "me in {when} {time unit} to/that {what}",
		help: "Reminds you to do something in"
	},
	callback: function (input) {
		var time, timeUnits, what, rMatch;

		rMatch = (/^me in (\d*) (seconds?|minutes?|hours?) (to|that) (.*)$/i).exec(input.match[1]);
		if (rMatch) {
			time = parseInt(rMatch[1], 10);
			timeUnits = rMatch[2];
			time = transformTime(timeUnits, time);
			what = rMatch[4];
		} else {
			rMatch = (/^me (to|that) (.*) in (\d*) (seconds?|minutes?|hours?)$/i).exec(input.match[1]);
			if (!rMatch) {
				irc.say(input.context, "You should probably look at ;help remind");
				return;
			}
			time = parseInt(rMatch[3], 10);
			timeUnits = rMatch[4];
			time = transformTime(timeUnits, time);
			what = rMatch[2];
		}
		irc.say(input.context, "I will remind you!");
		setTimeout(function () {
			irc.say(input.context, input.from + ": Reminder ~ " + what);
		}, time);
	}
});