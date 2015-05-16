// per-user / per-channel / global "bookmarks"
"use strict";
var bookmarkDB = new DB.Json({filename: "bookmarks"}),
	bmhelp = {
		add: "[Help] Syntax: "+config.command_prefix+
			"bm -add [-c(hannel)|-u(ser)] <bookmark handle> <http://url.here.pantsu.org> - \
			Example: "+config.command_prefix+"bm -a -c wat http://i.minus.com/iPFeOpHpfLc4I.gif \
			- default store location is global (channel/query)",
		remove: "[Help] Syntax: "+config.command_prefix+
			"bm -remove [-c(hannel)|-u(ser)] <bookmark handle|url> - Example: "+config.command_prefix+
			"bm -remove http://some.dodgy.url.org/pantsu.jpeg - "+config.command_prefix+
			"bm -r -c slashdot",
		list: "[Help] Syntax: "+config.command_prefix+
			"bm -list [-c(hannel)|-u(ser)] <handle> - Example: "+config.command_prefix+
			"bm -list -channel - "+config.command_prefix+
			"bm -l (current context)",
		find: "[Help] Syntax: "+config.command_prefix+
			"bm -find [-c(hannel)|-u(ser)] <string> - Example: "+config.command_prefix+
			"bm -f -c pantsu - "+config.command_prefix+
			"bm -find imgur.com",
		help: "[Help] Syntax: "+config.command_prefix+
			"bm -help <add/remove/list/find> - Example: "+config.command_prefix+
			"bm -h add"
	};

function isUrl(text) {
	text = text.toLowerCase();
	if (text.length >= 10) {
		if (text.slice(0,7) === "http://" || text.slice(0,8) === "https://")
			return true;
	}
}

function handleBookmark(args) {
	var i = 0, l = args.length, handle = [], urls = [];
	for (; i < l; i++) {
		if (isUrl(args[i]) || urls.length !== 0)
			urls.push(args[i]);
		else if (urls.length === 0)
			handle.push(args[i]);
	}
	if (urls.length === 0 || handle.length === 0)
		return;
	return {
		handle: handle.join(" "),
		link: urls.join(" ")
	};
}

function showBookmark(context, target, handle) {
	var bookmarks, result;
	if (!target || !handle) {
		irc.say(context, cmdHelp("bm", "syntax"));
		return;
	}
	bookmarks = bookmarkDB.getOne(target);
	if (!bookmarks) {
		irc.say(context, target+" has no bookmarks.");
		return;
	}
	bookmarks.forEach(function (entry) {
		if (entry.handle === handle)
			result = entry;
	});
	if (result)
		irc.say(context, result.handle+" ~ "+result.link);
	else
		irc.say(context, target+" has no such bookmark.");
}

cmdListen({
	command: [ "bm", "bookmark" ],
	help: "Allows you to store links for later retrieval.",
	syntax: config.command_prefix+
		"bm [-a(dd) / -r(emove) / -l(ist) / -f(ind) / -h(elp)] [<handle>] [<url>] - Example: "
		+config.command_prefix+"bm -a ranma's dodgy undies http://imgur.com/dodgy_undies.png",
	arglen: 1,
	callback: function (input) {
		var bookmarks, bookmark, i, keys, overwrite, dupes, url, removed, result, reg,
			handle, target, matchedUrl, matchedHandle;
		switch (input.args[0].toLowerCase()) {
			case "-a":
			case "-add":
				if (input.args.length <= 2) {
					irc.say(input.context, bmhelp.add);
					return;
				}
				switch (input.args[1].toLowerCase()) {
				case "-c":
				case "-channel":
					target = input.context.toLowerCase();
					bookmark = handleBookmark(input.args.slice(2));
					break;
				case "-u":
				case "-user":
					target = input.nick.toLowerCase();
					bookmark = handleBookmark(input.args.slice(2));
					break;
				default:
					target = "global";
					bookmark = handleBookmark(input.args.slice(1));
					break;
				}
				if (!bookmark) {
					irc.say(input.context, bmhelp.add);
					return;
				}
				dupes = [];
				bookmarks = bookmarkDB.getOne(target);
				if (!bookmarks)
					bookmarks = [];
				else { // replace if it's in there already - count link dupes if any
					for (i = 0; i < bookmarks.length; i++) {
						if (bookmarks[i].handle === bookmark.handle) {
							bookmarks.splice(i,1);
							overwrite = true;
						}
						if (bookmarks[i] && bookmarks[i].link === bookmark.link) {
							dupes.push(bookmarks[i].handle);
						}
					}
				}
				bookmarks.push(bookmark);
				bookmarkDB.saveOne(target, bookmarks);
				dupes = dupes.filter(function (entry) { return (entry !== bookmark.handle); });
				dupes = (dupes.length > 0 ? " (this link is also known as "+dupes.join(", ")+")" : "");
				irc.say(input.context, (overwrite ? "Overwritten :S" : "Added o7")+dupes);
				break;
			case "-r":
			case "-remove":
				if (!input.args[1]) {
					irc.say(input.context, bmhelp.remove);
					return;
				}
				switch (input.args[1].toLowerCase()) {
				case "-c":
				case "-channel":
					target = input.context.toLowerCase();
					handle = input.args.slice(2).join(" ");
					break;
				case "-u":
				case "-user":
					target = input.nick.toLowerCase();
					handle = input.args.slice(2).join(" ");
					break;
				default:
					target = "global";
					handle = input.args.slice(1).join(" ");
					break;
				}
				if (!handle) {
					irc.say(input.context, bmhelp.remove);
					return;
				}
				bookmarks = bookmarkDB.getOne(target);
				if (!bookmarks) {
					irc.say(input.context, target+" has no bookmarks - nothing to remove.");
					return;
				}
				if (handle.match(/https?:\/\/[^ ]+\.[^ ]+/))
					url = true;
				removed = [];
				for (i = 0; i < bookmarks.length; i++) {
					if (url) {
						if (bookmarks[i].link === handle) {
							removed.push(bookmarks[i].handle);
							bookmarks.splice(i,1);
							i--;
						}
					} else {
						if (bookmarks[i].handle === handle) {
							removed.push(bookmarks[i].handle);
							bookmarks.splice(i,1);
						}
					}
				}
				if (removed.length > 0) {
					if (bookmarks.length === 0)
						bookmarkDB.removeOne(target);
					else
						bookmarkDB.saveOne(target, bookmarks);
					irc.say(input.context, "Removed "+(url ? "[by URL match] ":"")+removed.join(", "));
				} else {
					irc.say(input.context, "No match - nothing removed.");
				}
				break;
			case "-l":
			case "-list":
				if (input.args[1] && input.args[1][0] === "-" && input.args[1].match(/-c|-channel|-u|-user/))
					target = (input.args[1].match(/-c|-channel/i) ? input.context : input.nick);
				else
					target = "global";
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
				if (keys.length > 0)
					irc.say(input.context, target+" bookmarks: "+lib.sort(keys).join(", "));
				else
					irc.say(input.context, target+"'s... bookmarks.. something has gone wrong! halp!");
				break;
			case "-f":
			case "-find":
				if (!input.args[1]) {
					irc.say(input.context, bmhelp.find);
					return;
				}
				switch (input.args[1].toLowerCase()) {
				case "-c":
				case "-channel":
					target = input.context.toLowerCase();
					handle = input.args.slice(2).join(" ");
					break;
				case "-u":
				case "-user":
					target = input.nick.toLowerCase();
					handle = input.args.slice(2).join(" ");
					break;
				default:
					target = "global";
					handle = input.args.slice(1).join(" ");
					break;
				}
				if (!handle) {
					irc.say(input.context, bmhelp.find);
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
					if (entry.handle.indexOf(handle.toLowerCase()) > -1) {
						entry.match = "handle";
						matchedHandle.push(entry.handle);
						keys.push(entry);
					} else if (entry.link.indexOf(handle.toLowerCase()) > -1) {
						entry.match = "url";
						matchedUrl.push(entry.handle);
						keys.push(entry);
					}
				});
				if (keys.length === 0)
					irc.say(input.context, "No matches found~");
				else {
					if (keys.length <= 3) { // not too spammy, show them all in full
						keys.forEach(function (entry) {
							irc.say(input.context, entry.handle+" ["+entry.match+" match] ~ "+entry.link);
						});
					} else {
						if (matchedHandle.length > 0)
							irc.say(input.context, "Matched by handle: "+lib.sort(matchedHandle).join(", "), false);
						if (matchedUrl.length > 0)
							irc.say(input.context, "Matched by URL: "+lib.sort(matchedUrl).join(", "), false);
					}
				}
				break;
			case "-h":
			case "-help":
				if (!input.args[1]) {
					irc.say(input.context, bmhelp.help);
					return;
				}
				input.args[1] = input.args[1].toLowerCase();
				if (!bmhelp[input.args[1]])
					irc.say(input.context, "There is no help for "+input.args[1]+" - valid: add, remove, list, find");
				else
					irc.say(input.context, bmhelp[input.args[1]]);
				break;
			case "-c":
			case "-channel":
				showBookmark(input.context, input.context.toLowerCase(), input.args.slice(1).join(" "));
				break;
			case "-u":
			case "-user":
				showBookmark(input.context, input.nick.toLowerCase(), input.args.slice(1).join(" "));
				break;
			default:
				showBookmark(input.context, "global", input.args.join(" "));
				break;
		}
	}
});

