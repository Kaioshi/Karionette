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
		function ytCB(error, response, body) {
			var link, title, views, date, duration;
			body = JSON.parse(body).feed;
			if (body.openSearch$totalResults.$t === 0 || !body.entry) {
				irc.say(input.context, input.data + " is not a thing on youtube. :<");
				body = null;
				return;
			}
			link = "https://youtu.be/" + body.entry[0].link[0].href.split("&")[0].split("=")[1];
			title = body.entry[0].media$group.media$title.$t;
			date = new Date(body.entry[0].media$group.yt$uploaded.$t);
			date = zero(date.getDate()) + "/" + zero(date.getMonth() + 1) + "/" + date.getYear().toString().slice(1);
			duration = dura(parseInt(body.entry[0].media$group.yt$duration.seconds, 10));
			views = body.entry[0].yt$statistics.viewCount;
			if (body.entry[0].gd$rating && body.entry[0].gd$rating.numRaters && body.entry[0].gd$rating.numRaters > views)
				views = lib.commaNum(views)+"+";
			else
				views = lib.commaNum(views)
			irc.say(input.context, title + " - ["+duration+"] " + date + " - " + views + " views ~ " + link, false);
			body = null; date = null; title = null; date = null; views = null; link = null;
		}
		
		if (!input.args || !input.args[0]) {
			irc.say(input.context, cmdHelp("yt", "syntax"));
			return;
		}
		web.get("https://gdata.youtube.com/feeds/api/videos?q="+input.data+"&max-results=1&v=2&alt=json", ytCB);
	}
});

