// url title snarfer
var ent = require("./lib/entities.js");

listen({
	handle: "titleSnarfer",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :?.*((?:https?:\\/\\/)[^ ]+)"),
	callback: function (input, match) {
		var result, reg, host,
			uri = match[1],
			ext = uri.split("/"),
			ext = ext[ext.length-1].split(".")[1],
			reject = [ 'jpg', 'png', 'jpeg', 'swf', 'mp3', 'mp4', 'avi', 'wmv', '7z', 'zip', 'rar' ];
		if (reject.some(function (item) { return (ext === item); })) return;
		web.get(uri, function (error, response, body) {
			if (error) logger.error("titleSnarfer: "+error);
			else {
				reg = (/(<title?.*>)(.+?)(<\/title>)/ig).exec(body);
				if (reg) irc.say(input.context, ent.decode(reg[2]).trim() + " ~ " + response.request.host);
				else logger.warn("titleSnarfer: couldn't get title for "+uri);
			}
		});
	}
});

