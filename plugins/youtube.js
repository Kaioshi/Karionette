// youtubes!
listen({
	plugin: "youtube",
	handle: "youtube",
	regex: regexFactory.startsWith(["yt", "youtube"]),
	command: {
		root: "youtube",
		help: "Searches youtube!",
		syntax: "[Help] Syntax: "+config.command_prefix+"youtube <search terms>"
	},
	callback: function (input, match) {
		var link, title, rating, views, date,
			uri = "https://gdata.youtube.com/feeds/api/videos?q="+match[1]+"&max-results=1&v=2&alt=json";
		
		function zero(n) {
			return (n > 9 ? n : "0"+n);
		}
		
		web.get(uri, function (error, response, body) {
			body = JSON.parse(body).feed;
			if (body["openSearch$totalResults"]["$t"] === 0 || !body.entry) {
				irc.say(input.context, match[1]+" is not a thing on youtube. :<");
				return;
			}
			link = "https://youtu.be/"+body.entry[0].link[0].href.split("&")[0].split("=")[1];
			title = body.entry[0]["media$group"]["media$title"]["$t"];
			date = new Date(body.entry[0]["media$group"]["yt$uploaded"]["$t"]);
			date = zero(date.getDate())+"/"+zero(date.getMonth()+1)+"/"+date.getYear().toString().slice(1);
			rating = body.entry[0]["gd$rating"].average.toString().slice(0,3);
			views = body.entry[0]["yt$statistics"].viewCount;
			irc.say(input.context, title+" ~ ["+rating+"/5] "+date+", "+views+" views ~ "+link, false);
		});
	}
});
