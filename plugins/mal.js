// Unofficial MAL-API (clone) Fondler
"use strict";
function getGenres(genres) {
	var ret = [];
	genres.forEach(function (item) {
		if (!ret.some(function (entry) { return (entry === item); })) {
			ret.push(item);
		}
	});
	return ret.join(", ");
}

function doSearch(type, context, title, synopsis, google) {
	var id, eps;
	web.google("site:myanimelist.net/"+type+"/ "+title).then(function (results) {
		id = new RegExp("http://myanimelist\\.net/"+type+"/([0-9]+)/?", "i").exec(results[0].url);
		if (!id)
			id = new RegExp("http://myanimelist\\.net/"+type+"\\.php\\?id=([0-9]+)", "i").exec(results[0].url);
		if (id)
			id = id[1];
		else {
			irc.say(context, "Couldn't parse the result from google. Woops.");
			logger.debug("Need a better regex! URL: "+results[0].url);
			return;
		}
		if (google) {
			irc.say(context, results[0].title.replace(" - MyAnimeList.net", "")+" - "+results[0].url+" - "+results[0].content);
		} else {
			return web.json("https://myanimelistrt.azurewebsites.net/2/"+type+"/"+id);
		}
	}).then(function (body) {
		if (!body)
			return;
		if (body.error) {
			irc.say(context, "The unofficial MAL API said: "+body.error+" - "+body.details);
			return;
		}
		eps = "";
		if (body.episodes) {
			eps = " - "+body.episodes+" "+(parseInt(body.episodes, 10) > 1 ? "episodes" : "episode");
		} else if (body.chapters) {
			eps = " - "+body.chapters+" "+(parseInt(body.chapters, 10) > 1 ? "chapters" : "chapter");
		}
		irc.say(context, lib.decode(body.title)+" ~ Rank #"+body.rank+" ["+getGenres(body.genres)+"]"+
			eps+" - "+body.status+" ~ http://myanimelist.net/"+type+"/"+id);
		if (synopsis)
			irc.say(context, lib.stripHtml(lib.decode(body.synopsis)), 1);
	}, function (error) {
		irc.say(context, error.message);
	}).catch(function (error) {
		logger.error("Error in ;mal -> ", error);
	});
}

bot.command({
	command: "mal",
	help: "MyAnimeList anime searcher",
	syntax: config.command_prefix+"mal [-s(ynopsis)/-g(oogle)] <title> - Example: "+config.command_prefix+"mal -s Steins;Gate",
	arglen: 1,
	callback: function (input) {
		switch (input.args[0].toLowerCase()) {
		case "-s":
		case "-synopsis":
			doSearch("anime", input.context, input.args.slice(1).join(" "), true);
			break;
		case "-g":
		case "-google":
			doSearch("anime", input.context, input.args.slice(1).join(" ")+" synopsis", false, true);
			break;
		default:
			doSearch("anime", input.context, input.data.trim());
			break;
		}
	}
});

bot.command({
	command: "mml",
	help: "MyAnimeList manga searcher",
	syntax: config.command_prefix+"mml [-s(ynopsis)/-g(oogle)] <title> - Example: "+config.command_prefix+"mml Pluto",
	arglen: 1,
	callback: function (input) {
		switch (input.args[0].toLowerCase()) {
		case "-s":
		case "-synopsis":
			doSearch("manga", input.context, input.args.slice(1).join(" "), true);
			break;
		case "-g":
		case "-google":
			doSearch("manga", input.context, input.args.slice(1).join(" ")+" synopsis", false, true);
			break;
		default:
			doSearch("manga", input.context, input.data.trim());
			break;
		}
	}
});
