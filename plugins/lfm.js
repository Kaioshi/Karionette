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
			var uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + user + "&api_key=" + config.api.lfm + "&format=json";
			web.get(uri, function (error, response, body) {
				var result = JSON.parse(body);
				//globals.lastLFMResult = result;
				if (!result.error && result.recenttracks.track) {
					var song = {};
					song.artist = result.recenttracks.track[tn].artist["#text"];
					song.track = result.recenttracks.track[tn].name;
					if (result.recenttracks.track[tn].date)	song.date = lib.duration(new Date(result.recenttracks.track[tn].date["#text"])).split(',')[0] + " ago";
					else if (result.recenttracks.track[tn]['@attr'] && result.recenttracks.track[tn]['@attr'].nowplaying) {
						song.date = "right now";
					}
					uri = "http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username="+user+"&api_key="+config.api.lfm+"&artist="+song.artist+"&track="+song.track+"&format=json";
					web.get(uri, function (error, response, body) {
						var result = JSON.parse(body);
						//globals.lastGTI = result;
						song.userplays = result.track.userplaycount;
						song.playcount = result.track.playcount;
						song.listeners = result.track.listeners;
						song.duration = dura(result.track.duration);
						// http://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=cher&api_key=2dc440a6a2d4373c875f25a15c69bd8d&format=json
						uri = "http://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist="+song.artist+"&api_key="+config.api.lfm+"&format=json";
						web.get(uri, function (error, response, body) {
							var result = JSON.parse(body);
							//globals.lastATI = result;
							song.tags = [];
							if (Array.isArray(result.toptags.tag)) {
								var keys = Object.keys(result.toptags.tag),
									max = (keys.length < 3 ? keys.length : 3);
								for (var i = 0; i < max; i++) {
									song.tags.push(result.toptags.tag[i].name);
								}
							} else if (result.toptags.tag.name) {
								song.tags.push(result.toptags.tag.name);
							} else {
								song.tags.push("No tags found");
							}
							irc.say(input.context, user + " listened to \"" + song.artist+" ~ "+song.track+"\" ["+song.tags.join(", ")+"] ("+song.duration+") ~ "+song.date+" - User Plays: "+song.userplays+" - Total Plays: "+song.playcount+" - Current Listeners: "+song.listeners);
						});
					});
				} else {
					logger.error(result.error);
				}
			});
			
			function dura(ms) {
				var secs = Math.floor(ms/1000),
					mins = Math.floor(secs/60),
					hours = Math.floor(mins/60),
					ret = [];
				secs = (secs % 60);
				mins = (mins % 60);
				hours = (hours % 24);
				if (hours) ret.push(hours);
				if (mins) ret.push(mins);
				ret.push((secs > 9 ? secs : "0"+secs));
				return ret.join(":");
				
			}
		} else {
			irc.say(input.context, "You're not bound! See ;help lfm");
		}
	}
});

