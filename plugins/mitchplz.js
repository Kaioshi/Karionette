listen({
	plugin: "mitchplz",
	handle: "mitchplz",
	regex: /^:mitch_![^ ]+ PRIVMSG #[^ ]+ :(.*)$/,
	callback: function (input, match) {
		var args = match[1].split(" "),
			gfresp = [
				"<mitch_> GURLFRIENNN",
				"GURLFRIENNN"
			],
			implyingresp = [
				"wanker.",
				"you're so cool!",
				">hurr"
			];
		switch (args[0]) {
			case "gf":
				setTimeout(function () {
					gfresp = gfresp[Math.floor(Math.random()*gfresp.length)];
					irc.say(input.context, gfresp);
				}, Math.floor(Math.random()*5000));
				break;
			case ">implying":
				setTimeout(function () {
					implyingresp = implyingresp[Math.floor(Math.random()*implyingresp.length)];
					irc.reply(input, implyingresp);
				}, Math.floor(Math.random()*5000));
				break;
			default:
				break;
		}
	}
});
