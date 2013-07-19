var malBindingsDB = new DB.Json({filename: "mal"}),
	ent = require("./lib/entities.js");

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
	var result, reg, id, url, resp, start, end, eps, runtime, status, garbage,
		uri = "http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=1&q=site:myanimelist.net/"+type+"/ "+term;
	web.get(uri, function (error, response, body) {
		result = JSON.parse(body).responseData.results[0];
		if (result && result.titleNoFormatting) {
			url = result.unescapedUrl;
			reg = new RegExp("^http?:\\/\\/[^ ]+\\/(anime|manga)\\/([0-9]+)");
			id = reg.exec(url)[2];
			if (id) {
				uri = "http://mal-api.com/"+type+"/"+id;
				url = "http://myanimelist.net/"+type+"/"+id;
				if (!full) {
					irc.say(context, ent.decode(result.titleNoFormatting.replace(" - MyAnimeList.net", ""))+" ~ "+url);
					return;
				}
				web.get(uri, function (error, response, body) {
					if (error) {
						irc.say(context, "Something has gone awry.");
						logger.error("[mal-googleIt("+[context, type, term].join(", ")+")] hit error in mal-api fetch: "+error);
						return;
					}
					result = JSON.parse(body);
					status = "";
					eps = "";
					runtime = "";
					garbage = [ "\\r", "\\n", "\\<br\\>", "\\[Written by MAL Rewrite\\]" ];
					garbage.forEach(function (trash) {
						reg = new RegExp(trash, "gi");
						result.synopsis = result.synopsis.replace(reg, "");
					});
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
listen({
	plugin: "mal",
	handle: "mal",
	regex: regexFactory.startsWith("mal"),
	command: {
		root: "mal",
		options: "-top, -pop -s(ynopsis) <anime>",
		help: "Allows you to search MyAnimeList (anime). Optional commands can be executed by prepending a dash. -s(ynopsis) <anime>, -top is Top Anime, -pop is Popular anime"
	},
	callback: function (input, match) {
		var result, uri, doRes, boundName,
			args = match[1].split(" ");
		
		switch (args[0]) {
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
				googleIt(input.context, true, "anime", args.slice(1).join(" "));
				return;
			case "-l":
				googleIt(input.context, false, "anime", args.slice(1).join(" "));
				return;
			default:
				googleIt(input.context, false, "anime", args.join(" "));
				return;
		}
		web.get(uri, function (error, response, body) {
			doRes(input.context, body);
		});
	}
});

// MyAnimeList manga API
listen({
	plugin: "mal",
	handle: "mml",
	regex: regexFactory.startsWith("mml"),
	command: {
		root: "mml",
		options: "-s(ynopsis)",
		help: "Allows you to search MyAnimeList (manga). -s(ynopsis) <manga title>"
	},
	callback: function (input, match) {
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

