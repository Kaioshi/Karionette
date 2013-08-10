// Mitchu harrassment 2013
// this was ranma's idea.

function rDelay(n) {
	return Math.floor(Math.random() * (n ? n : 5000));
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
				"So you're the mitch that told the bitch that I'm a mitch, well listen bitch it takes a mitch to know a mitch, bitch.",
				"mitches be like \""+lib.randSelect([ "lel", ">implying", "nou", "ALL CAPS" ])+"\"",
				"run!",
				"ohay mitch",
				"o/ mitch_",
				"sup",
				"mitchplz",
				"o7",
				"-.-"
			]));
		}, rDelay());
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
				}, rDelay(7000));
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
				}, rDelay(2000));
				break;
			case "gf":
				if (!lib.chance(20)) return;
				setTimeout(function () {
					irc.say(input.context, lib.randSelect([
						"mitch_: GURLFRIENNN",
						"mitch_: ohaay",
						"GURLFRIENNN"
					]));
				}, rDelay());
				break;
			case ">":
			case ">implying":
				if (!lib.chance(30)) return;
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
				}, rDelay());
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
					}, rDelay());
				} else {
					if (match[1][0] === "\x02") {
						if (!lib.chance(30)) return;
						setTimeout(function () {
							irc.say(input.context, lib.randSelect([
								"\x02so cool",
								"\x02so bold",
								"\x02so\x02 cool",
								"\x02so\x02 bold",
								"\x02look I can bold!",
								"\x02pay attention to me",
								"I feel \x02important\x02!",
								"this was \x02never\x02 funny",
								">\x02mitch_"
							]));
						}, rDelay());
					}
				}
				break;
		}
	}
});

