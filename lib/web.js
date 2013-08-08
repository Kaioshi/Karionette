var request = require('request'),
	uri,
	requestObject = {
		uri: uri,
		strictSSL: false,
		timeout: 10000,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.43 Safari/537.31 Marionette'
		}
	};
	
module.exports.get = function (uri, callback) {
	
	requestObject.uri = uri;
	
	request(requestObject, function (error, response, body) {
		// -----INTERNAL ERROR
		if (error) {
			if((''+error).indexOf('SSL routines') < 0) {
				logger.error("Internal Error looking up URL: " + error);
			}
		// -----BAD RESPONSE
		} else if (response.statusCode != 200) {
			// irc.action(context, 'slaps ' + from);
		// -----ALL SYSTEMS GO
		} else {
			callback(error, response, body);
		}
		delete error, response, body;
	});
}

module.exports.post = function (uri, toPost, callback) {
	request.post(
		requestObject,
		{ form: toPost }, 
		function (error, response, body) {
			// -----INTERNAL ERROR
			if (error) {
				if((''+error).indexOf('SSL routines') < 0) {
					logger.error("Internal Error looking up URL: " + error);
				}
			// -----BAD RESPONSE
			} else if (response.statusCode != 200) {
				// irc.action(context, 'slaps ' + from);
			// -----ALL SYSTEMS GO
			} else {
				callback(error, response, body);
			}
			delete error, response, body;
			}
	);
}

module.exports.put = function () {		
// TODO
}
