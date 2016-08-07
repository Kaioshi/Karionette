// combined mangafox / mangastream
"use strict";

const [DB, lib, web, ticker, ial, fs] = plugin.importMany("DB", "lib", "web", "ticker", "ial", "fs"),
	mangaDB = {
		mangafox: new DB.Json({filename: "manga/mangafox"}),
		mangastream: new DB.Json({filename: "manga/mangastream"}),
		batoto: new DB.Json({filename: "manga/batoto"})
	};

function isNewRelease(release, manga) {
	if (!manga.latest || !manga.latest.length)
		return true;
	let newest = 0;
	for (let i = 0; i < manga.latest.length; i++) {
		if (!Number.isInteger(manga.latest[i])) //cruft
			manga.latest[i] = manga.latest[i].date;
		newest = manga.latest[i] > newest ? manga.latest[i] : newest;
	}
	if (release.date > newest) {
		manga.latest.push(release.date);
		if (manga.latest.length > 5)
			manga.latest.shift();
		return true;
	}
}

function findUpdates(type, releases) {
	let hadUpdates = false, isOnline = {};
	for (let i = 0; i < mangaDB[type].data.keys.length; i++) {
		const title = mangaDB[type].data.keys[i],
			manga = mangaDB[type].data.obj[title];
		for (let k = 0; k < releases.length; k++) {
			if (!releases[k].title.toLowerCase().includes(title) || !isNewRelease(releases[k], manga))
				continue;
			const release = releases[k], releaseMessage = `${lib.decode(release.title)} is out \\o/ ~ ${release.link}`;
			hadUpdates = true;
			for (let n = 0; n < manga.announce.length; n++) {
				const target = manga.announce[n];
				if (target[0] === "#")
					irc.say(target, releaseMessage, true);
				else {
					isOnline[target] = isOnline[target] || (ial.User(target) ? "online" : "offline");
					if (isOnline[target] !== "offline")
						irc.notice(target, releaseMessage, true);
					else
						bot.queueMessage({ method: "notice", nick: target, message: releaseMessage });
				}
			}
			mangaDB[type].saveOne(title, manga);
		}
	}
	return hadUpdates;
}

function checkOne(type, context) {
	if (!mangaDB[type].size()) {
		if (context)
			irc.say(context, `I'm  not tracking any releases on ${type}.`);
		return;
	}
	lib.runCallback(function *(cb) { try {
		const releases = JSON.parse(yield web.fetchAsync("http://felt.ninja:5667/?source="+type, null, cb));
		if (!findUpdates(type, releases, context) && context)
			irc.say(context, "Nothing new. :\\");
	} catch (err) {
		logger.error(`manga - checkOne: ${err.message}`, err);
	}});
}

function checkAll() {
	lib.runCallback(function *(cb) { try {
		const all = [ "mangafox", "mangastream", "batoto" ].filter(type => mangaDB[type].size() > 0),
			releases = JSON.parse(yield web.fetchAsync("http://felt.ninja:5667/", null, cb));
		all.forEach(type => findUpdates(type, releases.filter(rel => rel.source === type)));
	} catch (err) {
		logger.error(`manga - checkAll: ${err.message}`, err);
	}});
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
		titles = mangaDB[type].data.keys.map(title => mangaDB[type].data.obj[title].title);
		if (titles.length)
			irc.say(input.context, "I'm tracking releases of "+lib.commaList(lib.sort(titles))+" from "+sourceName+".");
		else
			irc.say(input.context, "I'm not tracking any "+sourceName+" releases right now. Add some!");
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
			let FragDB = plugin.import("require")("./lib/fragDB.js")(lib, logger, fs),
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
