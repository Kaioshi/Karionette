"use strict";

module.exports = function (lib, logger, config) {
	var redirects = 0, fetchCache = {},
		url = require("url"),
		web = { http: require("http"), https: require("https") },
		notFoundFeels = [
			":(", "D:", ":V", ">:(", "Sorry!", ":\\",
			"I'm not sorry.", "You only have yourself to blame.",
			"Look what you did.", "For shame."
		];

	function fixWeirdForwardingLink(link, proto) {
		if (link.slice(0,2) === "//")
			return proto+link;
		return link;
	}

	web.fetch = function (link, opts, length) {
		return new Promise(function (resolve, reject) {
			var req, options, body = "",
				uri = url.parse(encodeURI(link));

			if (!uri.host) {
				reject(Error("No host in "+link));
				return;
			}
			if (uri.host.indexOf(":") > -1 && uri.host.indexOf(".") > -1)
				uri.host = uri.host.slice(0, uri.host.indexOf(":"));
			options = {
				hostname: uri.host,
				path: uri.path,
				agent: false,
				method: "GET",
				port: uri.port || (uri.protocol === "https:" ? 443 : 80)
			};
			if (opts && opts.headers) // this is ugly
				options.headers = opts.headers; // oh well,
			options.headers = options.headers || {}; // so's your mum.
			options.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36";
			if (fetchCache[link])
				options.headers["If-None-Match"] = fetchCache[link].etag;
			req = web[uri.protocol.slice(0, -1)].request(options, function (response) {
				response.setEncoding("utf8");
				if (req.res.statusCode === 304) {
					req.abort();
					resolve(fetchCache[link].body);
					return;
				}
				response.on("data", function (chunk) {
					body += chunk;
					if (length && body.length >= length)
						req.abort();
				});
				response.on("end", function () {
					if (req.res.statusCode === 301 || req.res.statusCode === 302) {
						redirects += 1;
						if (redirects >= 3) {
							logger.warn("[web.fetch] Hit maximum redirects - stopping.");
							redirects = 0;
							reject(Error("Too many redirects."));
							return;
						}
						resolve(web.fetch(fixWeirdForwardingLink(req.res.headers.location, uri.protocol), length));
						return;
					} // don't cache if length is specified
					if (req.res.statusCode === 200 && req.res.headers.etag && !length)
						fetchCache[link] = { etag: req.res.headers.etag, body: body };
					resolve(body);
					if (redirects > 0)
						redirects = 0;
				});
			}).on("error", function (e) {
				reject(e.message);
			});
			req.end();
		});
	};

	web.json = function (uri, opts) {
		return web.fetch(uri, opts).then(JSON.parse).catch(function (error) {
			throw new Error(error);
		});
	};

	function googleSearch(uri) {
		return web.json(uri).then(function (g) {
			if (g.error)
				throw Error(`Google: ${g.error.message}`);
			if (g.queries.request[0].totalResults === "0")
				throw Error(`Couldn't find it. ${lib.randSelect(notFoundFeels)}`);
			else {
				return g.items.map(function (item) {
					return {
						title: lib.singleSpace(item.title),
						url: item.link,
						content: String(item.snippet).replace(/\x01|\n|\t|\r/g, "")
					};
				});
			}
		}, function (error) {
			throw error;
		});
	}

	web.google = function (term, maxResults) {
		var uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&q=${term.trim()}`;
		return googleSearch(uri);
	};

	web.googleImage = function (term, maxResults) {
		var uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&searchType=image&q=${term.trim()}`;
		return googleSearch(uri);
	};

	web.bing = function (term, maxResults) {
		var uri = "https://api.datamarket.azure.com/Bing/SearchWeb/Web?$format=json&Query='"+
			term+"'&Adult='Off'&Market='en-us'&$top="+(maxResults ? maxResults : 1),
			auth = new Buffer(config.api.bing+":"+config.api.bing).toString("base64");
		return web.json(uri, { headers: { "Authorization": "Basic "+auth } }).then(function (b) {
			var ret;
			if (!b.d.results.length)
				throw Error("Couldn't find it. "+lib.randSelect(notFoundFeels));
			else {
				ret = [];
				b.d.results.forEach(function (item) {
					ret.push({
						title: lib.singleSpace(item.Title),
						url: item.Url,
						content: item.Description
					});
				});
				return ret;
			}
		}, function (error) {
			throw error;
		});
	};

	web.youtubeSearch = function (searchTerm) {
		var uri = "https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q="+searchTerm+
			"&safeSearch=none&type=video&fields=items&key="+config.api.youtube;
		return web.json(uri).then(function (resp) {
			if (!resp.items.length)
				throw Error(searchTerm+" is not a thing on YouTube. "+lib.randSelect(notFoundFeels));
			else
				return web.youtubeByID(resp.items[0].id.videoId);
		});
	};

	web.youtubeByID = function (id) {
		var uri = "https://www.googleapis.com/youtube/v3/videos?id="+id+"&key="+
			config.api.youtube+"&part=snippet,contentDetails,statistics";
		return web.json(uri).then (function (yt) {
			if (yt.error)
				throw yt.error.errors[0];
			else {
				return {
					date: yt.items[0].snippet.publishedAt,
					title: yt.items[0].snippet.title,
					channel: yt.items[0].snippet.channelTitle,
					views: yt.items[0].statistics.viewCount,
					duration: yt.items[0].contentDetails.duration.slice(2).toLowerCase(),
					link: "https://youtube.com/watch?v="+yt.items[0].id
				};
			}
		}, function (error) {
			throw Error(error.message);
		});
	};

	function getXMLSection(line, section) {
		return line.slice(line.indexOf("<"+section+">")+section.length+2, line.indexOf("</"+section+">")).trim();
	}

	web.atom2json = function (source) {
		var ret, atom;
		if (source.indexOf("<entry>") === -1)
			return Promise.resolve([]);
		atom = source.replace(/\n/g, "");
		atom = atom.slice(atom.indexOf("<entry>"), atom.lastIndexOf("</entry>")+8);
		atom = atom.replace(/<id>[^<]+<\/id>|<media:[^>]+\/>|<content type=\"html\">[^<]+<\/content>|<author>|<\/author>/g, "")
			.replace(/<link ?((?!href).)*href=\"([^\"]+)\" ?\/>/g, "<link>$2</link>")
			.replace(/<entry>/g, "").match(/\S+/g).join(" ").split("</entry>").slice(0,-1);
		ret = [];
		atom.forEach(function (entry) {
			var json = {};
			[ "title", "link", "name", "updated" ].forEach(function (section) {
				json[section] = getXMLSection(entry, section);
			});
			ret.push(json);
		});
		return Promise.resolve(ret.slice());
	};

	return web;
};
