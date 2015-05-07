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
		var id;
		if (!input.args) {
			irc.say(input.context, cmdHelp("yt", "syntax"));
			return;
		}
		web.google("site:youtube.com "+input.data, function (error, results, ret) {
			if (results === 0) {
				irc.say(input.context, "\""+input.data+"\" is not a thing on YouTube.", false);
				return;
			}
			id = /v=([^ &\?]+)/i.exec(ret[0].url);
			web.youtube(id[1], function (yt) {
				if (yt.error) {
					if (yt.error.reason === "keyInvalid")
						irc.say(input.context, "You need a YouTube API key in the config. See https://developers.google.com/youtube/v3/getting-started");
					else
						irc.say(input.context, yt.error.message+": "+yt.error.reason);
					return;
				}
				irc.say(input.context, yt.title+" - ["+yt.duration+"] "+yt.date.split("T")[0]+" - "+lib.commaNum(yt.views)+" views", false);
			});
		});
	}
});

