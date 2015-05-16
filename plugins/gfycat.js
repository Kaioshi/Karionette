// http://upload.gfycat.com/transcode?fetchUrl=i.imgur.com/lKi99vn.gif

cmdListen({
	command: [ "gfycat", "gfy" ],
	help: "Gfycat frontend.",
	syntax: config.command_prefix+"gfy <url> - Example: "+
		config.command_prefix+"gfy http://i.imgur.com/N2FEP.gif",
	arglen: 1,
	callback: function (input) {
		var result, sizeReduction;
		input.args[0] = input.args[0].trim();
		web.get("http://upload.gfycat.com/transcode?fetchUrl="+input.args[0], function (error, response, body) {
			result = JSON.parse(body);
			if (result.error) {
				irc.say(input.context, "Gfycat said \""+result.error+"\"");
				return;
			}
			sizeReduction = Math.round((result.gifSize - result.gfysize)/1024);
			irc.say(input.context, "http://gfycat.com/"+result.gfyname+" - Shrunk by "+sizeReduction+" KiB - Framerate: "+result.frameRate+".");
		});
	}
});
