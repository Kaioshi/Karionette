// weather!
"use strict";
var weatherDB = new DB.Json({filename: "weather"});

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
	return (ret.indexOf(".") > -1 ? ret.slice(0, ret.indexOf(".")+2) : ret);
}

function toFahrenheit(kelvin) {
	var ret = ((kelvin*1.8)-459.67).toString();
	return (ret.indexOf(".") > -1 ? ret.slice(0, ret.indexOf(".")+3) : ret);
}

function getConditions(weather) {
	var ret = [];
	weather.forEach(function (condition) {
		if (condition.description) {
			ret.push(condition.description.toLowerCase());
		}
	});
	return ret.join(", ");
}

function fondleCountry(country) {
	switch (country) {
		case "USA":
		case "United States of America":
			return lib.randSelect(["USA", "'murrica"]);
		case "AU":
		case "Australia":
			return lib.randSelect(["Australia", "'stralia", "'straya"]);
		case "New Zealand":
			return lib.randSelect(["New Zealand", "Kiwiland", "Lil 'straya"]);
	}
	return country;
}

function getLocation(nick, context, args) {
	var location;
	if (args && args[0].toLowerCase() === "-bind") {
		if (!args[1]) return;
		location = args.slice(1).join(" ");
		weatherDB.saveOne(nick.toLowerCase(), location);
		irc.say(context, nick+": Your location is now bound to "+location+".");
	} else if (args && args.length === 1) {
		location = weatherDB.getOne(args[0].toLowerCase());
	}
	return location || (args ? args.join(" ") : null) || weatherDB.getOne(nick.toLowerCase());
}

cmdListen({
	command: "weather",
	help: "Weather thing! Weathers.",
	syntax: config.command_prefix+"weather [-bind] [<city / state & country>] [<bound nick>]",
	callback: function (input) {
		var uri, temp, place,
			location = getLocation(input.nick, input.context, input.args);

		if (!location) {
			irc.say(input.context, cmdHelp("weather", "syntax"));
			return;
		}
		uri = "http://api.openweathermap.org/data/2.5/weather?q="+location;
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body);
			if (body.cod === "404") {
				irc.say(input.context, "Couldn't find \""+location+"\"");
				return;
			}
			temp = toCelsius(body.main.temp)+"C / "+toFahrenheit(body.main.temp)+"F";
			place = (body.name ? body.name+", " : "")+fondleCountry(body.sys.country);
			irc.say(input.context, tellEmSteveDave(place, getConditions(body.weather), temp));
		});
	}
});

function assignTemps(kelvin) {
	return [ kelvin, toCelsius(kelvin), toFahrenheit(kelvin) ];
}

function getForecast(fc) {
	var day, temps = {}, ret = "", i;
	for (i = 0; i < fc.length; i++) {
		day = new Date(fc[i].dt_txt).toUTCString(); day = day.slice(0, day.indexOf(","));
		temps[day] = temps[day] || { min: assignTemps(fc[i].main.temp), max: assignTemps(fc[i].main.temp) };
		if (fc[i].main.temp > temps[day].max[0]) {
			temps[day].max = assignTemps(fc[i].main.temp);
		} else if (fc[i].main.temp < temps[day].min[0]) {
			temps[day].min = assignTemps(fc[i].main.temp);
		}
	}
	Object.keys(temps).forEach(function (entry) {
		if (temps[entry].min[0] !== temps[entry].max[0]) {
			ret += entry+": "+temps[entry].min[1]+" to "+temps[entry].max[1]+"C ("+temps[entry].min[2]+"/"+temps[entry].max[2]+"F) - ";
		}
	});
	return ret.slice(0,-3);
}

cmdListen({
	command: "forecast",
	help: "Weather forecast! Forecasts.",
	syntax: config.command_prefix+"forecast [-bind] [<city / state & country>] [<bound nick>]",
	callback: function (input) {
		var uri, place,
			location = getLocation(input.nick, input.context, input.args);
		if (!location) {
			irc.say(input.context, cmdHelp("forecast", "syntax"));
			return;
		}
		uri = "http://api.openweathermap.org/data/2.5/forecast?q="+location;
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body);
			if (body.cod === "404") {
				irc.say(input.context, "Couldn't find \""+location+"\"");
				return;
			}
			place = (body.city.name ? body.city.name+", " : "")+fondleCountry(body.city.country);
			irc.say(input.context, place+" ~ "+getForecast(body.list));
		});
	}
});
