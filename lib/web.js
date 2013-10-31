var	http = require('http'),
	https = require('https'),
	url = require('url');

function get(uri, callback) {
	var uri = url.parse(encodeURI(uri)),
		body = "",
		error = "",
		resp = "";
	
	eval(uri.protocol.slice(0,-1)).get({
			hostname: uri.host,
			path: uri.path,
			agent: false,
			port: (uri.port ? uri.port : (uri.protocol === "https:" ? 443 : 80))
		}, function (response) {
			resp = JSON.stringify(response.headers);
			response.setEncoding("utf8");
			response.on("data", function (chunk) {
				body += chunk;
			});
			response.on("end", function () {
				callback(error, resp, body);
				error = null; resp = null; body = null; response = null; req = null;
			});
	}).on("error", function (e) {
		error = e.message;
		e = null;
	});
}

module.exports.get = get;

