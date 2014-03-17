// rp thing
var playerDB = new DB.Json({filename: "rp-players"}),
	ethnicities = [ "Harikki", "Draskan", "Satlani", "Nasikan", "Atrisian", "Merekese" ],
	races = [
		"Human",
		"Halfling", "Half-halfling",
		"Dwarf", "Half-dwarf",
		"Elf", "Half-elf",
		"Orc", "Half-orc",
		"Giant", "Half-giant"
	];

function validateEthnicity(ethnicity) {
	var i;
	for (i = 0; i < ethnicities.length; i++) {
		if (ethnicity.toLowerCase() === ethnicities[i].toLowerCase()) {
			return ethnicities[i];
		}
	}
}

function validateRace(race) {
	var i;
	for (i = 0; i < races.length; i++) {
		if (race.toLowerCase() === races[i].toLowerCase()) {
			return races[i];
		}
	}
}

function adjustAge(race, age) {
	var valid = getRaceAges(race);
	if (age < valid[0]) return valid[0];
	if (age > valid[1]) return valid[1];
	return age;
}

function randNum(min, max) {
	var ret = 0;
	if (min >= max) return min;
	while (ret < min) {
		ret = Math.floor(Math.random()*max);
	}
	return ret;
}

function getRaceAges(race) {
	switch (race) {
		case "Elf":
			return [ 80, 10000 ];
		case "Half-elf":
			return [ 30, 2000 ];
		case "Dwarf":
			return [ 40, 500 ];
		case "Half-dwarf":
			return [ 30, 250 ];
		case "Orc":
			return [ 8, 70 ];
		case "Half-orc":
			return [ 10, 75 ];
		case "Halfling":
			return [ 30, 120 ];
		case "Half-halfling":
			return [ 18, 90 ];
		case "Giant":
		case "Half-giant":
		case "Human":
			return [ 12, 80 ];
	}
}

function validAge(race, age) {
	var valid = getRaceAges(race);
	if (age >= valid[0] && age <= valid[1]) return true;
	return false;
}

function randAge(race) {
	var valid = getRaceAges(race);
	return randNum(valid[0], valid[1]);
}

function createPlayer(nick) {
	var player = {
		nick: nick,
		race: lib.randSelect(races),
		ethnicity: lib.randSelect(ethnicities)
	};
	//player.stature = randStature(player.race);
	player.age = randAge(player.race);
	player.gender = lib.randSelect([ "Male", "Female" ]);
	return player;
}

cmdListen({
	command: [ "gencharacter", "genchar" ],
	help: "Generates random characters for #roleplay",
	syntax: config.command_prefix+"gencharacter",
	callback: function (input) {
		var player = createPlayer(input.nick);
		playerDB.saveOne(input.nick.toLowerCase(), player);
		irc.say(input.context, "Random character created! "+input.nick+" is a "
			+player.age+" year old "+player.gender+" "+player.ethnicity+" "
			+(player.gender === "Female" && player.race === "Giant" ? "Giantess" : player.race)+".");
	}
});

cmdListen({
	command: "setchar",
	help: "Sets various character attributes. #roleplay",
	syntax: config.command_prefix+"setchar <age/race/ethnicity/gender/description>",
	callback: function (input) {
		var player, age, race, gender, ethnicity, ages, valid;
		if (!input.args) {
			irc.say(input.context, cmdHelp("setchar", "syntax"));
			return;
		}
		player = playerDB.getOne(input.nick.toLowerCase());
		if (!player) {
			return "I'm not familiar with your character. Is your nick correct?";
		}
		switch (input.args[0]) {
			case "age":
				age = parseInt(input.args[1], 10);
				ages = "";
				races.forEach(function (race) {
					valid = getRaceAges(race);
					ages += race+": "+valid[0]+"-"+lib.commaNum(valid[1])+", ";
				});
				if (!age) {
					irc.say(input.context, "Valid ages per race:");
					irc.say(input.context, ages.slice(0,-2)+".");
					return;
				}
				if (validAge(player.race, age)) {
					player.age = age;
					playerDB.saveOne(input.nick.toLowerCase(), player);
					irc.say(input.context, input.nick+"'s age is now "+age+".");
					break;
				}
				irc.say(input.context, age+" is not a valid age for your race. Valid ages per race are "+ages.slice(0,-2)+".");
				break;
			case "race":
				race = validateRace(input.args.slice(1).join("-"));
				if (!race) {
					irc.say(input.context, "Invalid race. Available: "+races.join(", ")+".");
					break;
				}
				player.race = race;
				irc.say(input.context, input.nick.toLowerCase()+"'s race is now "
					+(player.gender === "Female" && player.race === "Giant" ? "Giantess" : player.race)+".");
				// adjust age if needed
				age = adjustAge(race, player.age);
				if (age !== player.age) {
					irc.say(input.context, input.nick+"'s age was adjusted to "
						+age+" from "+player.age+", according to the new race's age limits.");
					player.age = age;
				}
				playerDB.saveOne(input.nick.toLowerCase(), player);
				break;
			case "ethnicity":
				ethnicity = validateEthnicity(input.args.slice(1).join(" "));
				if (!ethnicity) {
					irc.say(input.context, "Available ethnicities: "+ethnicities.join(", ")+".");
					break;
				}
				player.ethnicity = ethnicity;
				irc.say(input.context, input.nick+"'s ethnicity is now "+player.ethnicity+".");
				playerDB.saveOne(input.nick.toLowerCase(), player);
				break;
			case "gender":
				gender = input.args.slice(1).join(" ").toLowerCase();
				if (!gender) {
					irc.say(input.context, "You can be Male or Female.");
					return;
				}
				switch (gender) {
					case "male":
						if (player.gender === "Male") {
							irc.say(input.context, input.nick+" is already Male.");
							break;
						}
						player.gender = "Male";
						playerDB.saveOne(input.nick.toLowerCase(), player);
						irc.say(input.context, input.nick+" is now Male.");
						break;
					case "female":
						if (player.gender === "Female") {
							irc.say(input.context, input.nick+" is already Female.");
							break;
						}
						player.gender = "Female";
						playerDB.saveOne(input.nick.toLowerCase(), player);
						irc.say(input.context, input.nick+" is now Female.");
						break;
					default:
						irc.say(input.context, gender+" hasn't been added yet, sorry. Blame Lumi.");
						break;
				}
				break;
			case "description":
				player.description = input.args.slice(1).join(" ");
				playerDB.saveOne(input.nick.toLowerCase(), player);
				irc.say(input.context, input.nick+"'s description was updated.");
				break;
			default:
				irc.say(input.context, cmdHelp("setchar", "syntax"));
				break;
		}
		player = null;
	}
});

cmdListen({
	command: "look",
	help: "Looks at a character. #roleplay",
	syntax: config.command_prefix+"look <nick>",
	callback: function (input) {
		var player;
		if (!input.args) {
			irc.say(input.context, cmdHelp("look", "syntax"));
			return;
		}
		player = playerDB.getOne(input.args[0].toLowerCase());
		if (!player) {
			irc.say(input.context, "I don't see a character associated with the nick "+input.args[0]+".");
			return;
		}
		irc.say(input.context, "You see a "+lib.commaNum(player.age)+" year old "+player.gender+" "+player.ethnicity+" "
			+(player.gender === "Female" && player.race === "Giant" ? "Giantess" : player.race)+".");
		irc.say(input.context, player.description, false, 1);
		player = null;
	}
});
