'use strict';

function makeKey(len) {
	var i = 0, n, ret = "";
	len = len || 8;
	for (; i < len; i++) {
		n = Math.floor(Math.random()*9);
		if (n >= 5)
			ret += lib.randSelect([ "A", "a", "B", "b", "C", "c", "D", "d", "E", "e", "F", "f" ]);
		else
			ret += n;
	}
	return ret;
}

function makeUrl(url) {
	var word, ext = url.slice(url.lastIndexOf("."));
	switch (ext) {
	case ".png":
	case ".gif":
	case ".jpeg":
	case ".jpg":
	case ".bmp":
		word = "img_";
		break;
	case ".txt":
		word = "txt_";
		break;
	case ".avi":
	case ".mp4":
	case ".mkv":
	case ".wmv":
	case ".rm":
	case ".rmvb":
	case ".mov":
	case ".mpg":
	case ".mpeg":
	case ".m2v":
	case ".webm":
		word = "vid_";
		break;
	case ".mp3":
	case ".ogg":
	case ".wav":
	case ".flac":
	case ".m4a":
		word = "snd_";
		break;
	default:
		word = lib.randSelect([ "wat", "drp", "hrp", "lel", "wot", "dckbtt", "pnis",
			"hey", "sup", "heh", "fsrs", "srs", "yep", "tchit" ]);
		word = word+"_";
		break;
	}
	return word+makeKey(4);
}

bot.command({
	command: "shorten",
	help: "Shortens URLs!",
	syntax: config.command_prefix+"shorten [-p(review)] <url> - Example: "+
		config.command_prefix+"shorten http://some.really.long.url/with-a-bunch-of-crap-at-the-end",
	arglen: 1,
	callback: function (input) {
		var gd, url;
		switch (input.args[0].toLowerCase()) {
		case "-p":
		case "-preview":
			if (!input.args[1]) {
				irc.say(input.context, bot.cmdHelp("shorten", "syntax"));
				return;
			}
			gd = "v.gd";
			url = input.args.slice(1).join(" ");
			break;
		default:
			gd = "is.gd";
			url = input.data;
			break;
		}
		url = url.trim();
		web.fetch("http://"+gd+"/create.php?format=simple&url="+url+"&shorturl="+makeUrl(url)).then(function (body) {
			irc.say(input.context, body);
		});
	}
});
