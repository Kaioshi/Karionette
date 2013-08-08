// Mitchu harrassment 2013

function randReply(yarr) {
	return yarr[Math.floor(Math.random()*yarr.length)];
}

listen({
	plugin: "mitchplz",
	handle: "mitchplz",
	regex: /^:mitch_![^ ]+ PRIVMSG #[^ ]+ :(.*)$/,
	callback: function (input, match) {
		var gfresp, implyingresp, lelresp,
			args = match[1].split(" ");
		switch (args[0]) {
			case ">lel":
			case "lel":
				lelresp = [
					">lel",
					">mitch_",
					"bitchslaps mitch_",
					"mitchslaps mitch_",
					"inflicts mitch_ upon himself.",
					"lels mitch_'s backside."
				];
				setTimeout(function () {
					irc.action(input.context, randReply(lelresp));
				}, Math.floor(Math.random()*5000));
				break;
			case "gf":
				gfresp = [
					"<mitch_> GURLFRIENNN",
					"GURLFRIENNN"
				];
				setTimeout(function () {
					irc.say(input.context, randReply(gfresp));
				}, Math.floor(Math.random()*5000));
				break;
			case ">implying":
				implyingresp = [
					"wanker.",
					"you're so cool!",
					">hurr"
				];
				setTimeout(function () {
					irc.reply(input, randReply(implyingresp));
				}, Math.floor(Math.random()*5000));
				break;
			default:
				break;
		}
	}
});
