// per-user / per-channel / global "bookmarks"
var bookmarkDB = new DB.Json({filename: "bookmarks"});

function addBookmark(target, handle, bookmark) {
	var entry, keys, i;
	if (!target || !handle || !bookmark) {
		logger.debug("[bookmark] addBookmark("+target+", "+bookmark+") called improperly.");
		return "wups.";
	}
	entry = bookmarkDB.getOne(target);
	entry[handle] = bookmark;
	bookmarkDB.saveOne(target, entry);
	return "Added o7";
}

function getHandle(context, from, line) {
	if (line[0] === "-") {
		line = line.split(" ");
		if (line[1]) return line.slice(1).join(" ").toLowerCase();
		else return;
	}
	return line.toLowerCase();
}

function getTarget(context, from, line) {
	if (line[0] === "-") {
		line = line.split(" ");
		switch (line[0].toLowerCase()) {
			case "-c":
			case "-channel":
				return context.toLowerCase();
			case "-u":
			case "-user":
				return from.toLowerCase();
			default:
				return; // bad switch
		}
	}
	return "global";
}

function parseAddArgs(context, from, line) {
	var ret = {},
		reg = /(.*) (https?:\/\/[^ ]+\.[^ ]+)$/i.exec(line);
	if (!reg) return;
	ret.bookmark = reg[2];
	ret.target = getTarget(context, from, reg[1]);
	ret.handle = getHandle(context, from, reg[1]);
	if (!ret.handle || !ret.target) return;
	return ret;
}

function parseRemArgs(context, from, line) {
	var ret = {};
	ret.handle = getHandle(context, from, line);
	ret.target = getTarget(context, from, line);
	if (!ret.handle || !ret.target) return;
	return ret;
}

listen({
	plugin: "bookmarks",
	handle: "bookmarks",
	regex: regexFactory.startsWith(["bookmarks", "bookmark", "bm", "link"]),
	command: {
		root: "bookmark",
		options: "-add, -remove, -list, -find - issue each command with no arguments for further help",
		help: "Allows you to store links for later retrieval.",
		syntax: {
			def: "[Help] Syntax: "+config.command_prefix+"bookmark [-a(dd) / -r(emove) / -l(ist) / -f(ind) / -h(elp)] [<handle>] [<url>]",
			add: "[Help] Syntax: "+config.command_prefix+
				"bookmark -add [-c(hannel)|-u(ser)] <bookmark handle> <http://url.here.pantsu.org> - Example: "+config.command_prefix+
				"bookmark -a -c wat http://i.minus.com/iPFeOpHpfLc4I.gif - default store location is global (channel/query)",
			remove: "[Help] Syntax: "+config.command_prefix+
				"bookmark -remove [-c(hannel)|-u(ser)] <bookmark handle|url> - Example: "+config.command_prefix+
				"bookmark -remove http://some.dodgy.url.org/pantsu.jpeg - "+config.command_prefix+
				"bookmark -r -c slashdot",
			list: "[Help] Syntax: "+config.command_prefix+
				"bookmark -list [-c(hannel)|-u(ser)] <handle> - Example: "+config.command_prefix+
				"bookmark -list -channel - "+config.command_prefix+
				"bookmark -l (current context)",
			find: "[Help] Syntax: "+config.command_prefix+
				"bookmark -find [-c(hannel)|-u(ser)] <string> - Example: "+config.command_prefix+
				"bookmark -f -c pantsu - "+config.command_prefix+
				"bookmark -find imgur.com",
			help: "[Help] Syntax: "+config.command_prefix+
				"bookmark -help <add/remove/list/find> - Example: "+config.command_prefix+
				"bookmark -h add"
		},
	},
	callback: function (input, match) {
		var bookmarks, i, keys, overwrite, dupes, url, removed, result, reg,
			handle, target, matchedUrl, matchedHandle,
			args = match[1].split(" ");
		switch (args[0].toLowerCase()) {
			case "-a":
			case "-add":
				args = parseAddArgs(input.context, input.from, args.slice(1).join(" "));
				if (!args) {
					irc.say(input.context, this.command.syntax.add);
					return;
				}
				dupes = [];
				bookmarks = bookmarkDB.getOne(args.target);
				if (!bookmarks) bookmarks = [];
				else { // replace if it's in there already - count link dupes if any
					for (i = 0; i < bookmarks.length; i++) {
						if (bookmarks[i].handle === args.handle) {
							bookmarks.splice(i,1);
							overwrite = true;
						}
						if (bookmarks[i] && bookmarks[i].link === args.bookmark) {
							dupes.push(bookmarks[i].handle);
						}
					}
				}
				bookmarks.push({ handle: args.handle, link: args.bookmark });
				bookmarkDB.saveOne(args.target, bookmarks);
				dupes = dupes.filter(function (entry) { return (entry !== args.handle); });
				dupes = (dupes.length > 0 ? " (this link is also known as "+dupes.join(", ")+")" : "");
				irc.say(input.context, (overwrite ? "Overwritten :S" : "Added o7")+dupes);
				break;
			case "-r":
			case "-remove":
				args = parseRemArgs(input.context, input.from, args.slice(1).join(" "));
				if (!args) {
					irc.say(input.context, this.command.syntax.remove);
					return;
				}
				bookmarks = bookmarkDB.getOne(args.target);
				if (!bookmarks) {
					irc.say(input.context, args.target+" has no bookmarks - nothing to remove.");
					return;
				}
				if (args.handle.match(/https?:\/\/[^ ]+\.[^ ]+/)) {
					url = true;
				}
				removed = [];
				for (i = 0; i < bookmarks.length; i++) {
					if (url) {
						if (bookmarks[i].link === args.handle) {
							removed.push(bookmarks[i].handle);
							bookmarks.splice(i,1);
							i--;
						}
					} else {
						if (bookmarks[i].handle === args.handle) {
							removed.push(bookmarks[i].handle);
							bookmarks.splice(i,1);
						}
					}
				}
				if (removed.length > 0) {
					if (bookmarks.length === 0) bookmarkDB.removeOne(args.target);
					else bookmarkDB.saveOne(args.target, bookmarks);
					irc.say(input.context, "Removed "+(url ? "[by URL match] ":"")+removed.join(", "));
				} else {
					irc.say(input.context, "No match - nothing removed.");
				}
				break;
			case "-l":
			case "-list":
				if (args[1] && args[1][0] === "-" && args[1].match(/-c|-channel|-u|-user/)) {
					target = (args[1].match(/-c|-channel/i) ? input.context : input.from);
				} else {
					target = "global";
				}
				target = target.toLowerCase();
				bookmarks = bookmarkDB.getOne(target);
				if (!bookmarks) {
					irc.say(input.context, target+" has no bookmarks.");
					return;
				}
				keys = [];
				bookmarks.forEach(function (entry) {
					keys.push(entry.handle);
				});
				if (keys.length > 0) {
					irc.say(input.context, target+" bookmarks: "+keys.join(", "));
				} else {
					irc.say(input.context, target+"'s... bookmarks.. something has gone wrong! halp!");
				}
				break;
			case "-f":
			case "-find":
				if (!args[1]) {
					irc.say(input.context, this.command.syntax.find);
					return;
				}
				args = args.slice(1).join(" ");
				target = getTarget(input.context, input.from, args);
				handle = getHandle(input.context, input.from, args);
				if (!target || !handle) {
					irc.say(input.context, this.command.syntax.def);
					return;
				}
				bookmarks = bookmarkDB.getOne(target);
				if (!bookmarks) {
					irc.say(input.context, target+" has no bookmarks.");
					return;
				}
				keys = [];
				matchedHandle = [];
				matchedUrl = [];
				bookmarks.forEach(function (entry) {
					if (entry.handle.indexOf(handle) > -1) {
						entry.match = "handle";
						matchedHandle.push(entry.handle);
						keys.push(entry);
					}
					else if (entry.link.indexOf(handle) > -1) {
						entry.match = "url";
						matchedUrl.push(entry.handle);
						keys.push(entry);
					}
				});
				if (keys.length === 0) {
					irc.say(input.context, "No matches found~");
				} else {
					if (keys.length <= 3) { // not too spammy, show them all in full
						keys.forEach(function (entry) {
							irc.say(input.context, entry.handle+" ["+entry.match+" match] ~ "+entry.link);
						});
					} else {
						if (matchedHandle.length > 0) {
							irc.say(input.context, "Matched by handle: "+matchedHandle.join(", "), false);
						}
						if (matchedUrl.length > 0) {
							irc.say(input.context, "Matched by URL: "+matchedUrl.join(", "), false);
						}
					}
				}
				break;
			case "-h":
			case "-help":
				if (!args[1]) {
					irc.say(input.context, this.command.syntax.help);
					return;
				}
				args[1] = args[1].toLowerCase();
				if (!this.command.syntax[args[1]]) irc.say(input.context, "There is no help for "+args[1]+" - valid: add, remove, list, find");
				else irc.say(input.context, this.command.syntax[args[1]]);
				break;
			default:
				reg = /(.*)@(.*)/.exec(match[1]);
				if (reg) match[1] = match[1].split("@")[0].trim();
				match[1] = match[1].toLowerCase();
				target = getTarget(input.context, input.from, match[1]);
				handle = getHandle(input.context, input.from, match[1]);
				if (!target || !handle) {
					irc.say(input.context, this.command.syntax.def);
					return;
				}
				bookmarks = bookmarkDB.getOne(target);
				if (!bookmarks) {
					irc.say(input.context, target+" has no bookmarks.");
					return;
				}
				bookmarks.forEach(function (entry) {
					if (entry.handle === handle) result = entry;
				});
				if (result) {
					if (reg) result.handle = reg[2]+": "+result.handle;
					irc.say(input.context, result.handle+" ~ "+result.link);
				} else {
					irc.say(input.context, target+" has no such bookmark.");
				}
				break;
		}
	}
});

