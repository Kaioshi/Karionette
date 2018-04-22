// @ts-check
"use strict";

const lib = plugin.import("lib");
const run = plugin.import("require")("child_process").execFile;
const USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36";
const notFoundFeels = [
	":(", "D:", ":V", ">:(", "Sorry!", ":\\", ":<", ">:\\",
	"I'm not sorry.", "You only have yourself to blame.",
	"Look what you did.", "For shame.", "Sorry, not sorry."
];

function curl(args, opts) {
	return new Promise((resolve, reject) => {
		run("curl", args, opts, (error, stdout, stderr) => {
			if (error) {
				if (error.message && error.message === "stdout maxBuffer exceeded") {
					logger.debug("> maxBuffer: "+stdout.length);
					return resolve(stdout);
				}
				switch (error.code) {
				case "ENOENT":
					logger.error("You need to install curl on the system.");
					return reject(new Error("curl is not installed."));
				case 6: // DNS error, let stderr reject it
					break;
				default:
					return reject(error);
				}
			}
			if (stderr.length)
				return reject(new Error(stderr.replace(/\n|\t|\r|curl: /g, "")));
			resolve(stdout);
		});
	});
}

function notFound() {
	return `Couldn't find it. ${lib.randSelect(notFoundFeels)}`;
}

async function fetch(link, opts) {
	try {
		let args = [ "--compressed", "-sSL", encodeURI(link) ];
		if (!opts || !opts.nouseragent)
			args.push(`-A "${USERAGENT}"`);
		if (opts) {
			if (opts.headers && Array.isArray(opts.headers) && opts.headers.length)
				opts.headers.forEach(h => { args.push("-H"); args.push(h); });
			if (opts.post && Array.isArray(opts.post) && opts.post.length)
				opts.post.forEach(p => { args.unshift(p); args.unshift("-d"); });
		}
		opts = opts || { opts: { timeout: 15000, maxBuffer: 524288 } };
		const body = await curl(args, opts.opts);
		return body;
	} catch (err) {
		throw new Error(`[web.fetch(${link})]\n${err}`);
	}
}

async function json(uri, opts) {
	try {
		return JSON.parse(await fetch(uri, opts));
	} catch (err) {
		throw new Error("Couldn't parse JSON from "+uri);
	}
}

async function googleSearch(uri) {
	const g = await json(uri);
	if (g.error)
		throw new Error(`[web.googleSearch]: ${g.error.message}`);
	if (g.queries.request[0].totalResults === "0")
		return { notFound: true };
	return {
		items: g.items.map(item => {
			return {
				title: lib.singleSpace(item.title),
				url: item.link,
				content: String(item.snippet).replace(/[\x01\n\t\r]/g, "")
			};
		})
	};
}

function google(term, maxResults) {
	return googleSearch(`https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&q=${term.trim()}`);
}

function googleImage(term, maxResults) {
	return googleSearch(`https://www.googleapis.com/customsearch/v1?key=${config.api.googlesearch}&cx=002465313170830037306:5cfvjccuofo&num=${maxResults || 1}&prettyPrint=false&searchType=image&q=${term.trim()}`);
}

async function youtubeSearch(searchTerm) {
	const resp = await json(`https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&q=${searchTerm}&safeSearch=none&type=video&fields=items&key=${config.api.youtube}`);
	if (!resp.items.length)
		throw new Error(`${searchTerm} is not a thing on YouTube. ${lib.randSelect(notFoundFeels)}`);
	else
		return youtubeByID(resp.items[0].id.videoId);
}

async function youtubeByID(id) {
	const uri = `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${config.api.youtube}&part=snippet,contentDetails,statistics&fields=items(id,statistics(viewCount),contentDetails(duration),snippet(publishedAt,title,channelTitle))`;
	const yt = await json(uri);
	if (yt.error)
		throw new Error(yt.error.errors[0]);
	return {
		date: yt.items[0].snippet.publishedAt,
		title: yt.items[0].snippet.title,
		channel: yt.items[0].snippet.channelTitle,
		views: (yt.items[0].statistics ? yt.items[0].statistics.viewCount : "unknown"),
		duration: yt.items[0].contentDetails.duration.slice(2).toLowerCase(),
		link: `https://youtube.com/watch?v=${yt.items[0].id}`
	};
}

async function rss2json(link) {
	const result = await json(`https://api.rss2json.com/v1/api.json?rss_url=${link}`);
	return result;
}

plugin.export("web", {
	fetch,
	json,
	google,
	googleImage,
	youtubeByID,
	youtubeSearch,
	rss2json,
	notFound
});
