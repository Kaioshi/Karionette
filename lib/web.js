"use strict";
if (process.platform === "linux") {
	var sys = require('sys'),
		web = {
			get: function (uri, callback, length) {
				var len = (length ? "| head -c "+length : ""),
					curl = "curl -s -S -L ";
				uri = encodeURI(uri);
				sys.exec(curl+"\""+uri+"\""+len, function (error, stdout, stderr) {
					if (stderr === "(23) Failed writing body\n") {
						stderr = ""; // whining about head -c cutting it off
					}
					callback(stderr, "", stdout);
					error = null; stdout = null; stderr = null;
				});
			}
		};
} else {
	var dns = require('dns'),
		url = require('url'),
		redirects = 0,
		web = {
			http: require('http'),
			https: require('https'),
			get: function (uri, callback, length) {
				var req,
					body = "",
					error = "",
					resp = "";

				uri = url.parse(encodeURI(uri));

				if (!uri.host) {
					logger.warn("[web.get] no host found in provided uri: ");
					console.log(uri);
					error = "No host found in uri.";
					callback(error, resp, body);
					return;
				}

				dns.resolve(uri.host, function (err, addresses) {
					if (err) {
						switch (err.toString()) {
						case "Error: queryA ENOTFOUND":
							error = "Couldn't resolve \"" + uri.host + "\"";
							break;
						default:
							break;
						}
						callback(error, resp, body);
						return;
					}

					req = web[uri.protocol.slice(0, -1)].request({
						hostname: uri.host,
						path: uri.path,
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
							error = null;
							resp = null;
							body = null;
							response = null;
							if (redirects > 0) redirects = 0;
						});
					}).on("error", function (e) {
						error = e.message;
						e = null;
					});
					req.end();
				});
			}
		};
}

module.exports.get = web.get;
