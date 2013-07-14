var lfmBindingsDB = new DB.Json({filename: "lfm"});

// Last.fm
listen({
	plugin: "lfm",
	handle: "lfm",
	regex: regexFactory.startsWith("lfm"),
	command: {
		root: "lfm",
		options: "-bind -prev -top",
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
			case "-top":
				if (!args[1]) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"lfm -top <artists/tracks>");
					return;
				}
				if (args[1] === "artists" || args[1] === "tracks") {
					var method = (args[1] === "tracks" ? "chart.gettoptracks" : "chart.gettopartists");
					// show the top 5
					var uri = "http://ws.audioscrobbler.com/2.0/?method="+method+"&api_key="+config.api.lfm+"&limit=5&format=json";
					web.get(uri, function (error, response, body) {
						var result = JSON.parse(body), ret = [];
						if (args[1] === "artists") {
							keys = Object.keys(result.artists.artist);
							for (var i = 0; i < keys.length; i++) {
								var artist = result.artists.artist[i];
								ret.push("#"+(i+1)+" "+artist.name+" (Playcount: "+artist.playcount+")");
							}
						} else {
							keys = Object.keys(result.tracks.track);
							for (var i = 0; i < keys.length; i++) {
								var track = result.tracks.track[i];
								ret.push("#"+(i+1)+" "+track.artist.name+" ~ "+track.name+" (Playcount: "+track.playcount+")");
							}
						}
						irc.say(input.context, ret.join(", "));
					});
					return;
				}
				// assume we've gone ;lfm -top <artist name>
				var artist = args.slice(1).join(" "),
					uri = "http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist="+artist+"&api_key="+config.api.lfm+"&limit=5&format=json";
				web.get(uri, function (error, response, body) {
					var result = JSON.parse(body);
					if (result.error) {
						irc.say(input.context, result.message+" (Code: "+result.error+"). Pantsu.");
						return;
					}
					var keys = Object.keys(result.toptracks.track),
						ret = [];
					for (var i = 0; i < keys.length; i++) {
						var track = result.toptracks.track[i];
						ret.push("#"+(i+1)+" "+track.artist.name+" ~ "+track.name+" (Playcount: "+track.playcount+")");
					}
					irc.say(input.context, ret.join(", "));
				});
				return;
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
					song.tense = " listened to ";
					if (result.recenttracks.track[tn].date)	{
						var then = new Date(parseInt(result.recenttracks.track[tn].date.uts)*1000),
							now = new Date().valueOf();
						song.date = timeAgo(then, now);
					}
					else if (result.recenttracks.track[tn]['@attr'] && result.recenttracks.track[tn]['@attr'].nowplaying) {
						song.date = "right now";
						song.tense = " is listening to ";
					}
					uri = "http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username="+user+"&api_key="+config.api.lfm+"&artist="+song.artist+"&track="+song.track+"&format=json";
					web.get(uri, function (error, response, body) {
						var result = JSON.parse(body);
						//globals.lastGTI = result;
						song.userplays = result.track.userplaycount;
						song.playcount = result.track.playcount;
						song.listeners = result.track.listeners;
						song.duration = dura(result.track.duration);
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
							irc.say(input.context, user+song.tense+"\""+song.artist+" ~ "+song.track+"\" ["+song.tags.join(", ")+"] ("+song.duration+") ~ "+song.date+" - User Plays: "+song.userplays+" - Total Plays: "+song.playcount+" - Current Listeners: "+song.listeners);
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
			
			function timeAgo(then, now) {
				var dura = now - then,
					secs = Math.floor(dura/1000),
					mins = Math.floor(secs/60),
					hours = Math.floor(mins/60),
					days = Math.floor(hours/24),
					years = Math.floor(days/365.25);
				secs = (secs % 60);
				mins = (mins % 60);
				hours = (hours % 24);
				days %= 365.25;
				if (years) return years + " years ago";
				if (days) return days + " days ago";
				if (hours) return hours + " hours ago";
				if (mins) return mins + " minutes ago";
				return secs + " seconds ago";
			}
		} else {
			irc.say(input.context, "You're not bound! See ;help lfm");
		}
	}
});

