// youtubes!
function zero(n) {
	return (n > 9 ? n : "0" + n);
}

function dura(secs) {
	var mins = Math.floor(secs/60),
		hours = Math.floor(mins/60),
		ret = [];
	secs = (secs % 60);
	mins = (mins % 60);
	hours = (hours % 24);
	if (hours) ret.push(zero(hours));
	if (mins) ret.push(zero(mins));
	ret.push(zero(secs));
	return ret.join(":");
}


cmdListen({
	command: [ "yt", "youtube", "y" ],
	help: "Searches youtube!",
	syntax: config.command_prefix + "yt <search terms> - Example: "+config.command_prefix+
		"yt we like big booty mitches",
	callback: function (input) {
		var uri;
		if (!input.args) {
			irc.say(input.context, cmdHelp("yt", "syntax"));
			return;
		}
		if (config.api.youtube === undefined) {
			irc.say(input.context, "You need a YouTube API key in the config. Get one: https://developers.google.com/youtube/v3/getting-started");
			return;
		}
		uri = "https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q="+input.data+"&safeSearch=none&key="+config.api.youtube;
		web.get(uri, function (error, response, body) {
			var resp = JSON.parse(body);
			if (!resp.items.length) {
				irc.say(input.context, "\""+input.data+"\" is not a thing on YouTube.", false);
				return;
			}
			web.youtube(resp.items[0].id.videoId, function (yt) {
				if (yt.error) {
					if (yt.error.reason === "keyInvalid")
						irc.say(input.context, "Your YouTube API key is invalid. Get another: https://developers.google.com/youtube/v3/getting-started");
					else
						irc.say(input.context, yt.error.message+": "+yt.error.reason);
					return;
				}
				irc.say(input.context, yt.title+" - ["+yt.duration+"] "+yt.date.split("T")[0]+" - "+lib.commaNum(yt.views)+" views ~ "+yt.link, false);
			});
		});
	}
});

