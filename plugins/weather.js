// weather!

cmdListen({
	command: "weather",
	help: "Weather thing! Weathers.",
	syntax: config.command_prefix+"weather [-F] <city / state & country>",
	callback: function (input) {
		var uri, temp, time, sunriseTime, sunsetTime, f, place;
		if (!input.args) {
			irc.say(input.context, cmdHelp("weather", "syntax"));
			return;
		}
		if (input.args[0].toUpperCase() === "-F") {
			input.data = input.args.slice(1).join(" ");
			f = true;
		}
		uri = "http://api.openweathermap.org/data/2.5/weather?q="+input.data.trim();
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body);
			if (body.cod === "404") {
				irc.say(input.context, "Nope. API said: "+body.message);
				return;
			}
			temp = (f ? (body.main.temp*(1.8)-459.67).toString() : (body.main.temp-273.15).toString());
			temp = temp.slice(0, temp.indexOf(".")+3) + (f ? "F" : "C");
			place = (body.name ? body.name+", " : "")+body.sys.country;
			irc.say(input.context, "The temperature in "+place+" ("+body.coord.lon+", "+body.coord.lat+") is "+temp+".");
		});
	}
});

