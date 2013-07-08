// url title snarfer - THIS ONLY WORKS ON UNIX - must have wget, head and egrep installed.
var ent = require("./lib/entities.js"),
	sys = require("sys"),
	url = require("url"),
	fs = require("fs");

listen({
	plugin: "titleSnarfer",
	handle: "titleSnarfer",
	regex: new RegExp("^:[^ ]+ PRIVMSG [^ ]+ :?.*((?:https?:\\/\\/)[^ ]+)"),
	callback: function (input, match) {
		if (input.data[0] === config.command_prefix) return;
		var uri = url.parse(match[1]),
			tmpwget = "",
			ext = /.*\.([a-zA-Z0-9]+)$/.exec(uri.path),
			allow = [ 'htm', 'html', 'asp', 'aspx', 'php', 'php3', 'php5' ];
		if (ext && !ext[0].match(/&|\?/)) {
			if (!allow.some(function (item) { return (ext[1] === item); })) {
				return;
			}
		}
		tmpwget = "data/.tmp.wget."+Math.floor(Math.random()*8175).toString();
		sys.exec("wget -q -O - "+uri.href.replace(/&/g, "\\&")+" | head -c 5000 | egrep \\<title?.*\\>\\(.*?\\) > "+tmpwget);
		setTimeout(function () {
			var title = fs.readFileSync(tmpwget).toString(),
				reg;
			if (title) {
				if (title.indexOf("</title>") > -1) {
					reg = /(<title?.*>)(.*?)(<\/title>)/ig.exec(title);
				} else { // imgur is weird.
					reg = /(<title?.*>)(.*)/ig.exec(title);
				}
				if (reg) irc.say(input.context, ent.decode(reg[2].trim()) + " ~ " + uri.host);
				else logger.debug("No title found in the first 5000 bytes of "+uri.href);
				reg = null;
				title = null;
			}
			fs.unlink(tmpwget);
		}, 2000);
	}
});

