// Take 2 on fluffy.
/* STAT SHIT
			 STRENGTH	  WISDOM		DEX		ENDURANCE	  LUCK	CHARISMA
   Human	 5-15-100	 5-15-100	 5-20-125	15-25-150	 0-5-30	 0-5-45
   Dwarf	 5-15-125	 5-15-75	 5-20-80	 5-20-110	 0-5-45	 5-8-80
Woof Elf 	 5-15-65	 5-15-130	15-25-150	 5-20-95	 0-5-45	 0-5-60
   Demon	 5-15-125	 5-15-100	 5-20-100	 5-20-75	 5-8-80	 0-5-50
     Orc	10-20-150	 5-15-50	 5-20-95	 5-20-125	 0-5-50	 0-5-30
 Draegen 	 5-15-135	10-20-150	 5-20-65	 5-20-80	 0-5-60	 0-5-40
 
 HP: (str+end)*0.75
 MP: wis*1.5
*/

/* shop inventory

 ALL start with 5 items
1)
 
 
2)
 total items (+5) are calculated first, ranges by type:
 traveling	 1-10
 standard	 3-20
 temp		 1-8
 specialty	50-100
 
3)
	biome modifiers:
 grassland 
*/
var fluffyChars = new DB.Json({filename: "fluffychars"}),
	raceStats = { // (min, max starting, max total)
		human: { str: [ 5, 15, 100 ], wis: [ 5, 15, 100 ], dex: [ 5, 20, 125 ], end: [ 15, 25, 150 ], luck: [ 0, 5, 30 ], chr: [ 0, 5, 45 ] },
		dwarf: { str: [ 5, 15, 125 ], wis: [ 5, 15, 75 ], dex: [ 5, 20, 80 ], end: [ 5, 20, 110 ], luck: [ 0, 5, 45 ], chr: [ 5, 8, 80 ] },
		woodelf: { str: [ 5, 15, 65 ], wis: [ 5, 15, 130 ], dex: [ 15, 25, 150 ], end: [ 5, 20, 95 ], luck: [ 0, 5, 45 ], chr: [ 0, 5, 60 ] },
		demon: { str: [ 5, 15, 125 ], wis: [ 5, 15, 100 ], dex: [ 5, 20, 100 ], end: [ 5, 20, 75 ], luck: [ 5, 8, 80 ], chr: [ 0, 5, 50 ] },
		orc: { str: [ 10, 20, 150 ], wis: [ 5, 15, 50 ], dex: [ 5, 20, 95 ], end: [ 5, 20, 125 ], luck: [ 0, 5, 50 ], chr: [ 0, 5, 30 ] },
		draegen: { str: [ 5, 15, 135 ], wis: [ 10, 20, 150 ], dex: [ 5, 20, 65 ], end: [ 5, 20, 80 ], luck: [ 0, 5, 60 ], chr: [ 0, 5, 40 ] }
	};

function randRange(a, b) {
	var res = -1;
	while (res < a) {
		res = Math.round(Math.random()*b);
	}
	return res;
}

function rollStats(race) {
	return [
		randRange(raceStats[race].str[0], raceStats[race].str[1]), // str
		randRange(raceStats[race].wis[0], raceStats[race].wis[1]), // wis
		randRange(raceStats[race].dex[0], raceStats[race].dex[1]), // dex
		randRange(raceStats[race].end[0], raceStats[race].end[1]), // end
		randRange(raceStats[race].luck[0], raceStats[race].luck[1]), // luck
		randRange(raceStats[race].chr[0], raceStats[race].chr[1]) // charisma
	];
}

function createCharacter(nick, name, race, gender) {
	// error check before this. will overwrite if the character exists.
	var stats = rollStats(race),
		char = {
			name: name,
			race: race,
			gender: gender,
			str: stats[0],
			wis: stats[1],
			dex: stats[2],
			end: stats[3],
			luck: stats[4],
			chr: stats[5]
		};
	fluffyChars.saveOne(nick.toLowerCase(), char);
	return char;
}

function getHP(char) {
	return Math.round((char.str+char.end)*0.75);
}

function getMP(char) {
	return Math.round(char.wis*1.5);
}

function statLine(char) {
	return char.name+": STR:"+char.str+" DEX:"+char.dex+" WIS:"+char.wis+" END:"+char.end+" LCK:"+char.luck+" CHR:"+char.chr+" (HP/MP Max: "+getHP(char)+" / "+getMP(char)+")";
}

cmdListen({
	command: "fluffy",
	help: "Fluffy RPG stuff. This wont make sense.",
	syntax: "TBD",
	callback: function (input) {
		var char, reg;
		if (!input.args) {
			irc.say(input.context, "Derp.");
			return;
		}
		switch (input.args[0]) {
			case "stats":
				char = fluffyChars.getOne(input.nick.toLowerCase());
				irc.say(input.context, statLine(char));
				break;
			case "genchar":
				reg = /([a-zA-Z]+) (human|dwarf|woodelf|wood elf|demon|orc|draegen) (male|female)/i.exec(input.args.slice(1).join(" "));
				if (!reg) {
					irc.say(input.context, "Nope.");
					return;
				}
				char = createCharacter(input.nick, reg[1], (reg[2].match(/wood elf/i) ? "woodelf" : reg[2].toLowerCase()), reg[3].toLowerCase());
				irc.say(input.context, "Done!");
				irc.say(input.context, statLine(char));
				break;
			default:
				break;
		}
	}
});














