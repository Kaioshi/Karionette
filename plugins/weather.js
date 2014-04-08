// weather!

function tellEmSteveDave(location, conditions, temp) {
	return lib.randSelect([
		"Yo, "+location+" has gots "+conditions+", and is "+temp+". Dayum!",
		lib.randSelect([ "Vanessa", "Bridget", "Britney", "Miranda", "Megan", "Holly" ])+
			" told me "+location+" was like, "+temp+" hot. That is so totally "+conditions+"!",
		"I am going to master "+conditions+" style! "+temp+" won't stop me from becoming "+location+"'s next ninja superstar! >:D",
		"Location: "+location+" - Temperature: "+temp+" - Conditions: "+conditions+"."
	]);
}

function toCelsius(kelvin) {
	var ret = (kelvin-273.15).toString();
	return ret.slice(0, ret.indexOf(".")+3)+"C";
}

function toFahrenheit(kelvin) {
	var ret = ((kelvin*1.8)-459.67).toString();
	return ret.slice(0, ret.indexOf(".")+3)+"F";
}

function getConditions(weather) {
	var ret = [];
	weather.forEach(function (condition) {
		if (condition.description) {
			ret.push(condition.description);
		}
	});
	return ret.join(", ");
}

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
			globals.lastBody = body;
			if (body.cod === "404") {
				irc.say(input.context, "Nope. API said: "+body.message);
				return;
			}
			temp = toCelsius(body.main.temp)+" / "+toFahrenheit(body.main.temp);
			place = (body.name ? body.name+", " : "")+body.sys.country;
			irc.say(input.context, tellEmSteveDave(place, getConditions(body.weather), temp));
		});
	}
});

