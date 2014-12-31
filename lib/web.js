"use strict";

var redirects, run, url, web;

if (process.platform === "linux") {
	run = require('child_process').exec;
	web = {
		get: function (uri, callback, length) {
			var len = (length ? "| head -c "+length : ""),
				curl = "curl -sSL --user-agent \"Mozilla/5.0 (Windows NT 6.3; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0\" ";
			uri = encodeURI(uri);
			run(curl+"\""+uri+"\""+len, function (error, stdout, stderr) {
				stderr = stderr.replace(/\n|\r|\t|curl: /, "");
				if (stderr.slice(0,4) === "(23)") {
					stderr = ""; // whining about head -c cutting it off
				}
				callback(stderr, error, stdout);
				error = null; stdout = null; stderr = null;
			}, { timeout: 15000, encoding: 'utf8', maxBuffer: 0, killSignal: 'SIGTERM' });
		}
	}
} else {
	redirects = 0;
	url = require('url');
	web = {
		http: require('http'),
		https: require('https'),
		get: function (uri, callback, length) {
			var req,
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
			
			req = web[uri.protocol.slice(0, -1)].request({
				hostname: uri.host,
				path: uri.path,
				headers: { "user-agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0" },
				agent: false,
				method: "GET",
				port: uri.port || (uri.protocol === "https:" ? 443 : 80)
			}, function (response) {
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
		}
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

module.exports.get = web.get;
module.exports.google = web.google;
