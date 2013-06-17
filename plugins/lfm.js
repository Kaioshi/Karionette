var lfmBindingsDB = new jsonDB("lfm");

// Last.fm
listen({
	handle: "lfm",
	regex: regexFactory.startsWith("lfm"),
	command: {
		root: "lfm",
		options: "-bind",
		help: "Get's your last played track. Use -bind to bind your nick to your lfm account, allowing you to not have to supply an account name. Else just supply your account name."
	},
	callback: function (input) {
		var result, uri, boundName,
			args = input.match[1].split(" ");

		if (args[0]) {
			switch (args[0]) {
			case "-bind":
				if (args[1]) {
					lfmBindingsDB.store(input.from, args[1]);
					irc.say(input.context, "At your service :)");
				} else {
					irc.say(input.context, "What am I binding?");
				}
				break;
			default:
				uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + input.match[1] + "&api_key=f3544338f77b206c89b4bc9aab1e2a60&format=json";
				break;
			}
		} else {
			boundName = lfmBindingsDB.getOne(input.from);
			if (boundName) {
				uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + boundName + "&api_key=f3544338f77b206c89b4bc9aab1e2a60&format=json";
			} else {
				irc.say(input.context, "What do you mean? :(");
			}
		}

		if (uri) {
			web.get(uri, function (error, response, body) {
				result = JSON.parse(body).recenttracks;
				if (result.track[0]) {
					irc.say(input.context, result.track[0].artist["#text"] + " ~ " + result.track[0].name, false);
				} else {
					irc.say(input.context, "Pantsu.", false);
				}
			});
		}
	}
});