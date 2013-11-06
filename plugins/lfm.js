var ent = require('./lib/entities.js'),
	lfmBindingsDB = new DB.Json({filename: "lfm"});

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

// Last.fm
cmdListen({
	command: "lfm",
	help: "Get's your last played track. Use -bind to bind your nick to your lfm account, "+
		"allowing you to not have to supply an account name. Else just supply your account name.",
	syntax: config.command_prefix+"lfm [-bind / -prev / -top / -artist] [<account>|<artist>] - Example: "+
		config.command_prefix+"lfm plonk420",
	callback: function (input) {
		var uri, user, i, method, artist, track, formed, summary,
			result, keys, ret, song, then, now, tags, from,
			max, tn = 0;
		
		if (config.api.lfm.length < 1) {
			irc.say(input.context, "I.. I don't have a lastfm api key. ;<");
			logger.warn("No lfm API key.");
			return;
		}
		
		if (input.args && input.args[0]) {
			switch (input.args[0]) {
			case "-a":
			case "-artist":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"lfm -a <artist> - Example: "+config.command_prefix+
						"lfm -a Rebecca Black");
					return;
				}
				uri = "http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist="+input.args.slice(1).join(" ")+
					"&api_key="+config.api.lfm+"&format=json";
				web.get(uri, function (error, response, body) {
					result = JSON.parse(body);
					if (result.error) {
						irc.say(input.context, result.message+" (Code: "+result.error+"). Pantsu.");
						return;
					}
					formed = (result.artist.bio.yearformed ? ", formed in "+result.artist.bio.yearformed : "");
					from = (result.artist.bio.placeformed ? ", from "+result.artist.bio.placeformed : "");
					tags = [];
					if (result.artist.tags.tag) {
						result.artist.tags.tag.forEach(function (tag) {
							tags.push(tag.name);
						});
					}
					tags = (tags.length > 0 ? " ~ ["+tags.join(", ")+"]" : "");
					irc.say(input.context,"Artist: "+result.artist.name+formed+from+tags+
						" ~ Total Plays: "+result.artist.stats.playcount+
						", Listeners: "+result.artist.stats.listeners);
					summary = ent.decode(lib.stripHtml(result.artist.bio.summary));
					summary = (summary.length > 0 ? summary : "There was no artist summary. Did you spell it correctly?");
					irc.say(input.context, summary, true, 1);
				});
				return;
			case "-bind":
				if (input.args[1]) {
					lfmBindingsDB.saveOne(input.nick, input.args[1]);
					irc.say(input.context, "At your service :)");
				} else {
					irc.say(input.context, "What am I binding?");
				}
				return;
			case "-top":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"lfm -top <artists/tracks>");
					return;
				}
				if (input.args[1] === "artists" || input.args[1] === "tracks") {
					method = (input.args[1] === "tracks" ? "chart.gettoptracks" : "chart.gettopartists");
					uri = "http://ws.audioscrobbler.com/2.0/?method="+method+"&api_key="+config.api.lfm+"&limit=5&format=json";
					web.get(uri, function (error, response, body) {
						result = JSON.parse(body);
						ret = [];
						if (input.args[1] === "artists") {
							keys = Object.keys(result.artists.artist);
							for (i = 0; i < keys.length; i++) {
								artist = result.artists.artist[i];
								ret.push("#"+(i+1)+" "+artist.name+" (Playcount: "+artist.playcount+")");
							}
						} else {
							keys = Object.keys(result.tracks.track);
							for (i = 0; i < keys.length; i++) {
								track = result.tracks.track[i];
								ret.push("#"+(i+1)+" "+track.artist.name+" ~ "+track.name+" (Playcount: "+track.playcount+")");
							}
						}
						irc.say(input.context, ret.join(", "));
					});
					return;
				}
				// assume we've gone ;lfm -top <artist name>
				artist = input.args.slice(1).join(" ");
				uri = "http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist="+artist+
					"&api_key="+config.api.lfm+"&limit=5&format=json";
				web.get(uri, function (error, response, body) {
					result = JSON.parse(body);
					if (result.error) {
						irc.say(input.context, result.message+" (Code: "+result.error+"). Pantsu.");
						return;
					}
					keys = Object.keys(result.toptracks.track);
					ret = [];
					for (i = 0; i < keys.length; i++) {
						track = result.toptracks.track[i];
						ret.push("#"+(i+1)+" "+track.artist.name+" ~ "+track.name+" (Playcount: "+track.playcount+")");
					}
					irc.say(input.context, ret.join(", "));
				});
				return;
			case "-prev":
				tn = 1;
			default:
				user = (tn === 0 ? input.data : (input.args[1] || lfmBindingsDB.getOne(input.nick)));
				break;
			}
		} else {
			user = lfmBindingsDB.getOne(input.nick);
		}
		if (!user) {
			irc.say(input.context, "You're not bound! See ;help lfm");
			return;
		}
		uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user="+user+
			"&api_key="+config.api.lfm+"&format=json";
		web.get(uri, function (error, response, body) {
			result = JSON.parse(body);
			if (result.error || !result.recenttracks.track) {
				irc.say(input.context, "No track found.");
				return;
			}
			song = {};
			song.artist = result.recenttracks.track[tn].artist["#text"];
			song.track = result.recenttracks.track[tn].name;
			song.tense = " listened to ";
			if (result.recenttracks.track[tn].date)	{
				then = new Date(parseInt(result.recenttracks.track[tn].date.uts)*1000);
				now = new Date().valueOf();
				song.date = timeAgo(then, now);
			}
			else if (result.recenttracks.track[tn]['@attr'] && result.recenttracks.track[tn]['@attr'].nowplaying) {
				song.date = "right now";
				song.tense = " is listening to ";
			}
			uri = "http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username="+user+
				"&api_key="+config.api.lfm+"&artist="+song.artist+"&track="+song.track+"&format=json";
			web.get(uri, function (error, response, body) {
				result = JSON.parse(body);
				if (result.error) {
					irc.say(input.context, user+song.tense+"\""+song.artist+" ~ "+song.track+"\" "+song.date);
					irc.say(input.context, "lastfm couldn't find detailed track info - \""+result.message+
						"\" (Code: "+result.error+"). Pantsu.");
					return;
				}
				song.userplays = (result.track.userplaycount ? " - User Plays: "+result.track.userplaycount : "");
				song.playcount = result.track.playcount;
				song.listeners = result.track.listeners;
				song.duration = dura(result.track.duration);
				uri = "http://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist="+song.artist+
					"&api_key="+config.api.lfm+"&format=json";
				web.get(uri, function (error, response, body) {
					result = JSON.parse(body);
					song.tags = [];
					if (result.toptags.tag) {
						if (Array.isArray(result.toptags.tag)) {
							keys = Object.keys(result.toptags.tag);
							max = (keys.length < 3 ? keys.length : 3);
							for (i = 0; i < max; i++) {
								song.tags.push(result.toptags.tag[i].name);
							}
						} else if (result.toptags.tag.name) {
							song.tags.push(result.toptags.tag.name);
						}
					} else {
						song.tags.push("No tags found");
					}
					irc.say(input.context, user+song.tense+"\""+song.artist+" ~ "+song.track+
						"\" ["+song.tags.join(", ")+"] ("+song.duration+") ~ "+song.date+song.userplays+
						" - Total Plays: "+song.playcount+" - Current Listeners: "+song.listeners);
				});
			});
		});
	}
});

