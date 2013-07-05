var malBindingsDB = new DB.Json({filename: "mal"}),
	ent = require("./lib/entities.js");

function search(context, body) {
	var result = JSON.parse(body)[0];
	if (result) {
		result.synopsis = result.synopsis.replace(/\n/g, "").replace(/<br>/g, "");
		irc.say(context, "(" + result.members_score + ") " + ent.decode(result.title) + " ~ " + ent.decode(result.synopsis));
	} else {
		irc.say(context, "Pantsu.");
	}
}

function listIt(context, body) {
	var i,
		topArr = [],
		result = JSON.parse(body);
	for (i=0; i < 10; i+=1) {
		topArr.push((i+1) + ".) " + ent.decode(result[i].title));
	}
	irc.say(context, topArr.join(", "));
}

function linkIt(context, body) {
	var result = JSON.parse(body)[0];
	if (result) {
		irc.say(context, ent.decode(result.title) + " ~ " + "http://myanimelist.net/anime/" + result.id);
	} else {
		irc.say(context, "Pantsu.", false);
	}
}

// MyAnimeList anime API
listen({
	plugin: "mal",
	handle: "mal",
	regex: regexFactory.startsWith("mal"),
	command: {
		root: "mal",
		options: "-bind, -top, -pop, -l",
		help: "Allows you to search MyAnimeList (anime). Optional commands can be executed by prepending a dash. -bind binds your nick to your account (requires mal username and password in that order), -top is Top Anime, -pop is Popular anime, and -l is to just retrieve a link"
	},
	callback: function (input, match) {
		var result, uri, doRes, boundName, toPost,
			isGet = true;
			args = match[1].split(" ");
		
		switch (args[0]) {
			case "-bind":
				if (args[1] && args[2]) {
					malBindingsDB.saveOne(input.from, "[" + args[1] + "," + args[2] + "]");
					irc.say(input.context, "At your service :)");
				} else {
					irc.say(input.context, "What am I binding?");
				}
				break;
			case "-top":
				uri = "http://mal-api.com/anime/top";
				doRes = listIt;
				break;
			case "-pop":
				uri = "http://mal-api.com/anime/popular";
				doRes = listIt;
				break;
			case "-l":
				uri = "http://mal-api.com/anime/search?q=" + args.slice(1).join(" ");
				doRes = linkIt;
				break;
			// case "-towatch":
				// isGet =  false;
				// boundName = malBindingsDB.getOne(input.from);
				// if (boundName) {
					// uri = "http://" + boundName[1] + ":" + boundName[2] + "@mal-api.com/animelist/anime";
				// } else {
					// uri = "http://:@mal-api.com/animelist/anime";
					// irc.say(input.context, "[Help] You must bind a username and password to your nick first!");
				// }
				// break;
			default:
				uri = "http://mal-api.com/anime/search?q=" + match[1];
				doRes = search;
				break;
		}
		if (isGet) {
			web.get(uri, function (error, response, body) {
				doRes(input.context, body);
			});
		} else {
			web.post(uri, toPost, function () {
			
			});
		}
	}
});

// MyAnimeList manga API
listen({
	plugin: "mal",
	handle: "mml",
	regex: regexFactory.startsWith("mml"),
	command: {
		root: "mml",
		options: "-l",
		help: "Allows you to search MyAnimeList (manga). -l retrieves a link"
	},
	callback: function (input, match) {
		var result, uri, doRes
			args = match[1].split(" ");
		
		switch (args[0]) {
			case "-l":
				uri = "http://mal-api.com/manga/search?q=" + args.slice(1).join(" ");
				doRes = linkIt;
				break;
			default:
				uri = "http://mal-api.com/manga/search?q=" + match[1];
				doRes = search;
				break;
		}
		
		web.get(uri, function (error, response, body) {
			doRes(input.context, body);
		});
	}
});

