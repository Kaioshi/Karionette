var lfmBindingsDB = new DB.Json({filename: "lfm"});

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
		var uri, user,
			args = input.match[1].split(" "),
			tn = 0;
		
		if (config.api.lfm.length < 1) {
			console.log("[WARNING] No lfm API key");
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
				user = (tn === 0 ? input.match[1] 
					: (args[1] || lfmBindingsDB.getOne(input.from)));
				break;
			}
		} else {
			user = lfmBindingsDB.getOne(input.from);
		}
		
		if (user) {
			uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + user + "&api_key=" + config.api.lfm + "&format=json";
			web.get(uri, function (error, response, body) {
				var track,
					result = JSON.parse(body);
				if (!result.error && result.recenttracks.track) {
					track = result.recenttracks.track[tn];
					irc.say(input.context, track.artist["#text"] + " ~ " + track.name, false);
				} else {
					irc.say(input.context, "Pantsu.", false);
				}
			});
		} else {
			irc.say(input.context, "You're not bound! See ;help lfm");
		}
	}
});