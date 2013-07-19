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
		var uri, title, reg, tmpwget, ext, allow, length = 5000;
		if (input.data[0] === config.command_prefix) return;
		uri = url.parse(match[1]);
		tmpwget = "";
		ext = /.*\.([a-zA-Z0-9]+)$/.exec(uri.path);
		allow = [ 'htm', 'html', 'asp', 'aspx', 'php', 'php3', 'php5' ];
		if (ext && !ext[0].match(/&|\?/)) {
			if (!allow.some(function (item) { return (ext[1] === item); })) {
				return;
			}
		}
		tmpwget = "data/.tmp.wget."+Math.floor(Math.random()*8175).toString();
		// ton of garbage in the first 15000 characters. o_O
		if (uri.host.indexOf("kotaku") > -1) length = 20000;
		
		sys.exec("wget -q -O - "+uri.href.replace(/&/g, "\\&")+" | head -c "+length+" | grep -E -io \\<title?.*\\>\\(.*?\\)\\(\\<\\/title\\>\\)? > "+tmpwget);
		setTimeout(function () {
			title = fs.readFileSync(tmpwget).toString();
			if (title) {
				if (title.indexOf("</title>") > -1) {
					reg = /(<title?.*>)(.*?)(<\/title>)/ig.exec(title);
				} else { // imgur is weird.
					reg = /(<title?.*>)(.*)/ig.exec(title);
				}
				reg[2] = ent.decode(reg[2].trim());
				if (reg && reg[2].length > 0) irc.say(input.context, reg[2] + " ~ " + uri.host);
				else logger.debug("No title found in the first "+length+" bytes of "+uri.href);
				reg = null;
				title = null;
			}
			fs.unlink(tmpwget);
		}, 2000);
	}
});

