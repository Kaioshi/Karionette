// http://upload.gfycat.com/transcode?fetchUrl=i.imgur.com/lKi99vn.gif
"use strict";
bot.command({
	command: [ "gfycat", "gfy" ],
	help: "Gfycat frontend.",
	syntax: config.command_prefix+"gfy <url> - Example: "+
		config.command_prefix+"gfy http://i.imgur.com/N2FEP.gif",
	arglen: 1,
	callback: function (input) {
		web.json("http://upload.gfycat.com/transcode?fetchUrl="+input.args[0]).then(function (gfy) {
			if (gfy.error)
				irc.say(input.context, "Gfycat said \""+gfy.error+"\"");
			else
				irc.say(input.context, "http://gfycat.com/"+gfy.gfyname+" - Shrunk by "+
					Math.round((gfy.gifSize - gfy.gfysize)/1024)+" KiB - Framerate: "+gfy.frameRate+".");
		}, function (error) {
			irc.say(input.context, error.message);
		});
	}
});
