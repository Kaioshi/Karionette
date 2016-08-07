"use strict";

const lib = plugin.import("lib"),
	run = plugin.import("require")("child_process").execFile;

class Web {
	constructor() {
		this._notFoundFeels = [
			":(", "D:", ":V", ">:(", "Sorry!", ":\\",
			"I'm not sorry.", "You only have yourself to blame.",
			"Look what you did.", "For shame.",
		];
	}
	fetch(uri, opts) {
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
				return callback(new Error("curl is not installed."));
			}
			if (stderr.length)
				return callback(new Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
			return callback(null, stdout);
		});
	}
	json(uri, opts) { return this.fetch(uri, opts).then(JSON.parse); }
	googleSearch(uri) {
		return this.json(uri).then(g => {
			if (g.error)
				throw new Error(`Google: ${g.error.message}`);
			if (g.queries.request[0].totalResults === "0")
				throw new Error(`Couldn't find it. ${lib.randSelect(this._notFoundFeels)}`);
			const ret = [];
			for (let i = 0; i < g.items.length; i++) {
				const item = g.items[i];
				ret.push({
					title: lib.singleSpace(item.title),
					url: item.link,
					content: String(item.snippet).replace(/\x01|\n|\t|\r/g, "")
				});
			}
			return ret;
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
			auth = Buffer.from(config.api.bing+":"+config.api.bing).toString("base64");
		return this.json(uri, { headers: { "Authorization": "Basic "+auth } }).then(b => {
			if (!b.d.results.length)
				throw new Error("Couldn't find it. "+lib.randSelect(this._notFoundFeels));
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
	}
	youtubeSearch(searchTerm) {
		const uri = "https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q="+searchTerm+
			"&safeSearch=none&type=video&fields=items&key="+config.api.youtube;
		return this.json(uri).then(resp => {
			if (!resp.items.length)
				throw new Error(searchTerm+" is not a thing on YouTube. "+lib.randSelect(this._notFoundFeels));
			else
				return this.youtubeByID(resp.items[0].id.videoId);
		});
	}
	youtubeByID(id) {
		const uri = "https://www.googleapis.com/youtube/v3/videos?id="+id+"&key="+config.api.youtube+"&part=snippet,contentDetails,statistics";
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
	// TODO don't use this :D
	atom2json(uri, handle) { // this is super buggy. so many corner cases.
		const getXMLSection = function (line, section) {
			return line.slice(line.indexOf("<"+section+">")+section.length+2, line.indexOf("</"+section+">")).trim();
		};

		return this.fetch(uri).then(function (source) {
			if (source.indexOf("<entry>") === -1) {
				if (handle)
					return { name: handle, items: [] };
				return { items: [] };
			}
			let atom = source.replace(/\n/g, "");
			atom = atom.slice(atom.indexOf("<entry>"), atom.lastIndexOf("</entry>")+8);
			atom = atom.replace(/<id>[^<]+<\/id>|<media:[^>]+\/>|<content type=\"html\">[^<]+<\/content>|<author>|<\/author>/g, "")
				.replace(/<link ?((?!href).)*href=\"([^\"]+)\" ?\/>/g, "<link>$2</link>")
				.replace(/<entry>/g, "").match(/\S+/g).join(" ").split("</entry>").slice(0,-1);
			const ret = atom.map(function (entry) {
				return {
					title: getXMLSection(entry, "title"),
					link: getXMLSection(entry, "link"),
					name: getXMLSection(entry, "name"),
					updated: getXMLSection(entry, "updated")
				};
			});
			if (handle)
				return { name: handle, items: ret };
			return { items: ret };
		});
	}
}

plugin.export("web", new Web());
