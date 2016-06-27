// Urban dictionary look-up
"use strict";

function bestAnswersByScore(ud) {
	let i, ret = [];
	for (i = 0; i < ud.length; i++) {
		if (ud[i].thumbs_down > ud[i].thumbs_up || ud[i].thumbs_down > (ud[i].thumbs_up/2))
			ud.splice(i,1);
	}
	ud.sort(function (a, b) {
		if (a.thumbs_up > b.thumbs_up)
			return 1;
		if (a.thumbs_up < b.thumbs_up)
			return -1;
		return 0;
	}).forEach(function (entry) {
		ret.push(lib.singleSpace(entry.definition.replace(/\r|\n/g, " ")));
	});
	if (!ret.length)
		return "Pantsu.";
	return ret.join(" -- ");
}

bot.command({
	command: "ud",
	help: "Looks up things on Urban Dictionary! Often NSFW.",
	syntax: config.command_prefix+"ud <term> - Example: "+config.command_prefix+"ud the big lebowski",
	arglen: 1,
	callback: function ud(input) {
		web.json("http://api.urbandictionary.com/v0/define?term="+input.data).then(function (json) {
			irc.say(input.context, bestAnswersByScore(json.list), 1);
		}).catch(function (err) {
			irc.say(input.context, "Somethin' done broke.");
			logger.error(err, err);
		});
	}
});
