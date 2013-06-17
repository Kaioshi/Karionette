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
		var last, time, seenString,
			args = input.match[1].split(" "),
            userDB = new jsonDB("users/" + input.context, true);
		
		if (userDB.exists) {
			last = userDB.getOne(args[0].toLowerCase());
			if (!last) {
			    irc.say(input.context, "I don't recognise that Pokemon");
			    return;
			}
			time = timeDiff(last.seen);
			seenString = (time.years == 0 ?
					(time.days == 0 ?
						(time.hours == 0 ? time.mins + " minutes, " : time.hours + " hours, ")
						: time.days + " days, ")
				: time.years + " years, ")
				+ time.secs + " seconds ago, saying: "
				+ last.last;
			irc.say(input.context, args[0] + " was last seen " + seenString);
		} else { irc.say(input.context, "Wat? It's my first time. :<"); }
	}
});

