'use strict';
var run;

if (!config.api.googleurlshortener) {
	logger.error("NOT LOADING - shorten needs a google api key set in your config, see config.example");
} else {
	if (globals.os === "linux") {
		run = require("child_process").exec;
		cmdListen({
			command: "shorten",
			help: "Shortens URLs with goo.gl",
			syntax: config.command_prefix+"shorten <url> - Example: "
				+config.command_prefix+"shorten https://fbcdn-sphotos-d-a.akamaihd.net/hphotos-ak-xpa1/t1.0-9/10418399_10203865503259309_5593821024047180885_n.jpg",
			callback: function (input) {
				var resp, url = input.data.trim();
				run("curl https://www.googleapis.com/urlshortener/v1/url?key="+config.api.googleurlshortener+" -H 'Content-Type: application/json' -d '{\"longUrl\": \""+url+"\"}'",
					function (error, stdout, stderr) {
						resp = JSON.parse(stdout.replace(/\\n/g, ""));
						if (resp.code && resp.code === 400) {
							irc.say(input.context, "Derp. Something has gone awry - "+resp.message);
							logger.error("Shorten FAIL: "+resp.message);
							return;
						}
						irc.say(input.context, resp.id);
				});
			}
		});
	} else {
		logger.debug("Shorten only runs on linux right now.");
	}
}
