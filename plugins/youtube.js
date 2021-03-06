"use strict";
// youtubes!

const [web, lib] = plugin.importMany("web", "lib");

bot.command({
	command: [ "yt", "youtube", "y" ],
	help: "Searches YouTube!",
	syntax: `${config.command_prefix}yt [-c|--channel] <search terms> - Example: ${config.command_prefix}yt we like big booty mitches`,
	arglen: 1,
	callback: async function (input) {
		if (config.api.youtube === undefined) {
			irc.say(input.context, "You need a YouTube API key in the config. Get one: https://developers.google.com/youtube/v3/getting-started");
			return;
		}
		switch (input.args[0].toLowerCase()) {
		case "-c":
		case "--channel":
			try {
				const searchTerm = input.args.slice(1).join(" ");
				const uri = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${searchTerm}&safeSearch=none&type=channel&fields=items&key=${config.api.youtube}`;
				const yt = await web.json(uri);
				if (!yt.items.length)
					irc.say(input.context, `"${searchTerm}" doesn't seem to be a channel on YouTube.`);
				else {
					const resp = yt.items[0];
					const desc = (resp.snippet.description.length ? `: ${resp.snippet.description.slice(0,140)}` : "");
					irc.say(input.context, `${resp.snippet.title}${desc} - Channel launched on ${resp.snippet.publishedAt.split("T")[0]} ~ https://youtube.com/channel/${resp.id.channelId}`);
				}
			} catch (error) {
				irc.say(input.context, error.message);
			}
			break;
		default:
			try {
				const yt = await web.youtubeSearch(input.data);
				yt.date = yt.date.split("T")[0];
				yt.views = lib.commaNum(yt.views);
				if (config.youtube_format !== undefined) {
					yt.b = "\x02";
					yt.nick = input.nick;
					irc.say(input.context, lib.formatOutput(config.youtube_format, yt));
				} else {
					irc.say(input.context, `${yt.title} - [${yt.duration}] ${yt.date} - ${yt.channel} - ${yt.views} views ~ ${yt.link}`);
				}
			} catch (error) {
				irc.say(input.context, error.message);
			}
		}
	}
});
