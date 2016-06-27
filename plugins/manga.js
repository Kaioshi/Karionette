// combined mangafox / mangastream
"use strict";
let mangaDB = {
		mangafox: new DB.Json({filename: "manga/mangafox"}),
		mangastream: new DB.Json({filename: "manga/mangastream"}),
		batoto: new DB.Json({filename: "manga/batoto"})
	},
	check = {
		all: function (notify) {
			let all = [ "mangafox", "mangastream", "batoto" ]
				.filter(function (m) { return mangaDB[m].getKeys().length; });
			if (!all.length) {
				logger.debug("Nothing to check");
				return;
			}
			web.json("http://felt.ninja:5667/").then(function (resp) {
				all.forEach(function (type) {
					findUpdates(resp.filter(function (rel) { return rel.source === type; }), type, notify);
				});
			}).catch(function (err) {
				logger.error("check.all(): "+err, err);
			});
		},
		one: function (type, notify) {
			if (!mangaDB[type].getKeys().length) {
				if (notify)
					irc.say(notify, "I'm not tracking any releases on "+type+".");
				return;
			}
			web.json("http://felt.ninja:5667/?source="+type).then(function (resp) {
				findUpdates(resp, type, notify);
			}).catch(function (err) {
				logger.error("check."+type+": "+err, err);
			});
		}
	};

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

function updateAnnouncements(announce, msg, updates) {
	for (let i = 0; i < announce.length; i++) {
		if (announce[i][0] === "#") {
			if (!ial.User(config.nick).ison(announce[i]))
				updates.push([ "say", announce[i], msg ]);
			else
				logger.debug("Tried to send a manga update to "+announce[i]+", but I'm not on it.");
		} else {
			if (ial.User(announce[i])) {
				updates.push([ "notice", announce[i], msg ]); // notice users
			} else { // user not found :S
				bot.queueMessage({
					method: "notice",
					nick: announce[i],
					message: msg
				});
			}
		}
	}
}

function isNewRelease(date, latest, title) {
	let i, newest;
	if (!latest || !Array.isArray(latest) || !latest.length)
		return true;
	for (i = 0, newest = 0; i < latest.length; i++) {
		if (latest[i].title === title)
			return false;
		if (latest[i].date > newest)
			newest = latest[i].date;
	}
	if (date > newest)
		return true;
	return false;
}

function setLatest(entry, release, date) {
	entry.latest = entry.latest || [];
	entry.latest.push({ title: release.title, link: release.link, date: date });
	if (entry.latest.length > 5)
		entry.latest.shift();
}

function findUpdates(releases, type, notify) {
	let updates = [];
	Object.keys(releases).forEach(function (r) {
		mangaDB[type].getKeys().forEach(function (title) {
			let date, reltitle,
				mangaEntry = mangaDB[type].getOne(title),
				index = releases[r].title.toLowerCase().indexOf(title);
			if (index === -1)
				return; // NEXT!
			reltitle = releases[r].title.slice(index, index+title.length);
			date = new Date(releases[r].date).valueOf();
			if (isNewRelease(date, mangaEntry.latest, releases[r].title)) { // new release~
				mangaEntry.title = reltitle; // make the case nice if the user put in something weird.
				index = releases[r].link.indexOf("?"); // weird unrequired trailing ?foo=butts&butts=foo stuff.
				if (index > -1)
					releases[r].link = releases[r].link.slice(0, index);
				setLatest(mangaEntry, releases[r], date);
				mangaDB[type].saveOne(title, mangaEntry);
				updateAnnouncements(mangaEntry.announce, lib.decode(releases[r].title)+" is out! \\o/ ~ "+releases[r].link, updates);
			}
		});
	});
	if (updates.length) {
		irc.rated(updates);
	} else if (typeof notify === "string") {
		irc.say(notify, "Nothing new. :\\");
	}
}

bot.event({
	handle: "mangaCheck",
	event: "Ticker: 300s tick", // check for updates every 5 min
	callback: check.all
});

bot.event({ // check for updates when we start and joins are done
	handle: "mangaCheckOnStart",
	event: "autojoinFinished",
	callback: check.all
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
	let type, title, ltitle, titles, target, ltarget, i, changed, entry;

	switch (input.command) {
	case "mf":
	case "mangafox":
		type = [ "mf", "mangafox", "MangaFox" ];
		break;
	case "ms":
	case "mangastream":
		type = [ "ms", "mangastream", "MangaStream" ];
		break;
	case "batoto":
		type = [ "batoto", "batoto", "Batoto" ];
		break;
	}

	if (!input.args || input.args[0].toLowerCase() === "announce" && !input.args[1]) {
		irc.say(input.context, bot.cmdHelp(type[0], "syntax"));
		return;
	}
	switch (input.args[0].toLowerCase()) {
	case "announce":
		switch (input.args[1].toLowerCase()) {
		case "add":
			if (input.args.length < 4) {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce add <manga title> <target> - Example: "+
					config.command_prefix+type[1]+" announce add One Piece #pyoshi");
				return;
			}
			title = input.args.slice(2,-1).join(" ");
			ltitle = title.toLowerCase();
			entry = mangaDB[type[1]].getOne(ltitle);
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
			mangaDB[type[1]].saveOne(ltitle, entry);
			irc.say(input.context, "Added! o7");
			break;
		case "remove":
			if (input.args.length < 4) {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce remove <manga title> <target> - Example: "+
					config.command_prefix+type[1]+" announce remove Fairy Tail #pyoshi");
				return;
			}
			title = input.args.slice(2,-1).join(" ");
			ltitle = title.toLowerCase();
			entry = mangaDB[type[1]].getOne(ltitle);
			if (entry === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			target = input.args[input.args.length-1];
			ltarget = target.toLowerCase();
			for (i = 0; i < entry.announce.length; i++) {
				if (entry.announce[i].toLowerCase() === ltarget) {
					entry.announce.splice(i, 1);
					irc.say(input.context, "Removed. o7");
					changed = true;
					mangaDB[type[1]].saveOne(ltitle, entry);
					break;
				}
			}
			if (!changed)
				irc.say(input.context, target+" isn't on the announce list for "+title+".");
			break;
		case "list":
			if (input.args.length < 3) {
				irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" announce list <manga title> - Example: "+
					config.command_prefix+type[1]+" announce list One Piece");
				return;
			}
			title = input.args.slice(2).join(" ");
			ltitle = title.toLowerCase();
			entry = mangaDB[type[1]].getOne(ltitle);
			if (entry === undefined) {
				irc.say(input.context, "I'm not tracking \""+title+"\" updates, so there's no announce list for it.");
				return;
			}
			irc.say(input.context, entry.title+" releases are announced to "+lib.commaList(lib.sort(entry.announce))+".");
			break;
		default:
			irc.say(input.context, "[Help] "+config.command_prefix+type[1]+
				" announce <add/remove/list> <manga title> [<target>] - Example: "+config.command_prefix+type[1]+
				" announce add One Piece #pyoshi");
			break;
		}
		break;
	case "add":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+type[1]+" add <manga title> - Example: "+
				config.command_prefix+type[1]+" add One Piece - Check "+
				(type[0] === "mf" ? "http://mangafox.me/directory/" : "http://mangastream.com/manga")+" to see what's available.");
			return;
		}
		title = input.args.slice(1).join(" ");
		ltitle = title.toLowerCase();
		entry = mangaDB[type[1]].getOne(ltitle);
		if (entry !== undefined) {
			irc.say(input.context, "I'm already tracking "+title+" updates.");
			return;
		}
		entry = { title: title, announce: [ input.context ] };
		mangaDB[type[1]].saveOne(ltitle, entry);
		irc.say(input.context, "Added! o7");
		check.one(type[1]);
		break;
	case "remove":
		if (!input.args[1]) {
			irc.say(input.context, "[Help] "+config.command_prefix+"mangafox remove <manga title> - Example: "+
				config.command_prefix+"mangafox remove Fairy Tail");
			return;
		}
		title = input.args.slice(1).join(" ");
		ltitle = title.toLowerCase();
		if (!mangaDB[type[1]].hasOne(ltitle)) {
			irc.say(input.context, "I'm not tracking "+title+".");
			return;
		}
		mangaDB[type[1]].removeOne(ltitle);
		irc.say(input.context, "Removed. o7");
		break;
	case "list":
		titles = [];
		entry = mangaDB[type[1]].getAll();
		for (title in entry) {
			if (entry.hasOwnProperty(title))
				titles.push(entry[title].title);
		}
		if (titles.length > 0) {
			irc.say(input.context, "I'm tracking releases of "+lib.commaList(lib.sort(titles))+" from "+type[2]+".");
		} else {
			irc.say(input.context, "I'm not tracking any "+type[2]+" releases right now. Add some!");
		}
		break;
	case "check":
		check.one(type[1], input.context);
		break;
	default:
		irc.say(input.context, bot.cmdHelp(type[0], "syntax"));
		break;
	}
}

ticker.start(300); // start a 5 minute ticker
convertFromFragDB();
