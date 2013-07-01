// url title snarfer
var ent = require("./lib/entities.js");

listen({
	handle: "titleSnarfer",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :?.*((?:https?:\\/\\/)[^ ]+)"),
	callback: function (input, match) {
		var result, title, host,
			uri = match[1],
			ext = uri.split("/"),
			ext = ext[ext.length-1].split(".")[1],
			reject = [ 'jpg', 'png', 'jpeg', 'swf', 'mp3', 'mp4', 'avi', 'wmv', '7z', 'zip', 'rar' ];
		if (reject.some(function (item) { return (ext === item); })) return;
		web.get(uri, function (error, response, body) {
			if (error) logger.error("titleSnarfer: "+error);
			else {
				title = getTitle(body);
				if (title) {
					title = ent.decode(title);
					irc.say(input.context, title.trim() + " ~ " + response.request.host);
				}
				else logger.warn("titleSnarfer: couldn't get title for "+uri);
			}
		});
	}
});

function getTitle(html) {
	return (html.replace( /<!\[CDATA\[(.+?)\]\]>/g, function (_match, body) {
		return body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
	}).replace(/<!--.+?-->/g, '').match(/<title>.+?<\/title>/ig) || []).map(function (t) {
		return t.substring(7, t.length - 8);
	}).join(" ");
}
