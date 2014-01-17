// rp thing
var playerDB = new DB.Json({filename: "rp-players"}),
	races = [
		"Harikki", "Draskan", "Satlani", "Nasikan", "Atrisian", "Merekese", "Dwarf",
		"Half-dwarf", "Elf", "Half-elf", "Orc", "Half-orc", "Giant", "Half-giant"
	];

function validateRace(race) {
	var i;
	for (i = 0; i < races.length; i++) {
		if (race.toLowerCase() === races[i].toLowerCase()) {
			return races[i];
		}
	}
}

function adjustAge(race, age) { // helper for ;setchar race <race with age limits>
	switch (race) {
		case "Elf":
			if (age < 80) return 80;
			break;
		default:
			if (age > 90) return 90;
			break;
	}
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

function validAge(race, age) {
	switch (race) {
		case "Elf":
			if (age < 80) {
				return false;
			}
			return true;
			break;
		default:
			if (age >= 12 && age <= 90) return true;
			return false;
	}
}

function randAge(race) {
	switch (race) {
		case "Elf":
			return randNum(80, 10000);
			break;
		default:
			return randNum(12, 90);
			break;
	}
}

function createPlayer(nick) {
	var player = {
		nick: nick,
		race: lib.randSelect(races)
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
		playerDB.saveOne(input.nick, player);
		irc.say(input.context, "Random character created! "+input.nick+" is a "+player.age+" year old "+player.gender+" "+player.race+".");
	}
});

cmdListen({
	command: "setchar",
	help: "Sets various character attributes. #roleplay",
	syntax: config.command_prefix+"setchar <age/race/gender/description>",
	callback: function (input) {
		var player, age, race, gender;
		if (!input.args || !input.args[1]) {
			irc.say(input.context, cmdHelp("setchar", "syntax"));
			return;
		}
		player = playerDB.getOne(input.nick);
		if (!player) {
			return "I'm not familiar with your character. Is your nick correct?";
		}
		switch (input.args[0]) {
			case "age":
				age = parseInt(input.args[1], 10);
				if (validAge(player.race, age)) {
					player.age = age;
					playerDB.saveOne(input.nick, player);
					irc.say(input.context, input.nick+"'s age is now "+age+".");
					break;
				}
				irc.say(input.context, age+" is not a valid age for your race. \
					Currently, elves have to be between 80 and 10,000, the rest are 12-90 - waiting on more race data.");
				break;
			case "race":
				race = validateRace(input.args.slice(1).join("-"));
				if (!race) {
					irc.say(input.context, "Invalid race. Available: "+races.join(", ")+".");
					break;
				}
				player.race = race;
				irc.say(input.context, input.nick+"'s race is now "+player.race+".");
				// adjust age if needed
				age = adjustAge(race, player.age);
				if (age !== player.age) {
					irc.say(input.context, input.nick+"'s age was adjusted to "
						+age+" from "+player.age+", according to the new race's age limits.");
					player.age = age;
				}
				playerDB.saveOne(input.nick, player);
				break;
			case "gender":
				gender = input.args[1].toLowerCase();
				switch (gender) {
					case "male":
						if (player.gender === "Male") {
							irc.say(input.context, input.nick+" is already Male.");
							break;
						}
						player.gender = "Male";
						playerDB.saveOne(input.nick, player);
						irc.say(input.context, input.nick+" is now Male.");
						break;
					case "female":
						if (player.gender === "Female") {
							irc.say(input.context, input.nick+" is already Female.");
							break;
						}
						player.gender = "Female";
						playerDB.saveOne(input.nick, player);
						irc.say(input.context, input.nick+" is now Female.");
						break;
					default:
						irc.say(input.context, gender+" hasn't been added yet, sorry. Blame Lumi.");
						break;
				}
				break;
			case "description":
				player.description = input.args.slice(1).join(" ");
				playerDB.saveOne(input.nick, player);
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
		player = playerDB.getOne(input.args[0]);
		if (!player) {
			irc.say(input.context, "I don't see a character associated with the nick "+input.args[0]+".");
			return;
		}
		irc.say(input.context, "You see a "+player.age+" year old "+player.gender+" "+player.race+".");
		irc.say(input.context, player.description, false);
		player = null;
	}
});
