// http://upload.gfycat.com/transcode?fetchUrl=i.imgur.com/lKi99vn.gif
"use strict";

const web = plugin.import("web");

bot.command({
	command: [ "gfycat", "gfy" ],
	help: "Gfycat frontend.",
	syntax: config.command_prefix+"gfy <url> - Example: "+
		config.command_prefix+"gfy http://i.imgur.com/N2FEP.gif",
	arglen: 1,
	callback: async function (input) {
		try { // extended timeout time since it can take a while - 2 mins
			const gfy = await web.json(`http://upload.gfycat.com/transcode?fetchUrl=${input.args[0]}`, { opt: { timeout: 120000 }});
			if (gfy.error || (gfy.task && gfy.task === "error")) {
				irc.say(input.context, `Couldn't gfycat that. :(`);
			} else {
				const shrunk = gfy.gifSize && gfy.gfysize ? ` - Shrunk by ${Math.round((gfy.gifSize - gfy.gfysize)/1024)} KiB` : "";
				const framerate = gfy.frameRate ? ` - Framerate: ${gfy.frameRate}` : "";
				irc.say(input.context, `http://gfycat.com/${gfy.gfyname}${shrunk}${framerate}`);
			}
		} catch (err) {
			logger.error("Couldn't gfy that", err);
		}
	}
});
