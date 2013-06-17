function getAge() {
	var timeBase = new Date("1 May 2013 18:40:00 GMT"),		//Mari's birthday
		timeNow = new Date(),
		age = timeNow - timeBase,							//Mari's age in milliseconds
		secs = Math.floor(age / 1000),						//in seconds
		mins = Math.floor(secs / 60),						//in minutes
		hours = Math.floor(mins / 60),						//in hours
		days = Math.floor(hours / 24),						//in days
		years = Math.floor(days / 365.25),					//in years
		ageIs;
	secs = ("0" + (secs % 60)).substr(-2);
	mins = ("0" + (mins % 60)).substr(-2);
	hours = ("0" + (hours % 24)).substr(-2);
	days %= 365.25;
	ageIs = "I am: " + years + " years, " + days + " days, " + hours +
		" hours, " + mins + " minutes, and " + secs +
		" seconds old, but always sweet as sugar.";
	return ageIs;
}


// Get Mari's age
listen({
	handle: "age",
	regex: regexFactory.startsWith("age"),
	command: {
		root: "age",
		options: "No options",
		help: "Tells you how old Mari is!"
	},
	callback: function (input) {
		var age = getAge();
		irc.say(input.context, age);
	}
});