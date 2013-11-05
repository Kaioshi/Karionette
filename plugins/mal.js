var ent = require("./lib/entities.js");

function listIt(context, body) {
	var i,
		topArr = [],
		result = JSON.parse(body);
	for (i = 0; i < 10; i+=1) {
		topArr.push((i+1) + ".) " + ent.decode(result[i].title));
	}
	irc.say(context, topArr.join(", "));
}

function googleIt(context, full, type, term) {
	var result, reg, id, url, resp, start, end, eps, runtime, status,
		uri = "http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=1&q=site:myanimelist.net/"+type+"/ "+term;
	web.get(uri, function (error, response, body) {
		result = JSON.parse(body).responseData.results[0];
		if (result && result.titleNoFormatting) {
			url = result.unescapedUrl;
			if (url.indexOf(".php?q=") > -1) {
				irc.say(context, "Couldn't find \""+term+"\", here's what Google thought would be useful: "+result.unescapedUrl, false);
				return;
			} else if (url.indexOf(".php?") > -1) {
				reg = new RegExp("^https?:\\/\\/[^ ]+\\/(anime|manga)\\.php\\?.*=([0-9]+)");
			} else {
				reg = new RegExp("^https?:\\/\\/[^ ]+\\/(anime|manga)\\/([0-9]+)");
			}
			
			id = reg.exec(url)[2];
			if (id) {
				uri = "http://mal-api.com/"+type+"/"+id;
				url = "http://myanimelist.net/"+type+"/"+id;
				if (!full) {
					irc.say(context, ent.decode(result.titleNoFormatting.replace(" - MyAnimeList.net", ""))+" ~ "+url, false);
					return;
				}
				web.get(uri, function (error, response, body) {
					if (error) {
						irc.say(context, "Something has gone awry.");
						logger.error("[mal-googleIt("+[context, type, term].join(", ")+")] hit error in mal-api fetch: "+error);
						return;
					}
					result = JSON.parse(body);
					if (result.error) {
						logger.warn("MAL returned an error: "+result.error+" - "+result.details);
						irc.say(context, "MAL's api seems to be broken again, try without -s .. "+lib.randSelect([
							"What? It's not my fault! :< Don't hate!",
							"Blame Deide.",
							"ranma probably mitch_'s too much.",
							"Freakin' MAL.",
							"Get it together MAL!",
							"Capn' would be sad."
						]));
						return;
					}
					status = "";
					eps = "";
					runtime = "";
					result.synopsis = result.synopsis.replace(/\r/g, " ").replace("[Written by MAL Rewrite]", "");
					result.synopsis = ent.decode(lib.stripHtml(result.synopsis));
					if (result.synopsis.indexOf("(Source:") > -1) {
						result.synopsis = result.synopsis.slice(0, result.synopsis.indexOf("(Source:")-1);
					}
					if (result.start_date) {
						start = result.start_date.split(" ")[0];
						start = start.split("-");
						start = start[2]+"/"+start[1]+"/"+start[0];
					}
					if (result.end_date) {
						end = result.end_date.split(" ")[0];
						end = end.split("-");
						end = end[2]+"/"+end[1]+"/"+end[0];
					}
					if (start) runtime = ", "+start;
					if (end) runtime = runtime+"-"+end;
					else if (runtime) runtime = runtime+"-??";
					if (result.status) status = ", "+result.status;
					if (result.episodes) eps = ", "+result.episodes+" episodes";
					else if (result.chapters) {
						eps = ", "+result.chapters+" chapters";
						if (result.volumes) eps = eps+" over "+result.volumes+" volumes";
					}
					resp = result.title+" ("+result.members_score+eps+runtime+status+") ["+result.genres.join(", ")+"] ~ "+url;
					irc.say(context, ent.decode(resp), false);
					irc.say(context, ent.decode(result.synopsis), false, 1);
				});
			} else {
				logger.warn("[mal-googleIt] couldn't get ID out of "+result.unescapedUrl);
				irc.say(context, ".... Pantsu.");
			}
		} else {
			irc.action(context, "can't find it. :<");
		}
	});
}

// MyAnimeList anime API
cmdListen({
	command: "mal",
	options: "-top, -pop -s(ynopsis) <anime>",
	help: "Allows you to search MyAnimeList (anime). Optional commands can be executed by prepending a dash. -s(ynopsis) <anime>, -top is Top Anime, -pop is Popular anime",
	syntax: config.command_prefix+"mal [-s / -top / -pop] [<anime>] - Example: "+config.command_prefix+
		"mal -s Steins;Gate",
	callback: function (input) {
		var result, uri, doRes;
		
		if (!input.args || !input.args[0]) {
			irc.say(input.context, cmdHelp("mal", "syntax"));
			return;
		}
		
		switch (input.args[0]) {
			case "-top":
				uri = "http://mal-api.com/anime/top";
				doRes = listIt;
				break;
			case "-pop":
				uri = "http://mal-api.com/anime/popular";
				doRes = listIt;
				break;
			case "-synopsis":
			case "-s":
				googleIt(input.context, true, "anime", input.args.slice(1).join(" "));
				return;
			case "-l":
				googleIt(input.context, false, "anime", input.args.slice(1).join(" "));
				return;
			default:
				googleIt(input.context, false, "anime", input.data);
				return;
		}
		web.get(uri, function (error, response, body) {
			doRes(input.context, body);
		});
	}
});

// MyAnimeList manga API
cmdListen({
	command: "mml",
	help: "Allows you to search MyAnimeList (manga). -s(ynopsis) <manga title>",
	syntax: config.command_prefix+"mml [-s] <manga> - Example: "+config.command_prefix+
		"mml -s Slam Dunk",
	callback: function (input) {
		var result, uri, doRes
			args = match[1].split(" ");
		
		switch (args[0]) {
			case "-synopsis":
			case "-s":
				googleIt(input.context, true, "manga", args.slice(1).join(" "));
				return;
			case "-l":
				googleIt(input.context, false, "manga", args.slice(1).join(" "));
				return;
			default:
				googleIt(input.context, false, "manga", args.join(" "));
				return;
		}
		
		web.get(uri, function (error, response, body) {
			doRes(input.context, body);
		});
	}
});

