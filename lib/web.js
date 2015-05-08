"use strict";

var redirects, run, url, curl, fs, web = {};

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
		var opts = {},
			args = [ "-sSLA \"Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0\"", encodeURI(uri) ];
		opts.timeout = 15000;
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
} else {
	redirects = 0;
	url = require('url');
	web.http = require('http');
	web.https = require('https');
	
	web.get = function (uri, callback, length) {
		var req, options,
			hostname,
			body = "",
			error = "",
			resp = "";
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
			port: uri.port || (uri.protocol == "https:" ? 443 : 80)
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

web.google = function (term, callback, maxResults) { // fist hit by default
	var g, ret, i, l,
		uri = "https://www.googleapis.com/customsearch/v1?key="
			+irc_config.api.googlesearch+"&cx=002465313170830037306:5cfvjccuofo&num="
			+(maxResults ? maxResults : 1)+"&prettyPrint=false&q="+term.trim();
	web.get(uri, function (error, response, body) {
		g = JSON.parse(body);
		if (g.queries.request[0].totalResults === "0") {
			callback(error, 0, ret);
			return;
		}
		i = 0; l = g.items.length; ret = [];
		for (; i < l; i++) {
			ret.push({
				title: lib.singleSpace(g.items[i].title),
				url: g.items[i].link,
				content: g.items[i].snippet.replace(/\n|\t|\r/g, "")
			});
		}
		callback(error, i, ret);
		ret = null; g = null;
	});
}

web.youtube = function (id, callback) {
	var uri = "https://www.googleapis.com/youtube/v3/videos?id="+id+"&key="
		+irc_config.api.youtube+"&part=snippet,contentDetails,statistics";
	web.get(uri, function (error, response, body) {
		var resp = JSON.parse(body);
		if (resp.error) {
			callback({ error: resp.error.errors[0] });
			return;
		}
		callback({
			date: resp.items[0].snippet.publishedAt,
			title: resp.items[0].snippet.title,
			views: resp.items[0].statistics.viewCount,
			duration: resp.items[0].contentDetails.duration.slice(2).toLowerCase(),
			link: "https://youtube.com/watch?v="+resp.items[0].id
		});
	});
}

module.exports.get = web.get;
module.exports.youtube = web.youtube;
module.exports.google = web.google;
