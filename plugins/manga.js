// http://mangafox.me/rss/fairy_tail.xml
var mangaDB = new DB.Json({filename: "manga"}),
	sys = require('sys'),
	fs = require('fs');

function checkAll() {
	Object.keys(mangaDB.getAll()).forEach(function (manga) {
		checkManga(manga);
	});
}

timers.Add(600000, checkAll);

function checkManga(manga, context) {
	var date, title,
		entry = mangaDB.getOne(manga);
	if (entry) {
		sys.exec("curl -# "+entry.url+" | head -n 20 | tail -n 4 | grep -v -E \"(<link>|<description>)\"", function (error, stdout, stderr) {
			date = /<pubDate>(.*)<\/pubDate>/.exec(stdout)[1];
			if (date !== entry.date) {
				title = /<title>(.*)<\/title>/.exec(stdout)[1];
				if (entry.announce.length > 0) {
					entry.announce.forEach(function (target) {
						irc.say(target, "New release! "+title+" was released "+lib.duration(new Date(date))+" ago.");
					});
				}
				entry.date = date;
				entry.title = title;
				mangaDB.saveOne(manga, entry);
			} else {
				if (context) irc.say(context, "No update for "+manga+" :<");
				logger.debug("No update for "+manga);
			}
		});
	} else {
		logger.debug("[manga] check("+[manga, context].join(", ")+") called, manga doesn't exist");
	}
}

listen({
	plugin: "mangawatch",
	handle: "mangawatch",
	regex: regexFactory.startsWith(["mangawatch", "mw"]),
	command: {
		root: "mangawatch",
		options: "add, remove, check, list",
		syntax: "[Help] Syntax: "+config.command_prefix+"mw <add/remove/check/list/announce> [<manga>] - Example: "+config.command_prefix+"mw check Noblesse"
	},
	callback: function (input, match) {
		var feed, reg, latest, uri, list,
			args = match[1].split(" ");
		switch (args[0]) {
			case "announce":
				switch (args[1]) {
					case "add":
						if (args[2] && args[3]) {
							feed = mangaDB.getOne(args[2]);
							if (!feed) {
								irc.say(input.context, "Couldn't find \""+args[2]+"\" in the manga watch list - you need to add it first.");
								return;
							}
							if (feed.announce && feed.announce.length >= 3) {
								irc.say(input.context, args[2]+"'s announce list is at maximum. Remove one to add another, or suffer in silence.");
								return;
							}
							if (feed.announce.some(function (entry) { return (entry === args[3]); })) {
								irc.say(input.context, args[2]+" is already announcing to "+args[3]);
								return;
							}
							if (args[3][0] === '#') {
								if (ial.Channels().some(function (chan) { return (chan === args[3]); })) {
									irc.say(input.context, "Added "+args[3]+" to the announce list for "+args[2]);
									feed.announce.push(args[3]);
									mangaDB.saveOne(args[2], feed);
									return;
								} else {
									irc.say(input.context, "I'm not on "+args[3]+", so I can't announce to it.");
									return;
								}
							} else {
								// need to be an admin to add someone who isn't you
								if (args[3] !== input.from) {
									if (ial.isAdmin(input.user)) {
										irc.say(input.context, "Adding "+args[3]+" to "+args[2]+"'s announce list, since you're an admin.");
										feed.announce.push(args[3]);
										mangaDB.saveOne(args[2], feed);
									} else {
										irc.say(input.context, "You can only add yourself or channels.");
									}
								} else {
									irc.reply(input, "Added you to "+args[2]+"'s announce list.");
									feed.announce.push(args[3]);
									mangaDB.saveOne(args[2], feed);
								}
							}
						} else {
							irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw announce add <manga> <#channel/nick>");
						}
						break;
					case "remove":
						if (args[2] && args[3]) {
							feed = mangaDB.getOne(args[2]);
							if (!feed) {
								irc.say(input.context, "Couldn't find \""+args[2]+"\" in the manga watch list. Pantsu.");
								return;
							}
							if (feed.announce.some(function (entry) { return (entry === args[3]); })) {
								if (args[3][0] !== '#' && args[3] !== input.from && !ial.isAdmin(input.user)) {
									irc.say(input.context, "You need to be an admin to remove people other than yourself.");
									return;
								}
								irc.say(input.context, "Removed "+args[3]+" from the announce list for "+args[2]+".");
								feed.announce = feed.announce.filter(function (entry) { return (entry !== args[3]); });
								mangaDB.saveOne(args[2], feed);
							} else {
								irc.say(input.context, args[3]+" is not in the announce list for "+args[2]+".");
							}
						} else {
							irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw announce remove <manga> <#channel/nick>");
						}
						break;
					case "list":
						if (args[2]) {
							feed = mangaDB.getOne(args[2]);
							if (!feed) {
								irc.say(input.context, "Couldn't find \""+args[2]+"\" in the manga watch list. Pantsu.");
								return;
							}
							if (feed.announce.length > 0) {
								irc.say(input.context, args[2]+" updates are announced to: "+feed.announce.join(", "));
							} else {
								irc.say(input.context, args[2]+" has no announce targets set.");
							}
						} else {
							irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw announce list <manga>");
						}
						break;
					default:
						break;
				}
				break;
			case "add":
				if (!args[2]) { 
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix
						+"mw add <manga name> http://mangafox.me/rss/<manga>.rss - Example: mw add Bleach http://mangafox.me/rss/bleach.xml");
					return;
				}
				reg = /^https?:\/\/mangafox.me\/rss\/([^ \.]+)\.xml$/i.exec(args[2]);
				if (reg) {
					mangaDB.saveOne(args[1], { url: args[2], addedBy: input.from, announce: [ input.context ]});
					setTimeout(function () {
						checkManga(args[1], input.context);
					}, 1000); // let the db get updated.
					irc.say(input.context, "Added "+args[1]+" to the manga watch list.");
				} else {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+"mw add http://mangafox.me/rss/<manga>.xml");
				}
				break;
			case "remove":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return; }
				if (mangaDB.getOne(args[1])) {
					mangaDB.removeOne(args[1]);
					irc.say(input.context, "Removed "+args[1]+" from the manga watch list.");
				} else {
					irc.say(input.context, args[1]+" is not in the manga watch list.");
				}
				break;
			case "check":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return; }
				checkManga(args[1], input.context);
//				checkAll();
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

