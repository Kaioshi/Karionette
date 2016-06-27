"use strict";

let run = require("child_process").execFile,
	web = {},
	notFoundFeels = [
		":(", "D:", ":V", ">:(", "Sorry!", ":\\",
		"I'm not sorry.", "You only have yourself to blame.",
		"Look what you did.", "For shame.",
	];

web.fetch = function fetch(uri, opts) {
	return new Promise(function (resolve, reject) {
		let args = [ "--compressed", "-sSL", encodeURI(uri) ];
		if (!opts || !opts.nouseragent)
			args.push(`-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36"`);
		if (opts && opts.headers && Array.isArray(opts.headers) && opts.headers.length) {
			opts.headers.forEach(function (h) {
				args = args.concat([ "-H", h ]);
			});
		}
		opts = opts || { opts: { timeout: 15000 } };
		run("curl", args, opts.opts, function (error, stdout, stderr) {
			if (error && error.code === "ENOENT") {
				logger.error("You need to install curl on the system.");
				throw new Error("curl is not installed.");
			} if (stderr.length) {
				reject(new Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
			} else {
				resolve(stdout);
			}
		});
	});
};

web.json = function fetchJson(uri, opts) {
	return web.fetch(uri, opts).then(JSON.parse);
};

function googleSearch(uri) {
	return web.json(uri).then(function (g) {
		if (g.error)
			throw new Error(`Google: ${g.error.message}`);
		if (g.queries.request[0].totalResults === "0")
			throw new Error(`Couldn't find it. ${lib.randSelect(notFoundFeels)}`);
		let ret = [];
		for (let i = 0; i < g.items.length; i++) {
			ret.push({
				title: lib.singleSpace(g.items[i].title),
				url: g.items[i].link,
				content: String(g.items[i].snippet).replace(/\x01|\n|\t|\r/g, "")
			});
		}
		return ret;
	});
}

web.google = function google(term, maxResults) {
	let uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&q=${term.trim()}`;
	return googleSearch(uri);
};

web.googleImage = function googleImage(term, maxResults) {
	let uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&searchType=image&q=${term.trim()}`;
	return googleSearch(uri);
};

web.bing = function bing(term, maxResults) {
	let uri = "https://api.datamarket.azure.com/Bing/SearchWeb/Web?$format=json&Query='"+
		term+"'&Adult='Off'&Market='en-us'&$top="+(maxResults ? maxResults : 1),
		auth = new Buffer(config.api.bing+":"+config.api.bing).toString("base64");
	return web.json(uri, { headers: { "Authorization": "Basic "+auth } }).then(function (b) {
		if (!b.d.results.length)
			throw new Error("Couldn't find it. "+lib.randSelect(notFoundFeels));
		let ret = [];
		for (let i = 0; i < b.d.results.length; i++) {
			let item = b.d.results[i];
			ret.push({
				title: lib.singleSpace(item.Title),
				url: item.Url,
				content: item.Description
			});
		}
		return ret;
	});
};

web.youtubeSearch = function youtubeSearch(searchTerm) {
	let uri = "https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q="+searchTerm+
		"&safeSearch=none&type=video&fields=items&key="+config.api.youtube;
	return web.json(uri).then(function (resp) {
		if (!resp.items.length)
			throw new Error(searchTerm+" is not a thing on YouTube. "+lib.randSelect(notFoundFeels));
		else
			return web.youtubeByID(resp.items[0].id.videoId);
	});
};

web.youtubeByID = function youtubeByID(id) {
	let uri = "https://www.googleapis.com/youtube/v3/videos?id="+id+"&key="+config.api.youtube+"&part=snippet,contentDetails,statistics";
	return web.json(uri).then(function (yt) {
		if (yt.error)
			throw new Error(yt.error.errors[0]);
		return {
			date: yt.items[0].snippet.publishedAt,
			title: yt.items[0].snippet.title,
			channel: yt.items[0].snippet.channelTitle,
			views: yt.items[0].statistics.viewCount,
			duration: yt.items[0].contentDetails.duration.slice(2).toLowerCase(),
			link: "https://youtube.com/watch?v="+yt.items[0].id
		};
	});
};

function getXMLSection(line, section) {
	return line.slice(line.indexOf("<"+section+">")+section.length+2, line.indexOf("</"+section+">")).trim();
}
// TODO don't use this :D
web.atom2json = function atom2json(uri, handle) { // this is super buggy. so many corner cases.
	return web.fetch(uri).then(function (source) {
		let ret, atom;
		if (source.indexOf("<entry>") === -1) {
			if (handle)
				return { name: handle, items: [] };
			return { items: [] };
		}
		atom = source.replace(/\n/g, "");
		atom = atom.slice(atom.indexOf("<entry>"), atom.lastIndexOf("</entry>")+8);
		atom = atom.replace(/<id>[^<]+<\/id>|<media:[^>]+\/>|<content type=\"html\">[^<]+<\/content>|<author>|<\/author>/g, "")
			.replace(/<link ?((?!href).)*href=\"([^\"]+)\" ?\/>/g, "<link>$2</link>")
			.replace(/<entry>/g, "").match(/\S+/g).join(" ").split("</entry>").slice(0,-1);
		ret = [];
		atom.forEach(function (entry) {
			let json = {};
			[ "title", "link", "name", "updated" ].forEach(function (section) {
				json[section] = getXMLSection(entry, section);
			});
			ret.push(json);
		});
		if (handle)
			return { name: handle, items: ret };
		return { items: ret };
	});
};

plugin.declareGlobal("web", "web", web);
