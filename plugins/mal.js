// Unofficial MAL-API (clone) Fondler
"use strict";

const [web, lib] = plugin.importMany("web", "lib");

function getGenres(genres) {
	let ret = [];
	genres.forEach(function (item) {
		if (!ret.some(function (entry) { return (entry === item); })) {
			ret.push(item);
		}
	});
	return ret.join(", ");
}

function doSearch(type, context, title, synopsis, google) {
	let id;
	web.google("site:myanimelist.net/"+type+"/ "+title).then(function (results) {
		if (results.notFound) {
			irc.say(context, web.notFound());
			return;
		}
		id = new RegExp("http://myanimelist\\.net/"+type+"/([0-9]+)/?", "i").exec(results.items[0].url);
		if (!id)
			id = new RegExp("http://myanimelist\\.net/"+type+"\\.php\\?id=([0-9]+)", "i").exec(results.items[0].url);
		if (id)
			id = id[1];
		else {
			irc.say(context, "Couldn't parse the result from google. Woops.");
			logger.debug("Need a better regex! URL: "+results[0].url);
			return;
		}
		if (google) {
			irc.say(context, results[0].title.replace(" - MyAnimeList.net", "")+" - "+results.items[0].url+" - "+results.items[0].content);
		} else {
			return web.json("https://myanimelistrt.azurewebsites.net/2/"+type+"/"+id);
		}
	}).then(function (media) {
		if (!media)
			return; // did the google option ^
		if (media.error) {
			irc.say(context, "The unofficial MAL API said: "+media.error+" - "+media.details);
			return;
		}
		let eps = "";
		if (media.episodes) {
			eps = " - "+media.episodes+" "+(parseInt(media.episodes, 10) > 1 ? "episodes" : "episode");
		} else if (media.chapters) {
			eps = " - "+media.chapters+" "+(parseInt(media.chapters, 10) > 1 ? "chapters" : "chapter");
		}
		irc.say(context, lib.decode(media.title)+" ~ Rank #"+media.rank+" ["+getGenres(media.genres)+"]"+
			eps+" - "+media.status+" ~ http://myanimelist.net/"+type+"/"+id);
		if (synopsis)
			irc.say(context, lib.stripHtml(lib.decode(media.synopsis)), 1);
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
