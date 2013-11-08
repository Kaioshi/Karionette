// Mitchu harrassment 2013
// this was ranma's idea.
function timeOfDay() {
	var time = parseInt(new Date().toTimeString().slice(0,2));
	if (time >= 06 && time <= 11) return "morning";
	if (time >= 11 && time <= 14) return "day";
	if (time >= 14 && time <= 17) return "afternoon";
	if (time >= 17 && time <= 12) return "evening";
	if (time >= 0 && time <= 06) return "evening";
	return "SOME TIME OF THE DAY";
}

function mitch() {
	return lib.randSelect([
		"mitch_",
		">mitch_",
		"moitch",
		"moitch_",
		"mitches",
		"mitch",
		"mitchelle",
		"Mitchy mitch",
		"Sir Mitchalot",
		"MITCHES",
		"meetch",
		"bitch_",
		"Mitchel",
		"mitchplz"
	]);
}

function nickHnng() {
	return lib.randSelect([
		">mitch_",
		">"+mitch(),
		"wb",
		"wb "+mitch(),
		"sleep well?",
		"WASSUP MITCHES",
		"So you're the mitch_ that told the bitch that I'm a mitch, well listen mitch_ it takes a mitch to know a mitch, bitch_.",
		"mitches be like \""+lib.randSelect([ "lel", ">implying", "nou", "ALL CAPS", "<\x02meme\x02>" ])+"\"",
		"run!",
		"ohay "+mitch(),
		"o/ "+mitch(),
		"/o\\ "+mitch(),
		"sup",
		"mitchplz",
		"o7",
		"good "+timeOfDay()+" "+mitch(),
		"_hctim<",
		"lel",
		genericReply()
	]);
}

function genericReply() {
	return lib.randSelect([
		mitch()+" "+words.verb.random().s+" the "+words.noun.random(),
		">"+mitch()
	]);
}

evListen({
	handle: "mitchnickplz",
	event: "NICK",
	regex: /^:mitch_offline![^ ]+ NICK :mitch_$/i,
	callback: function (input) {
		if (!lib.chance(40)) return;
		setTimeout(function () {
			irc.say(lib.randSelect(ial.Channels("mitch_")), nickHnng());
		}, lib.randNum(1000, 7000));
	}
});

function goanGetMitched(input) {
	var targets, args = input.match[1].split(" ");
	switch (args[0]) {
	case ">inb4":
	case "inb4":
		if (!lib.chance(50)) return;
		setTimeout(function () {
			irc.say(input.context, lib.randSelect([
				"inb4 "+mitch()+"'s balls drop~",
				"inb4 <"+mitch()+"> "+lib.randSelect([ "kek", "lel", "inb5", ">implying", "ily Smithy" ]),
				"in B4.. ha, sunk your battle ship!",
				"inb4 it's a porno",
				"so cool",
				"how did you know?! WAS IT MAGIC? IS THIS REAL?!?!",
				">inb4",
				"inafter "+args.slice(1).join(" "),
				"ranma: dat mitch -.-",
				"Asuna: inb4 what?",
				"mmm.. yeah just like that..",
				"ranma: we're going to need more "+lib.randSelect([ "lube", "pineapples", "cucumbers", "mitches", "pantsu" ])
			]));
		}, lib.randNum(2000, 7000));
		break;
	case ">kek":
	case "kek":
		if (!lib.chance(50)) return;
		setTimeout(function () {
			irc.action(input.context, lib.randSelect([
				"kekekekes all over "+mitch(),
				"keks "+mitch()+" in the balls",
				"rides a My Little Pony named Kek into "+mitch(),
				"flips "+mitch(),
				"gives "+mitch()+" \"the snip\" for the benefit of mankind",
				"confiscates mitch's K and E keys.",
				"slaps "+mitch(),
				"yawns in mitch_'s face",
				"lubes up ranma",
				"slowly eats a banana.",
				"mitches all day"
			]));
		}, lib.randNum(2000, 7000));
		break;
	case ">lel":
	case "lel":
		if (!lib.chance(50)) return;
		targets = [
			"backside",
			"forehead",
			"face",
			"left buttock",
			"right buttock",
			"butt",
			"_"
		];
		setTimeout(function () {
			irc.action(input.context, lib.randSelect([
				"draws a better moustache over "+mitch()+"'s upper lip fluff",
				"flips "+mitch(),
				"kicks mitch_ in the ball",
				"tattoos \"lel\" on mitch_'s "+lib.randSelect(targets),
				"bitchslaps "+mitch(),
				"mitchslaps "+mitch(),
				"lels mitch_'s "+lib.randSelect(targets)
			]));
		}, lib.randNum(2000, 7000));
		break;
	case ":>":
		if (!lib.chance(50)) return;
		setTimeout(function () {
			irc.say(input.context, lib.randSelect([
				":D",
				":-D",
				"D-:",
				"mitches be like \":>\"",
				":<",
				">:D",
				genericReply()
			]));
		}, lib.randNum(800, 2000));
		break;
	case ":<":
		if (!lib.chance(50)) return;
		setTimeout(function () {
			irc.say(input.context, lib.randSelect([
				"mitch_: there there.",
				":>",
				">:)",
				":<<",
				"mitch_: it'll be ok."
			]));
		}, lib.randNum(800, 2000));
		break;
	case "gf":
		if (!lib.chance(80)) return;
		setTimeout(function () {
			irc.say(input.context, lib.randSelect([
				"mitch_: GURLFRIENNN",
				"mitch_: ohaay",
				"GURLFRIENNN"
			]));
		}, lib.randNum(1200, 5000));
		break;
	case ">":
	case ">implying":
		if (!lib.chance(70)) return;
		setTimeout(function () {
			irc.say(input.context, lib.randSelect([
				"mitch_: nou",
				"lel >mitch_",
				"mitch_: you're so cool!",
				"mitch_: have my babies.",
				"mitch_: I like your shoes",
				">mitch_",
				">mitchplz",
				"mitch_: starr fappin' across the universe",
				"mitch_: >hurr",
				genericReply()
			]));
		}, lib.randNum(2500, 5000));
		break;
	default:
		if (input.match[1].length >= 10 && input.match[1].toUpperCase() === input.match[1]) {
			setTimeout(function () {
				irc.say(input.context, lib.randSelect([
					"so angry",
					":O",
					"mitch_: Keiran? is that you?",
					"mitch_: pantsu.",
					"mitch_: calm down",
					"mitch_: go to your happy place.",
					"mitch_: go to your fappy place.",
					"stahp",
					"calm yourself!",
					"shh",
					"SHH",
					"douche'",
					"mitch_: touch it",
					"some of us are trying to SLEEP"
				]));
			}, lib.randNum(3000, 5000));
		} else {
			if (input.match[1].indexOf("\x02") > -1) {
				if (!lib.chance(70)) return;
				setTimeout(function () {
					irc.say(input.context, lib.randSelect([
						"\x02so cool",
						"\x02so bold",
						"\x02so\x02 cool",
						"\x02so\x02 bold",
						"\x02look I can bold!",
						"\x02pay attention to me",
						"\x02pay attention to me\x02! ;~;",
						"\x02meeeeeee\x02 ;~;",
						"I feel \x02important\x02!",
						"this was \x02never\x02 funny",
						"mitches be \x02trippin\x02'",
						">mitch\x02plz\x02_",
						">\x02mitch_",
						">\x02"+mitch()
					]));
				}, lib.randNum(2000, 5000));
			}
		}
		break;
	}
}

evListen({
	handle: "mitchplz",
	event: "PRIVMSG",
	regex: /^:mitch_![^ ]+ PRIVMSG #[^ ]+ :(.*)$/,
	callback: function (input) {
		goanGetMitched(input);
	}
});

