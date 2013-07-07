var lfmBindingsDB = new DB.Json({filename: "lfm"});

// Last.fm
listen({
	plugin: "lfm",
	handle: "lfm",
	regex: regexFactory.startsWith("lfm"),
	command: {
		root: "lfm",
		options: "-bind",
		help: "Get's your last played track. Use -bind to bind your nick to your lfm account, allowing you to not have to supply an account name. Else just supply your account name."
	},
	callback: function (input, match) {
		var uri, user,
			args = match[1].split(" "),
			tn = 0;
		
		if (config.api.lfm.length < 1) {
			logger.warn("No lfm API key.");
		}
		
		if (args[0]) {
			switch (args[0]) {
			case "-bind":
				if (args[1]) {
					lfmBindingsDB.saveOne(input.from, args[1]);
					irc.say(input.context, "At your service :)");
				} else {
					irc.say(input.context, "What am I binding?");
				}
				return;
				break;
			case "-prev":
				tn = 1;
			default:
				user = (tn === 0 ? match[1]
					: (args[1] || lfmBindingsDB.getOne(input.from)));
				break;
			}
		} else {
			user = lfmBindingsDB.getOne(input.from);
			if (!user) user = input.from;
		}
		
		if (user) {
			uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + user + "&api_key=" + config.api.lfm + "&format=json";
			web.get(uri, function (error, response, body) {
				var track,
					result = JSON.parse(body);
				if (!result.error && result.recenttracks.track) {
					track = result.recenttracks.track[tn];
					irc.say(input.context, user + ": " + track.artist["#text"] + " ~ " + track.name, false);
				} else {
					if (result.error && result.message) {
						irc.say(input.context, "Couldn't look up " + user + "'s track information: "+result.message+" (code: "+result.error+"). Pantsu.");
					} else {
						irc.say(input.context, "Pantsu.", false);
					}
				}
			});
		} else {
			irc.say(input.context, "You're not bound! See ;help lfm");
		}
	}
});

