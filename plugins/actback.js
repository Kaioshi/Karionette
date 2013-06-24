var randDB = new DB.List({filename: "randomThings"}),
	repliesDB = new DB.Json({filename: "actback/replies"});

function isObj(string) {
	var nonObjs = [
			"a",
			"an",
			"the",
			"some",
			"one",
			"loads",
			"of",
			"Mari",
			"Marionette",
			"Marionette's",
			"Mari's",
			"all",
			"his",
			"her"
		];

	return nonObjs.some(function (element) {
		return (element.toUpperCase() === string.toUpperCase());
	});
}

function transformObj(args, num) {
	while (isObj(args[num])) {
		num += 1;
	}
	return args[num];
}

listen({
	handle: "actback",
	regex: regexFactory.actionMatching(config.nickname),
	callback: function (input) {
		var randThings = randDB.getAll(),
			randReplies = repliesDB.getAll(),
			randReply,
			args = input.match[0].split(" "),
			verb = args[1],
			singVerb = verb,
			obj = transformObj(args, 2),
			rNum = Math.floor(Math.random() * 100),
			randThing = randThings[Math.floor(Math.random() * randThings.length)],
			method = (rNum > 50 ? "say" : "action");

		if (verb.slice(-2) === "ly") { verb += " " + args[2]; }
		if (verb[verb.length - 1] === "s") { singVerb = verb.slice(0, -1); }

		var suppVars = {
			"{from}": input.from,
			"{context}": input.context,
			"{randThing}": randThing,
			"{verb}": verb,
			"{singVerb}": singVerb,
			"{obj}": obj
		};

		setTimeout(function () {
			if (!randReplies[verb] && !randReplies.alts[verb]) {
				randReply = randReplies.defa[method][Math.floor(Math.random() * randReplies.defa[method].length)];
				irc[method](input.context, lib.supplant(randReply, suppVars));
			} else {
				if (randReplies.alts[verb]) {
					verb = randReplies.alts[verb];
				}
				randReply = randReplies[verb][method][Math.floor(Math.random() * randReplies[verb][method].length)];
				irc[method](input.context, lib.supplant(randReply, suppVars));
			}
		}, 3000);
	}
});