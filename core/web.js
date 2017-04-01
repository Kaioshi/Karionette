"use strict";

const lib = plugin.import("lib"),
	run = plugin.import("require")("child_process").execFile;

class Web {
	constructor() {
		this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36";
		this._notFoundFeels = [
			":(", "D:", ":V", ">:(", "Sorry!", ":\\",
			"I'm not sorry.", "You only have yourself to blame.",
			"Look what you did.", "For shame.",
		];
	}
	notFound() { return `Couldn't find it. ${lib.randSelect(this._notFoundFeels)}`; }
	fetch(uri, opts) {
		return new Promise((resolve, reject) => {
			let args = [ "--compressed", "-sSL", encodeURI(uri) ];
			if (!opts || !opts.nouseragent)
				args.push(`-A "${this.userAgent}"`);
			if (opts && opts.headers && Array.isArray(opts.headers) && opts.headers.length)
				opts.headers.forEach(h => { args.push("-H"); args.push(h); })
			opts = opts || { opts: { timeout: 15000, maxBuffer: 524288 } };
			run("curl", args, opts.opts, function (error, stdout, stderr) {
				if (error) {
					if (error.code === "ENOENT") {
						logger.error("You need to install curl on the system.");
						throw new Error("curl is not installed.");
					} // quietly error. this maxBuffer stops us downloading huge files
					if (error.message && error.message === "stdout maxBuffer exceeded") {
						logger.debug("exceeded max length: "+opts.opts.maxBuffer);
						return;
					}
					throw new Error(error);
				}
				if (stderr.length)
					reject(new Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
				else
					resolve(stdout);
			});
		});
	}
	fetchAsync(uri, opts, callback) {
		let args = [ "--compressed", "-sSL", encodeURI(uri) ];
		if (!opts || !opts.nouseragent)
			args.push(`-A "${this.userAgent}"`);
		if (opts && opts.headers && Array.isArray(opts.headers) && opts.headers.length)
			opts.headers.forEach(h => { args.push("-H"); args.push(h); });
		opts = opts || { opts: { timeout: 15000 } };
		run("curl", args, opts.opts, function (error, stdout, stderr) {
			if (error && error.code === "ENOENT") {
				logger.error("You need to install curl on the system.");
				return callback(new Error("curl is not installed."));
			}
			if (stderr.length)
				return callback(new Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
			return callback(null, stdout);
		});
	}
	jsonAsync(uri, opts, callback) {
		this.fetchAsync(uri, opts, (err, stdout) => {
			if (err)
				return callback(err);
			return callback(null, JSON.parse(stdout));
		});
	}
	googleSearchAsync(uri, callback) {
		this.jsonAsync(uri, null, (err, g) => {
			if (err)
				return callback(err);
			if (g.error)
				throw new Error("web.googleSearchAsync: "+g.error.message);
			if (g.queries.request[0].totalResults === "0")
				return callback(null, { notFound: true });
			return callback(null, {
				items: g.items.map(function (item) {
					return {
						title: lib.singleSpace(item.title),
						url: item.link,
						content: String(item.snippet).replace(/\x01|\n|\t|\r/g, "")
					};
				})
			});
		});
	}
	googleAsync(term, maxResults, callback) {
		const uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&q=${term.trim()}`;
		this.googleSearchAsync(uri, callback);
	}
	json(uri, opts) { return this.fetch(uri, opts).then(JSON.parse); }
	googleSearch(uri) {
		return this.json(uri).then(g => {
			if (g.error)
				throw new Error("web.googleSearch: "+g.error.message);
			if (g.queries.request[0].totalResults === "0")
				return { notFound: true };
			return {
				items: g.items.map(function (item) {
					return {
						title: lib.singleSpace(item.title),
						url: item.link,
						content: String(item.snippet).replace(/\x01|\n|\t|\r/g, "")
					};
				})
			}
		});
	}
	google(term, maxResults) {
		const uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&q=${term.trim()}`;
		return this.googleSearch(uri);
	}
	googleImage(term, maxResults) {
		const uri = `https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&searchType=image&q=${term.trim()}`;
		return this.googleSearch(uri);
	}
	bing(term, maxResults) {
		const uri = "https://api.datamarket.azure.com/Bing/SearchWeb/Web?$format=json&Query='"+
			term+"'&Adult='Off'&Market='en-us'&$top="+(maxResults ? maxResults : 1),
			auth = plugin.import("Buffer").from(config.api.bing+":"+config.api.bing).toString("base64");
		return this.json(uri, { headers: [ "Authorization: Basic "+auth ] }).then(b => {
			if (!b.d.results.length)
				return { notFound: true };
			return { items: b.d.results.map(function (item) { return { title: lib.singleSpace(item.Title), url: item.Url, content: item.Description }; }) };
		});
	}
	bingAsync(term, maxResults, callback) {
		const uri = "https://api.datamarket.azure.com/Bing/SearchWeb/Web?$format=json&Query='"+
			term+"'&Adult='Off'&Market='en-us'&$top="+(maxResults ? maxResults : 1),
			auth = plugin.import("Buffer").from(config.api.bing+":"+config.api.bing).toString("base64");
		this.jsonAsync(uri, { headers: [ "Authorization: Basic "+auth ] }, (err, b) => {
			if (err)
				return callback(err);
			if (!b.d.results.length)
				return callback(null, { notFound: true });
			return callback(null, { items: b.d.results.map(function (item) { return { title: lib.singleSpace(item.Title), url: item.Url, content: item.Description }; })})
		});
	}
	youtubeSearch(searchTerm) {
		const uri = `https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q=${searchTerm}&safeSearch=none&type=video&fields=items&key=${config.api.youtube}`;
		return this.json(uri).then(resp => {
			if (!resp.items.length)
				throw new Error(searchTerm+" is not a thing on YouTube. "+lib.randSelect(this._notFoundFeels));
			else
				return this.youtubeByID(resp.items[0].id.videoId);
		});
	}
	youtubeByID(id) {
		const uri = `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${config.api.youtube}&part=snippet,contentDetails,statistics`;
		return this.json(uri).then(yt => {
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
	}
}

plugin.export("web", new Web());
