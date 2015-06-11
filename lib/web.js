"use strict";

var redirects, run, url, curl, fs, web = {},
	notFoundFeels = [
		":(", "D:", ":V", ">:(", "Sorry!", ":\\",
		"I'm not sorry.", "You only have yourself to blame.",
		"Look what you did.", "For shame."
	];

if (process.platform === "linux") {
	fs = require('fs');
	run = require('child_process').execFile;
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
	web.get = function (uri, callback, length) {
		var opts = { timeout: 15000 },
			args = [ "-sSLA \"Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0\"", encodeURI(uri) ];
		if (length > 0)
			opts.maxBuffer = length;
		run(curl, args, opts, function (error, stdout, stderr) {
			stderr = stderr.replace(/\n|\r|\t|curl: /, "");
			if (stderr.slice(0,4) === "(23)")
				stderr = ""; // whining about head -c cutting it off
			callback(stderr, error, stdout);
			error = null; stdout = null; stderr = null;
		});
	};
	web.fetch = function (uri, length) {
		var opts = { timeout: 15000 },
			args = [ "-sSLA \"Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0\"", encodeURI(uri) ];
		if (length > 0)
			opts.maxBuffer = length;
		return new Promise(function (resolve, reject) {
			run(curl, args, opts, function (error, stdout, stderr) {
				if (stderr.length)
					reject(Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
				else
					resolve(stdout);
			});
		});
	};
} else {
	redirects = 0;
	url = require('url');
	web.http = require('http');
	web.https = require('https');

	web.get = function (uri, callback, length) {
		var req, options, body = "", error = "", resp = "";
		if (!uri) {
			logger.error("[web.get] no URL provided.");
			return;
		}
		uri = url.parse(encodeURI(uri));

		if (!uri.host) {
			logger.warn("[web.get] no host found in provided uri: ");
			error = "No host found in uri.";
			callback(error, resp, body);
			return;
		}

		if (uri.host.indexOf(":") > -1 && uri.host.indexOf(".") > -1) {
			uri.host = uri.host.slice(0, uri.host.indexOf(":"));
		}

		options = {
			hostname: uri.host,
			path: uri.path,
			headers: { "user-agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0" },
			agent: false,
			method: "GET",
			port: uri.port || (uri.protocol === "https:" ? 443 : 80)
		};
		req = web[uri.protocol.slice(0, -1)].request(options, function (response) {
			resp = JSON.stringify(response.headers);
			response.setEncoding("utf8");
			response.on("data", function (chunk) {
				body += chunk;
				if (length && body.length >= length) req.abort();
			});
			response.on("end", function () {
				if (req.res.statusCode === 301 || req.res.statusCode === 302) {
					redirects += 1;
					if (redirects >= 3) {
						logger.warn("[web.get] Hit maximum redirects - stopping.");
						error = "Too many redirects.";
						callback(error, "", "");
						redirects = 0;
						return;
					}
					web.get(req.res.headers.location, callback, length);
					return;
				}
				callback(error, resp, body);
				error = null; resp = null; body = null; response = null;
				if (redirects > 0) redirects = 0;
			});
		}).on("error", function (e) {
			error = e.message;
			e = null;
		});
		req.end();
	};
}

web.json = function (uri) {
	return web.fetch(uri).then(JSON.parse).catch(function (error) {
		logger.error("Couldn't JSON.parse "+uri, error);
		throw error;
	});
};

web.google = function (term, maxResults) {
	var uri = "https://www.googleapis.com/customsearch/v1?key="+
			irc_config.api.googlesearch+"&cx=002465313170830037306:5cfvjccuofo&num="+
			(maxResults ? maxResults : 1)+"&prettyPrint=false&q="+term.trim();
	return web.json(uri).then(function (g) {
		var ret;
		globals.lastG = g;
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

web.youtubeSearch = function (searchTerm) {
	var uri = "https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q="+searchTerm+
		"&safeSearch=none&type=video&fields=items&key="+irc_config.api.youtube;
	return web.json(uri).then(function (resp) {
		if (!resp.items.length)
			throw Error(searchTerm+" is not a thing on YouTube. "+lib.randSelect(notFoundFeels));
		else
			return web.youtubeByID(resp.items[0].id.videoId);
	});
};

web.youtubeByID = function (id) {
	var uri = "https://www.googleapis.com/youtube/v3/videos?id="+id+"&key="+
		irc_config.api.youtube+"&part=snippet,contentDetails,statistics";
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

// web.rss2json = function (rss) { // not in use yet.
// 	return web.json("http://pipes.yahoo.com/pipes/pipe.run?_id=2FV68p9G3BGVbc7IdLq02Q&_render=json&feedcount=20&feedurl="+rss);
// };

module.exports.fetch = web.fetch;
module.exports.json = web.json;
module.exports.get = web.get;
module.exports.youtubeSearch = web.youtubeSearch;
module.exports.youtubeByID = web.youtubeByID;
module.exports.google = web.google;
//module.exports.rss2json = web.rss2json;
