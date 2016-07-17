// combined mangafox / mangastream
"use strict";

const mangaDB = {
	mangafox: new DB.Json({filename: "manga/mangafox"}),
	mangastream: new DB.Json({filename: "manga/mangastream"}),
	batoto: new DB.Json({filename: "manga/batoto"})
};

function isNewRelease(release, manga) {
	let newest = 0;
	manga.latest = Array.isArray(manga.latest) ? manga.latest : []; // cruft
	manga.latest.forEach(time => newest = time > newest ? time : newest);
	if (release.date > newest) {
		manga.latest.push(release.date);
		if (manga.latest.length > 5)
			manga.latest.shift();
		return true;
	}
}

function findUpdates(type, releases) {
	const titles = mangaDB[type].getKeys(),
		isOnline = {}, updates = [];
	const filteredReleases = releases.filter(rel => titles.some(title => rel.title.toLowerCase().indexOf(title) > -1));
	titles.forEach(title => {
		const manga = mangaDB[type].getOne(title);
		filteredReleases.forEach(release => {
			if (!release.title.toLowerCase().includes(title))
				return;
			if (!isNewRelease(release, manga))
				return;
			const releaseMessage = `${lib.decode(release.title)} is out \o/ ~ ${release.link}`;
			manga.announce.forEach(target => {
				if (target[0] === "#")
					updates.push([ "say", target, releaseMessage ]);
				else {
					isOnline[target] = isOnline[target] || (ial.User(target) ? "online" : "offline");
					if (isOnline[target] !== "offline")
						updates.push([ "notice", target, releaseMessage ]);
				}
			});
			mangaDB[type].saveOne(title, manga);
		});
	});
	return updates;
}

function checkOne(type, context) {
	if (mangaDB[type].size() === 0) {
		if (context)
			irc.say(context, `I'm  not tracking any releases on ${type}.`);
		return;
	}
	web.json("http://felt.ninja:5667/?source="+type).then(releases => {
		const updates = findUpdates(type, releases, context);
		if (updates.length)
			irc.rated(updates);
		else if (context)
			irc.say(context, "Nothing new. :\\");
	}).catch(error => logger.error(`manga - checkOne: ${error.message}`, error));
}

function checkAll() {
	const all = [ "mangafox", "mangastream", "batoto" ].filter(type => mangaDB[type].size() > 0);
	let updates = [];
	web.json("http://felt.ninja:5667/").then(releases => {
		all.forEach(type => updates = updates.concat(findUpdates(type, releases.filter(rel => rel.source === type))));
		if (updates.length)
			irc.rated(updates);
	}).catch(error => logger.error(`manga - checkAll: ${error.message}`, error));
}

bot.event({
	handle: "mangaCheck",
	event: "Ticker: 300s tick", // check for updates every 5 min
	callback: checkAll
});

bot.event({ // check for updates when we start and joins are done
	handle: "mangaCheckOnStart",
	event: "autojoinFinished",
	callback: checkAll
});

bot.command({
	command: "batoto",
	help: "Batoto RSS watcher",
	syntax: config.command_prefix+"batoto <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] -"+
		" Example: "+config.command_prefix+"batoto add One Piece",
	callback: parseMangaCmd
});

bot.command({
	command: [ "mf", "mangafox" ],
	help: "Mangafox RSS watcher",
	syntax: config.command_prefix+"mangafox <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] -"+
		" Example: "+config.command_prefix+"mangafox add One Piece",
	callback: parseMangaCmd
});

bot.command({
	command: [ "ms", "mangastream" ],
	help: "MangaStream RSS watcher",
	syntax: config.command_prefix+"mangastream <add/remove/list/check> [<manga title>] / <announce add/remove/list> <manga title> [<target>] -"+
		" Example: "+config.command_prefix+"mangastream add One Piece",
	callback: parseMangaCmd
});

function parseMangaCmd(input) {
	let title, ltitle, titles, target, ltarget, changed, entry, command, type, sourceName;
	switch (input.command) {
	case "mf":
	case "mangafox":
		[command, type, sourceName] = ["mf", "mangafox", "MangaFox"];
		break;
	case "ms":
	case "mangastream":
		[command, type, sourceName] = [ "ms", "mangastream", "MangaStream" ];
		break;
	case "batoto":
		[command, type, sourceName] = [ "batoto", "batoto", "Batoto" ];
		break;
	}

	if (!input.args || input.args[0].toLowerCase() === "announce" && !input.args[1]) {
		irc.say(input.context, bot.cmdHelp(command, "syntax"));
		return;
	}
	switch (input.args[0].toLowerCase()) {
	case "announce":
		switch (input.args[1].toLowerCase()) {
		case "add":
			if (input.args.length < 4) {
				irc.say(input.context, "[Help] "+config.command_prefix+type+" announce add <manga title> <target> - Example: "+
					config.command_prefix+type+" announce add One Piece #pyoshi");
				return;
			}
			title = input.args.slice(2,-1).join(" ");
			ltitle = title.toLowerCase();
			entry = mangaDB[type].getOne(ltitle);
			if (entry === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			target = input.args[input.args.length-1];
			if (lib.hasElement(entry.announce, target)) {
				irc.say(input.context, "I'm already announcing "+title+" releases to "+target+".");
				return;
			}
			entry.announce.push(target);
			mangaDB[type].saveOne(ltitle, entry);
			irc.say(input.context, "Added! o7");
			break;
		case "remove":
			if (input.args.length < 4) {
				irc.say(input.context, "[Help] "+config.command_prefix+type+" announce remove <manga title> <target> - Example: "+
					config.command_prefix+type+" announce remove Fairy Tail #pyoshi");
				return;
			}
			title = input.args.slice(2,-1).join(" ");
			ltitle = title.toLowerCase();
			entry = mangaDB[type].getOne(ltitle);
			if (entry === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			target = input.args[input.args.length-1];
			ltarget = target.toLowerCase();
			for (let i = 0; i < entry.announce.length; i++) {
				if (entry.announce[i].toLowerCase() === ltarget) {
					entry.announce.splice(i, 1);
					irc.say(input.context, "Removed. o7");
					changed = true;
					mangaDB[type].saveOne(ltitle, entry);
					break;
				}
			}
			if (!changed)
				irc.say(input.context, target+" isn't on the announce list for "+title+".");
			break;
		case "list":
			if (input.args.length < 3) {
				irc.say(input.context, "[Help] "+config.command_prefix+type+" announce list <manga title> - Example: "+
					config.command_prefix+type+" announce list One Piece");
				return;
			}
			title = input.args.slice(2).join(" ");
			ltitle = title.toLowerCase();
			entry = mangaDB[type].getOne(ltitle);
			if (entry === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			irc.say(input.context, entry.title+" releases are announced to "+lib.commaList(lib.sort(entry.announce))+".");
			break;
		default:
			irc.say(input.context, "[Help] "+config.command_prefix+type+
				" announce <add/remove/list> <manga title> [<target>] - Example: "+config.command_prefix+type+
				" announce add One Piece #pyoshi");
			break;
		}
		break;
	case "add":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+type+" add <manga title> - Example: "+
				config.command_prefix+type+" add One Piece - Check "+
				(command === "mf" ? "http://mangafox.me/directory/" : "http://mangastream.com/manga")+" to see what's available.");
			return;
		}
		title = input.args.slice(1).join(" ");
		ltitle = title.toLowerCase();
		entry = mangaDB[type].getOne(ltitle);
		if (entry !== undefined) {
			irc.say(input.context, "I'm already tracking "+title+" updates.");
			return;
		}
		entry = { title: title, announce: [ input.context ] };
		mangaDB[type].saveOne(ltitle, entry);
		irc.say(input.context, "Added! o7");
		checkOne(type);
		break;
	case "remove":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+type+" remove <manga title> - Example: "+
				config.command_prefix+type+" remove Fairy Tail");
			return;
		}
		title = input.args.slice(1).join(" ");
		ltitle = title.toLowerCase();
		if (!mangaDB[type].hasOne(ltitle)) {
			irc.say(input.context, "I'm not tracking "+title+".");
			return;
		}
		mangaDB[type].removeOne(ltitle);
		irc.say(input.context, "Removed. o7");
		break;
	case "list":
		titles = [];
		entry = mangaDB[type].getAll();
		for (title in entry) {
			if (entry.hasOwnProperty(title))
				titles.push(entry[title].title);
		}
		if (titles.length > 0) {
			irc.say(input.context, "I'm tracking releases of "+lib.commaList(lib.sort(titles))+" from "+sourceName+".");
		} else {
			irc.say(input.context, "I'm not tracking any "+sourceName+" releases right now. Add some!");
		}
		break;
	case "check":
		checkOne(type, input.context);
		break;
	default:
		irc.say(input.context, bot.cmdHelp(command, "syntax"));
		break;
	}
}

ticker.start(300); // start a 5 minute ticker
function convertFromFragDB() { // XXX remove this after ranma has run it
	Object.keys(mangaDB).forEach(function (db) {
		let dir = "data/db/"+db;
		if (fs.existsSync(dir)) {
			logger.warn("CONVERTING FRAGDB "+db+" TO REGULAR DB");
			let FragDB = require("./lib/fragDB.js")(lib, logger, fs),
				files = fs.readdirSync(dir),
				mDB = new FragDB(db).getAll();
			mangaDB[db].saveAll(mDB);
			logger.warn("DONE");
			files.forEach(fn => fs.unlinkSync(dir+"/"+fn));
			fs.rmdirSync(dir);
		}
	});
}
convertFromFragDB();
