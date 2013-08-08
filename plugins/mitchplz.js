// Mitchu harrassment 2013

function randSelect(yarr) {
	return yarr[Math.floor(Math.random()*yarr.length)];
}

function rDelay(n) {
	return Math.floor(Math.random() * (n ? n : 5000));
}

function chance(n) {
	if (Math.floor(Math.random()*100) >= n) return true;
}

listen({
	plugin: "mitchplz",
	handle: "mitchplz",
	regex: /^:mitch_![^ ]+ PRIVMSG #[^ ]+ :(.*)$/,
	callback: function (input, match) {
		var targets, args = match[1].split(" ");
		switch (args[0]) {
			case ">lel":
			case "lel":
				if (!chance(50)) return;
				targets = [
					"backside",
					"forehead",
					"entire face",
					"left buttock",
					"right buttock",
					"butt"
				];
				setTimeout(function () {
					irc.action(input.context, randSelect([
						"draws a better moustache over mitch_'s upper lip fluff",
						"flips mitch_",
						"kicks mitch_ in the ball",
						"tattoos \"lel\" on mitch_'s "+randSelect(targets),
						"bitchslaps mitch_",
						"mitchslaps mitch_",
						"lels mitch_'s "+randSelect(targets)
					]));
				}, rDelay(7000));
				break;
			case ":>":
			case ":<":
				if (!chance(50)) return;
				setTimeout(function () {
					irc.say(input.context, randSelect([
						"mitch_: there there.",
						":>",
						">:)",
						":<<",
						"mitch_: it'll be ok."
					]));
				}, rDelay(2000));
				break;
			case "gf":
				if (!chance(20)) return;
				setTimeout(function () {
					irc.say(input.context, randSelect([
						"mitch_: GURLFRIENNN",
						"mitch_: ohaay",
						"GURLFRIENNN"
					]));
				}, rDelay());
				break;
			case ">":
			case ">implying":
				if (!chance(30)) return;
				setTimeout(function () {
					irc.say(input.context, randSelect([
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
						irc.say(input.context, randSelect([
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
						if (!chance(30)) return;
						setTimeout(function () {
							irc.say(input.context, randSelect([
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

