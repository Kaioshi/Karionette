// weather!

cmdListen({
	command: "weather",
	help: "Weather thing! Weathers.",
	syntax: config.command_prefix+"weather <city / state & country>",
	callback: function (input) {
		var uri, temp, time, sunriseTime, sunsetTime, C, F, place;
		if (!input.args) {
			irc.say(input.context, cmdHelp("weather", "syntax"));
			return;
		}
		uri = "http://api.openweathermap.org/data/2.5/weather?q="+input.data.trim();
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body);
			if (body.cod === "404") {
				irc.say(input.context, "Nope. API said: "+body.message);
				return;
			}
			C = (body.main.temp-273.15).toString();
			C = C.slice(0, C.indexOf(".")+3)+"C";
			F = (body.main.temp*(1.8)-459.67).toString();
			F = F.slice(0, F.indexOf(".")+3)+"F";
			temp = C+" / "+F;
			place = (body.name ? body.name+", " : "")+body.sys.country;
			irc.say(input.context, "The temperature in "+place+" ("+body.coord.lon+", "+body.coord.lat+") is "+temp+".");
		});
	}
});

