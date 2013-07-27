// url title snarfer - THIS ONLY WORKS ON UNIX - must have wget, head and egrep installed.
var ent = require("./lib/entities.js"),
	sys = require("sys"),
	url = require("url");

listen({
	plugin: "titleSnarfer",
	handle: "titleSnarfer",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :?.*((?:https?:\\/\\/)[^ ]+)"),
	callback: function (input, match) {
		var uri, title, reg, ext, allow, length = 10000;
		
		function zero(n) {
			return (n > 9 ? n : "0"+n);
		}
		
		function youtubeIt(id, host) {
			var uri = "https://gdata.youtube.com/feeds/api/videos/"+id+"?v=2&alt=json";
			web.get(uri, function (error, response, body) {
				var rating, date;
				if (error) {
					logger.error("[titlesnarfer[youtubeIt("+id+")]] error: "+error);
					irc.say(input.context, "Something has gone awry.");
					return;
				}
				body = JSON.parse(body).entry;
				rating = body["gd$rating"].average.toString().slice(0,3);
				date = new Date(body["media$group"]["yt$uploaded"]["$t"]);
				date = zero(date.getDate())+"/"+zero(date.getMonth()+1)+"/"+date.getYear().toString().slice(1);
				irc.say(input.context, body.title["$t"]+" ~ ["+rating+"/5] "+date+", "+body["yt$statistics"].viewCount+" views ~ "+host.replace("www.",""), false);
			});
		}
		
		if (input.data[0] === config.command_prefix) return;
		uri = url.parse(match[1]);
		if (uri.host.indexOf("youtube.com") > -1 && uri.path.indexOf("watch?v=") > -1) {
			youtubeIt(/^\/watch\?v=([^ &]+)/i.exec(uri.path)[1], uri.host);
			return;
		}
		if (uri.host.indexOf("youtu.be") > -1 && uri.path.length > 1) {
			youtubeIt(/^\/([^ &]+)/.exec(uri.path)[1], uri.host);
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
		sys.exec("wget -q -O- "+uri.href.replace(/&/g, "\\&")+" | head -c "+length+
			" | tr \'\\n\' \' \' | grep -E -io \"<title?.*>(.*?)<\/title>\" | grep -E -o \">(.*)<\"",
		function (error, stdout, stderr) {
			title = ent.decode(stdout.slice(1,-2).trim());
			if (title.slice(-8) === " - Imgur") title = title.slice(0,-8);
			if (title) {
				irc.say(input.context, title+" ~ "+uri.host);
			} else {
				logger.debug("Couldn't find title in first "+length+" bytes of "+uri.href);
			}
		});
	}
});

