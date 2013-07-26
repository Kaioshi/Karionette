// http://mangafox.me/rss/fairy_tail.xml
var mangaDB = new DB.Json({filename: "manga"}),
	ent = require('./lib/entities.js'),
	sys = require('sys'),
	fs = require('fs');

function checkAll() {
	Object.keys(mangaDB.getAll()).forEach(function (manga) {
		checkManga(manga);
	});
}

timers.Add(600000, checkAll);

function checkManga(manga, context) {
	var huzzah,
		entry = mangaDB.getOne(manga);
	if (!entry) {
		logger.debug("[manga] check("+[manga, context].join(", ")+") called, manga doesn't exist");
		return;
	}
	sys.exec("curl -# "+entry.url+
		" | grep -E -o \"<title>.*</title>\" | grep -E -o \">.*<\" | grep -E -o \"[^<>]*\" | grep -v \"Manga Fox\" | head -n 2", 
		function (error, stdout, stderr) {
		stdout = stdout.split("\n")[1];
		if (stdout !== entry.title) {
			if (entry.announce.length > 0) {
				entry.announce.forEach(function (target) {
					huzzah = "New release! "+ent.decode(stdout)+" is out. \\o/";
					if (target[0] === "#") irc.say(target, huzzah);
					else irc.notice(target, huzzah);
				});
			}
			entry.title = stdout;
			mangaDB.saveOne(manga, entry);
		} else {
			if (context) irc.say(context, "No update for "+manga+" ~ Latest: "+entry.title);
		}
	});
}

listen({
	plugin: "mangawatch",
	handle: "mangawatch",
	regex: regexFactory.startsWith(["mangawatch", "mw"]),
	command: {
		root: "mangawatch",
		options: "add, remove, check, list",
		syntax: "[Help] Syntax: "+config.command_prefix+
			"mw <add/remove/check/list/announce> - Example: "+config.command_prefix+"mw check Noblesse"
	},
	callback: function (input, match) {
		var feed, reg, list, manga,
			args = match[1].split(" ");
		switch (args[0]) {
			case "announce":
				switch (args[1]) {
					case "add":
						reg = /^([^ ]+) (.*)/.exec(args.slice(2).join(" "));
						if (!reg) {
							irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw announce add <#channel/nick> <manga>");
							return;
						}
						feed = mangaDB.getOne(reg[2]);
						if (!feed) {
							irc.say(input.context, "Couldn't find \""+reg[2]+"\" in the manga watch list - you need to add it first.");
							return;
						}
						if (feed.announce && feed.announce.length >= 3) {
							irc.say(input.context, reg[2]+"'s announce list is at maximum. Remove one to add another, or suffer in silence.");
							return;
						}
						if (feed.announce.some(function (entry) { return (entry === reg[1]); })) {
							irc.say(input.context, reg[2]+" is already announcing to "+reg[1]);
							return;
						}
						if (reg[1][0] === '#') {
							if (ial.Channels().some(function (chan) { return (chan === reg[1]); })) {
								irc.say(input.context, "Added "+reg[1]+" to the announce list for "+reg[2]);
								feed.announce.push(reg[1]);
								mangaDB.saveOne(reg[2], feed);
								return;
							} else {
								irc.say(input.context, "I'm not on "+reg[1]+", so I can't announce to it.");
								return;
							}
						} else {
							// need to be an admin to add someone who isn't you
							if (reg[1] !== input.from) {
								if (ial.isAdmin(input.user)) {
									irc.say(input.context, "Adding "+reg[1]+" to "+reg[2]+"'s announce list, since you're an admin.");
									feed.announce.push(reg[1]);
									mangaDB.saveOne(reg[2], feed);
								} else {
									irc.say(input.context, "You can only add yourself or channels.");
								}
							} else {
								irc.reply(input, "Added you to "+reg[2]+"'s announce list.");
								feed.announce.push(reg[1]);
								mangaDB.saveOne(reg[2], feed);
							}
						}
						break;
					case "remove":
						reg = /^([^ ]+) (.*)/.exec(args.slice(2).join(" "));
						if (!reg) {
							irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw announce remove <#channel/nick> <manga>");
							return;
						}
						feed = mangaDB.getOne(reg[2]);
						if (!feed) {
							irc.say(input.context, "Couldn't find \""+reg[2]+"\" in the manga watch list. Pantsu.");
							return;
						}
						if (feed.announce.some(function (entry) { return (entry === reg[1]); })) {
							if (reg[1][0] !== '#' && reg[1] !== input.from && !ial.isAdmin(input.user)) {
								irc.say(input.context, "You need to be an admin to remove people other than yourself.");
								return;
							}
							irc.say(input.context, "Removed "+reg[1]+" from the announce list for "+reg[2]+".");
							feed.announce = feed.announce.filter(function (entry) { return (entry !== reg[1]); });
							mangaDB.saveOne(reg[2], feed);
						} else {
							irc.say(input.context, reg[1]+" is not in the announce list for "+reg[2]+".");
						}
						break;
					case "list":
						manga = args.slice(2).join(" ");
						if (!manga) {
							irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw announce list <manga>");
							return;
						}
						feed = mangaDB.getOne(manga);
						if (!feed) {
							irc.say(input.context, "Couldn't find \""+manga+"\" in the manga watch list. Pantsu.");
							return;
						}
						if (feed.announce.length > 0) {
							irc.say(input.context, manga+" updates are announced to: "+feed.announce.join(", "));
						} else {
							irc.say(input.context, manga+" has no announce targets set.");
						}
						break;
					default:
						break;
				}
				break;
			case "add":
				reg = /^(.*) (https?:\/\/mangafox.me\/rss\/[^ \.]+\.xml)$/i.exec(args.slice(1).join(" "));
				if (!reg) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"mw add Manga Name http://mangafox.me/rss/<manga>.xml - Example: "+config.command_prefix+
						"mw add One Piece http://mangafox.me/rss/one_piece.xml");
					return;
				}
				if (mangaDB.getOne(reg[1])) {
					irc.say(input.context, reg[1]+" is already in the manga watch list.");
					return;
				}
				mangaDB.saveOne(reg[1], { url: reg[2], addedBy: input.from, announce: [ input.context ]});
				setTimeout(function () {
					checkManga(reg[1], input.context);
				}, 1000); // let the db get updated.
				irc.say(input.context, "Added "+reg[1]+" to the manga watch list.");
				break;
			case "remove":
				manga = args.slice(1).join(" ");
				if (!manga) { irc.say(input.context, this.command.syntax); return; }
				if (mangaDB.getOne(manga)) {
					mangaDB.removeOne(manga);
					irc.say(input.context, "Removed "+manga+" from the manga watch list.");
				} else {
					irc.say(input.context, manga+" is not in the manga watch list.");
				}
				break;
			case "check":
				manga = args.slice(1).join(" ");
				if (!manga) { irc.say(input.context, this.command.syntax); return; }
				checkManga(manga, input.context);
				break;
			case "list":
				list = Object.keys(mangaDB.getAll());
				if (list.length > 0) irc.say(input.context, list.join(", "));
				else irc.say(input.context, "There are no entries in the manga watch list yet.");
				break;
			default:
				irc.say(input.context, this.command.syntax);
				break;
		}
	}
});

