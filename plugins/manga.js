// http://mangafox.me/rss/fairy_tail.xml
var mangaDB = new DB.Json({filename: "manga"}),
	ent = require('./lib/entities.js'),
	sys = require('sys'),
	fs = require('fs');

function addTimers() {
	var entry, time = 0; // deviate by +1s per entry so none trigger at the same time.
	Object.keys(mangaDB.getAll()).forEach(function (manga) {
		entry = mangaDB.getOne(manga);
		timers.Add(entry.freq+time, checkManga, manga);
		entry = null;
		time += 1000;
	});
}

function checkAllManga() {
	var time = 0; // lets give it a gap between each request.
	Object.keys(mangaDB.getAll()).forEach(function (manga) {
		setTimeout(function () {
			checkManga(manga);
		}, time);
		time += 1000;
	});
}

addTimers();

function checkManga(manga, context, first) {
	var huzzah, title, link, last, messages, date, sent,
		strip = (!first ? " | head -n 18 | tail -n 2" : " | head -n 20 | tail -n 4"),
		entry = mangaDB.getOne(manga);
	//logger.debug("checkManga("+[manga, context, first].join(", ")+") called");
	if (!entry) {
		logger.debug("[manga] check("+[manga, context].join(", ")+") called, manga doesn't exist");
		return;
	}
	sys.exec("curl -# "+entry.url+strip, function (error, stdout, stderr) {
		stdout = stdout.split("\n");
		title = /<title>(.*)<\/title>/i.exec(stdout[0]);
		if (!title) {
			logger.debug("No response from "+entry.url);
			return; // mangafox hasn't responded appropriately. let's just wait.
		}
		title = ent.decode(title[1]);
		if (title === entry.title) {
			if (context) {
				if (!entry.link) {
					entry.link = /<link>(.*)<\/link>/i.exec(stdout[1])[1];
					mangaDB.saveOne(manga, entry);
				}
				irc.say(context, "No update for "+manga+"; Latest: "+entry.title+" ~ "+entry.link);
			}
			return;
		}
		entry.title = title;
		entry.link = /<link>(.*)<\/link>/i.exec(stdout[1])[1];
		mangaDB.saveOne(manga, entry);
		if (entry.announce.length === 0) return;
		entry.announce.forEach(function (target) {
			if (first) {
				date = /<pubDate>(.*)<\/pubDate>/i.exec(stdout[3])[1];
				huzzah = entry.title+" was released on "+date+" ~ "+entry.link;
			} else {
				huzzah = "New release! "+entry.title+" is out \\o/ ~ "+entry.link;
			}
			if (target[0] === "#") {
				irc.say(target, huzzah);
				last = target;
			} else {
				sent = false;
				ial.Channels().forEach(function (chan) {
					if (!sent) {
						ial.Nicks(chan).forEach(function (nick) {
							if (!sent && nick === target) {
								irc.notice(nick, huzzah);
								sent = true;
							}
						});
					}
				});
				if (!sent && last) {
					// will have to assume this person goes to one of the announce channels.
					messages = fs.readFileSync("data/messages.txt").toString().split("\n");
					huzzah = last+"@"+target+": "+huzzah;
					if (!messages.some(function (line) { return (huzzah === line); })) {
						fs.appendFile("data/messages.txt", "\n"+huzzah);
					}
				}
			}
		});
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
		var feed, reg, list, manga, tmp,
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
								if (permissions.isAdmin(input.user)) {
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
							if (reg[1][0] !== '#' && reg[1] !== input.from && !permissions.isAdmin(input.user)) {
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
			case "update":
				reg = /(.*) every ([0-9]+) ?(m|minutes|h|hour|hours)/i.exec(args.slice(1).join(" "));
				globals.lastReg = reg;
				if (!reg) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"mw update <manga title> every <Nm/Nh> - Example: "+config.command_prefix+
						"mw update Naruto every 30m");
					return;
				}
				feed = mangaDB.getOne(reg[1]);
				if (!feed) {
					irc.say(input.context, "Couldn't find \""+reg[1]+"\" in the manga watch list. Pantsu.");
					return;
				}
				tmp = feed.freq;
				if (reg[3].match(/m|minutes/)) feed.freq = parseInt(reg[2])*60000;
				else feed.freq = parseInt(reg[2])*3600000;
				if (tmp === feed.freq) {
					irc.say(input.context, "Already checking "+reg[1]+" every "+reg[2]+reg[3]+".");
					return;
				}
				if (feed.freq < 600000) {
					irc.say(input.context, "I wont check more often than once every 10 minutes.");
					return;
				}
				mangaDB.saveOne(reg[1], feed);
				irc.say(input.context, "Will now check for "+reg[1]+" updates every "+reg[2]+reg[3]+".");
				timers.Remove(tmp, checkManga, reg[1]);
				timers.Add(feed.freq, checkManga, reg[1]);
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
				mangaDB.saveOne(reg[1], {
					url: reg[2],
					addedBy: input.from,
					announce: [ input.context ],
					freq: 600000
				});
				setTimeout(function () {
					checkManga(reg[1], input.context, true);
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
				if (manga === "all") checkAllManga();
				else {
					if (!manga) { irc.say(input.context, this.command.syntax); return; }
					checkManga(manga, input.context);
				}
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

