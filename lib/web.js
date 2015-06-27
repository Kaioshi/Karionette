"use strict";

module.exports = function (lib, logger, config) {
	var redirects, run, url, curl, fs, web = {},
		notFoundFeels = [
			":(", "D:", ":V", ">:(", "Sorry!", ":\\",
			"I'm not sorry.", "You only have yourself to blame.",
			"Look what you did.", "For shame."
		];

	if (process.platform !== "win32") {
		fs = require("fs");
		run = require("child_process").execFile;
		curl = (function () {
			var curls = [ "/usr/bin/curl", "/usr/local/bin/curl" ];
			if (fs.existsSync(curls[0]))
				return curls[0];
			if (fs.existsSync(curls[1]))
				return curls[1];
			else {
				console.error("You need to install curl, or make sure it's available at /usr/bin/curl or /usr/local/bin/curl");
				process.exit(1);
			}
		})();
		web.fetch = function (uri, opts) {
			var args = [ "--compressed", "-sSL", encodeURI(uri) ];
			if (!opts || !opts.nouseragent)
				args.push("-A \"Mozilla/5.0 (Windows NT 6.3; WOW64; rv:39.0) Gecko/20100101 Firefox/39.0\"");
			if (opts && opts.headers && Array.isArray(opts.headers) && opts.headers.length) {
				opts.headers.forEach(function (h) {
					args = args.concat([ "-H", h ]);
				});
			}
			opts = opts || { opts: { timeout: 15000 } };
			return new Promise(function (resolve, reject) {
				run(curl, args, opts.opts, function (error, stdout, stderr) {
					if (stderr.length)
						reject(Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
					else
						resolve(stdout);
				});
			});
		};
	} else {
		redirects = 0;
		url = require("url");
		web.http = require("http");
		web.https = require("https");

		web.fetch = function (link, length) {
			return new Promise(function (resolve, reject) {
				var req, options, body = "", resp = "",
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
					headers: { "user-agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:39.0) Gecko/20100101 Firefox/39.0" },
					agent: false,
					method: "GET",
					port: uri.port || (uri.protocol === "https:" ? 443 : 80)
				};
				req = web[uri.protocol.slice(0, -1)].request(options, function (response) {
					resp = JSON.stringify(response.headers);
					response.setEncoding("utf8");
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
							} // unsure if this works.
							return web.fetch(req.res.headers.location, length);
						}
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
	}

	web.json = function (uri, opts) {
		return web.fetch(uri, opts).then(JSON.parse).catch(function (error) {
			throw new Error(error);
		});
	};

	web.google = function (term, maxResults) {
		var uri = "https://www.googleapis.com/customsearch/v1?key="+
				config.api.googlesearch+"&cx=002465313170830037306:5cfvjccuofo&num="+
				(maxResults ? maxResults : 1)+"&prettyPrint=false&q="+term.trim();
		return web.json(uri).then(function (g) {
			var ret;
			if (g.error)
				throw Error("Google: "+g.error.message);
			if (g.queries.request[0].totalResults === "0")
				throw Error("Couldn't find it. "+lib.randSelect(notFoundFeels));
			else {
				ret = [];
				Object.keys(g.items).forEach(function (item) {
					ret.push({
						title: lib.singleSpace(g.items[item].title),
						url: g.items[item].link,
						content: g.items[item].snippet.replace(/\n|\t|\r/g, "")
					});
				});
				return ret;
			}
		}, function (error) {
			throw error;
		});
	};

	web.bing = function (term, maxResults) {
		var uri = "https://api.datamarket.azure.com/Bing/SearchWeb/Web?$format=json&Query='"+
			term+"'&Adult='Off'&Market='en-us'&$top="+(maxResults ? maxResults : 1),
			auth = new Buffer(config.api.bing+":"+config.api.bing).toString("base64");
		return web.json(uri, { headers: [ "Authorization: Basic "+auth ] }).then(function (b) {
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

	web.rss2json = function (rss, ignoreErrors) {
		var uri = "http://pipes.yahoo.com/pipes/pipe.run?_id=2FV68p9G3BGVbc7IdLq02Q&_render=json&feedcount=20&feedurl="+rss;
		return web.json(uri, ignoreErrors).then(function (json) {
			return json.value.items;
		});
	};

	web.atom2json = function (source) {
		var ret = [], atom = source.replace(/\n/g, ""),
			getSection = function (line, section) {
				return line.slice(line.indexOf("<"+section+">")+section.length+2, line.indexOf("</"+section+">")).trim();
			};
		atom = atom.slice(atom.indexOf("<entry>"), atom.lastIndexOf("</entry>")+8);
		atom = atom.replace(/<id>[^<]+<\/id>|<media:[^>]+\/>|<content type=\"html\">[^<]+<\/content>|<author>|<\/author>/g, "")
			.replace(/<link type=\"text\/html\" rel=\"alternate\" href=\"([^\"]+)\"\/>/g, "<link>$1</link>")
			.replace(/<entry>/g, "").match(/\S+/g).join(" ").split("</entry>").slice(0,-1);

		atom.forEach(function (entry) {
			var json = {};
			[ "title", "link", "name", "updated" ].forEach(function (section) {
				json[section] = getSection(entry, section);
			});
			ret.push(json);
		});
		return Promise.resolve(ret.slice());
	};

	return web;
};
