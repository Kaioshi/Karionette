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

listen({
	plugin: "mitchplz",
	handle: "mitchnickplz",
	regex: /^:mitch_offline![^ ]+ NICK :mitch_$/i,
	callback: function (input, match) {
		if (!lib.chance(40)) return;
		setTimeout(function () {
			irc.say(lib.randSelect(ial.Channels("mitch_")), lib.randSelect([
				">mitch_",
				"wb",
				"sleep well?",
				"WASSUP MITCHES",
				"So you're the mitch_ that told the bitch that I'm a mitch, well listen mitch_ it takes a mitch to know a mitch, bitch_.",
				"mitches be like \""+lib.randSelect([ "lel", ">implying", "nou", "ALL CAPS", "<\x02meme\x02>" ])+"\"",
				"run!",
				"ohay mitch",
				"o/ mitch_",
				"/o\\ mitch_",
				"moitch",
				"sup",
				"mitchplz",
				"o7",
				"good "+timeOfDay()+" "+lib.randSelect([ "Mitchel", "moitch_", "mitch_", "Sir Mitchalot", "mitches" ]),
				"_hctim<",
				"lel"
			]));
		}, lib.randNum(3000, 7000));
	}
});

listen({
	plugin: "mitchplz",
	handle: "mitchplz",
	regex: /^:mitch_![^ ]+ PRIVMSG #[^ ]+ :(.*)$/,
	callback: function (input, match) {
		var targets, args = match[1].split(" ");
		switch (args[0]) {
			case ">lel":
			case "lel":
				if (!lib.chance(50)) return;
				targets = [
					"backside",
					"forehead",
					"entire face",
					"left buttock",
					"right buttock",
					"butt"
				];
				setTimeout(function () {
					irc.action(input.context, lib.randSelect([
						"draws a better moustache over mitch_'s upper lip fluff",
						"flips mitch_",
						"kicks mitch_ in the ball",
						"tattoos \"lel\" on mitch_'s "+lib.randSelect(targets),
						"bitchslaps mitch_",
						"mitchslaps mitch_",
						"lels mitch_'s "+lib.randSelect(targets)
					]));
				}, lib.randNum(2000, 7000));
				break;
			case ":>":
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
						"mitch_: >hurr"
					]));
				}, lib.randNum(2500, 5000));
				break;
			default:
				if (match[1].length >= 10 && match[1].toUpperCase() === match[1]) {
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
					if (match[1].indexOf("\x02") > -1) {
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
								">\x02mitch_"
							]));
						}, lib.randNum(2000, 5000));
					}
				}
				break;
		}
	}
});

