// url title snarfer - THIS ONLY WORKS ON UNIX - must have wget, head and egrep installed.
var ent = require("./lib/entities.js"),
	sys = require("sys"),
	url = require("url");

function zero(n) {
	return (n > 9 ? n : "0"+n);
}

listen({
	plugin: "titleSnarfer",
	handle: "titleSnarfer",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :?.*((?:https?:\\/\\/)[^ ]+)"),
	callback: function (input, match) {
		var uri, title, reg, ext, allow, length = 10000;
		
		function sayTitle(uri, length, imgur) {
			sys.exec("wget -q -O- "+uri.href.replace(/&/g, "\\&")+" | head -c "+length+
				" | tr \'\\n\' \' \' | grep -E -io \"<title?.*>(.*?)<\/title>\" | grep -E -o \">(.*)<\"",
			function (error, stdout, stderr) {
				title = ent.decode(stdout.slice(1,-2).trim());
				if (title) {
					if (title.slice(-8) === " - Imgur") title = title.slice(0,-8);
					if (imgur) { // I know there are a lot of imgur corner cases, but it's really common.
						if (title === "imgur: the simple image sharer") return; // deal with it
					}
					irc.say(input.context, title+" ~ "+uri.host, false);
				}
			});
		}
		
		function youtubeIt(id, host) {
			var uri = "https://gdata.youtube.com/feeds/api/videos/"+id+"?v=2&alt=json";
			web.get(uri, function (error, response, body) {
				var date, rating = " ~ ";
				if (error) {
					logger.error("[titlesnarfer[youtubeIt("+id+")]] error: "+error);
					irc.say(input.context, "Something has gone awry.");
					return;
				}
				body = JSON.parse(body).entry;
				if (body["gd$rating"] && body["gd$rating"].average) {
					rating = rating+"["+body["gd$rating"].average.toString().slice(0,3)+"/5] ~ ";
				}
				date = new Date(body["media$group"]["yt$uploaded"]["$t"]);
				date = zero(date.getDate())+"/"+zero(date.getMonth()+1)+"/"+date.getYear().toString().slice(1);
				irc.say(input.context, body.title["$t"]+rating+date+", "+body["yt$statistics"].viewCount+" views ~ "+host.replace("www.",""), false);
			});
		}
		
		if (input.data[0] === config.command_prefix) return;
		uri = url.parse(match[1]);
		if (uri.host.indexOf("youtube.com") > -1 && uri.path.indexOf("v=") > -1) {
			youtubeIt(/v=([^ &]+)/i.exec(uri.path)[1], uri.host);
			return;
		}
		if (uri.host.indexOf("youtu.be") > -1 && uri.path.length > 1) {
			youtubeIt(/^\/([^ &]+)/.exec(uri.path)[1], uri.host);
			return;
		}
		if (uri.host === "i.imgur.com" && uri.href.slice(-4).match(/\.jpg|\.png|\.gif/i)) {
			uri.path = uri.path.slice(0,-4);
			uri.href = uri.href.slice(0,-4);
			sayTitle(uri, length, true);
			return;
		}
		ext = /.*\.([a-zA-Z0-9]+)$/.exec(uri.path);
		allow = [ 'htm', 'html', 'asp', 'aspx', 'php', 'php3', 'php5' ];
		if (ext && !ext[0].match(/&|\?/)) {
			if (!allow.some(function (item) { return (ext[1] === item); })) {
				return;
			}
		}
		// ton of garbage in the first 15000 characters. o_O
		if (uri.host.indexOf("kotaku") > -1) length = 20000;
		sayTitle(uri, length);
	}
});

