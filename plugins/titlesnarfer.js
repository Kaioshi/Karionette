// url title snarfer
listen({
	handle: "titleSnarfer",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :?.*((?:https?:\\/\\/)[^ ]+)"),
	callback: function (input, match) {
		var result, title, host,
			uri = match[1];
		logger.info("Looking up title for "+uri);
		web.get(uri, function (error, response, body) {
			if (error) logger.error("titleSnarfer: "+error);
			else {
				if (body && body.match(/<title>.+?<\/title>/ig)) {
					title = getTitle(body);
					if (title) irc.say(input.context, title.trim() + " ~ " + response.request.host);
					else logger.warn("titleSnarfer: couldn't get title for "+uri);
				} else logger.warn("titleSnarfer: <title> wasn't found in body for "+uri);
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