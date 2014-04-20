// Unofficial MAL-API (clone) Fondler
var ent = require("./lib/entities.js");

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
	var id, uri, eps;
	web.google("site:myanimelist.net/"+type+"/ "+title, function (error, hits, results) {
		if (!hits) {
			irc.say(context, "Couldn't find it. :\\");
			return;
		}
		if (google) {
			irc.say(context, results[0].title+" ~ "+results[0].url+" ~ "+results[0].content, false, 1);
			return;
		}
		id = new RegExp("http:\\/\\/myanimelist\\.net\\/"+type+"\\/([0-9]+)\\/?", "i").exec(results[0].url);
		if (!id) id = new RegExp("http:\\/\\/myanimelist\\.net/"+type+"\\.php\\?id=([0-9]+)", "i").exec(results[0].url);
		if (id) id = id[1];
		else {
			irc.say(context, "Couldn't parse the result from google. Woops.");
			logger.debug("Need a better regex! URL: "+results[0].url);
			return;
		}
		uri = "http://api.atarashiiapp.com/"+type+"/"+id;
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body);
			if (body.error) {
				irc.say(context, lib.randSelect([ "Herp", "Derp" ])+". The unofficial MAL API said: "+body.error+" - "+body.details);
				irc.say(context, "This is not a problem with my MAL plugin. Use "
					+config.command_prefix+(type === "anime" ? "mal" : "mml")+" -g until the remote API is fixed.");
				return;
			}
			eps = "";
			if (body.episodes) {
				eps = " - "+body.episodes+" "+(parseInt(body.episodes, 10) > 1 ? "episodes" : "episode");
			} else if (body.chapters) {
				eps = " - "+body.chapters+" "+(parseInt(body.chapters, 10) > 1 ? "chapters" : "chapter");
			}
			uri = "http://myanimelist.net/"+type+"/"+id;
			irc.say(context, ent.decode(body.title)+" ~ Rank #"+body.rank+
				" ["+getGenres(body.genres)+"]"+eps+" - "+body.status+" ~ "+uri, false);
			if (synopsis) {
				irc.say(context, lib.stripHtml(ent.decode(body.synopsis.replace(/\n|\r|\t/g, " "))), false, 1);
			}
		});
	});
}

cmdListen({
	command: "mal",
	help: "MyAnimeList anime searcher",
	syntax: config.command_prefix+"mal [-s(ynopsis)/-g(oogle)] <title> - Example: "+config.command_prefix+"mal -s Steins;Gate",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("mal", "syntax"));
			return;
		}
		if (input.args[0].match(/-s|-synopsis/i)) {
			doSearch("anime", input.context, input.args.slice(1).join(" "), true);
		} else if (input.args[0].match(/-g|-google/i)) {
			doSearch("anime", input.context, input.args.slice(1).join(" ")+" synopsis", false, true);
		} else {
			doSearch("anime", input.context, input.data.trim());
		}
	}
});

cmdListen({
	command: "mml",
	help: "MyAnimeList manga searcher",
	syntax: config.command_prefix+"mml [-s(ynopsis)/-g(oogle)] <title> - Example: "+config.command_prefix+"mml Pluto",
	callback: function (input) {
		if (!input.args) {
			irc.say(input.context, cmdHelp("mml", "syntax"));
			return;
		}
		if (input.args[0].match(/-s|-synopsis/i)) {
			doSearch("manga", input.context, input.args.slice(1).join(" "), true);
		} else if (input.args[0].match(/-g|-google/i)) {
			doSearch("manga", input.context, input.args.slice(1).join(" ")+" synopsis", false, true);
		} else {
			doSearch("manga", input.context, input.data.trim());
		}
	}
});

