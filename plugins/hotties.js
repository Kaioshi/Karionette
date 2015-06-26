// v0.11 plugin by coding amateur ranma. collects ecchi
"use strict";
var hottieDB = new DB.Json({filename: "hotties"}),
	help = {
		tag: "[Help] Syntax: "+config.command_prefix+"hottie tag <url> +tag1 +tag2 -tag3 - adds the \
			first two, removes last. Tags may not have spaces.",
		remove: "[Help] Syntax: "+config.command_prefix+
				"hottie remove <hottie url> - Example: "+config.command_prefix+
				"hottie remove https://i.imgur.com/tdGsifl.gif",
		find: "[Help] Syntax: "+config.command_prefix+
				"hottie find <string> - returns a random hottie which contains string - Example: "
				+config.command_prefix+"hottie find butts"
	};

function zero(n) {
	return (n > 9 ? n : "0"+n);
}

function makeTime(time) {
	time = new Date(time);
	return zero(time.getDate())+"/"+zero(time.getMonth()+1)+"/"+time.getYear().toString().slice(1);
}

function convertHotties(ch) {
	var changed = 0, hotties = hottieDB.getAll(),
		url, tags, i, l, k, n, tmp, context, entry;
	for (context in hotties) {
		i = 0; l = hotties[context].length;
		for (; i < l; i++) {
			url = ""; tags = [];
			if (hotties[context][i].hottie.indexOf(" ") > -1) {
				k = 0; tmp = hotties[context][i].hottie.replace(/\,/g, "").split(" "); n = tmp.length;
				for (; k < n; k++) {
					if (tmp[k].slice(0, 4) === "http")
						url = tmp[k];
					else
						tags.push(tmp[k]);
				}
			}
			if (url && tags.length) {
				hotties[context][i].hottie = url;
				hotties[context][i].tags = tags;
				changed++;
			}
		}
	}
	if (changed) {
		hottieDB.saveAll(hotties);
		irc.say(ch, "Converted "+changed+" hotties to real tags.");
	} else {
		irc.say(ch, "No changes made.");
	}
}

bot.command({
	command: "hottie",
	help: "Maintains a list of hotties! NSFW! Please use "+config.command_prefix+"shorten to shorten long urls.",
	syntax: config.command_prefix+"hottie <add/remove/find/random/tag/stats> - Example: "
		+config.command_prefix+"hottie find <tag> - "
		+config.command_prefix+"hottie add https://i.imgur.com/tdGsifl.gif Spongebob",
	arglen: 1,
	callback: function (input) {
		var i, l, k, n, hottie, hotties, tmp, first, ptagMatch, tagMatch, urlMatch, time, addTag, remTag;
		if (!input.channel) {
			irc.say(input.context, "You can only use this in a channel.");
			return;
		}
		switch (input.args[0]) {
		case "tag":
			if (!input.args[1]) {
				irc.say(input.context, help.tag);
				return;
			}
			// make sure this is a real hottie
			hotties = hottieDB.getOne(input.context);
			if (!hotties) {
				irc.say(input.context, "There are no hotties to tag.");
				return;
			}
			for (i = 0, l = hotties.length; i < l; i++) {
				if (hotties[i].hottie === input.args[1]) {
					hottie = hotties[i];
					break;
				} else {
					k = hotties[i].hottie.indexOf(" ");
					if (k > -1 && hotties[i].hottie.slice(0, k) === input.args[1]) {
						hottie = hotties[i];
						break;
					}
				}
			}
			if (hottie === undefined) {
				irc.say(input.context, "Couldn't find the hottie to tag.");
				return;
			}
			// parse tags
			addTag = []; remTag = [];
			input.args.slice(2).forEach(function (tag) {
				logger.debug(tag);
				if (tag[0] === "+") {
					logger.debug("Adding tag "+tag.slice(1));
					addTag.push(tag.slice(1));
				} else if (tag[0] === "-") {
					logger.debug("Remming tag "+tag.slice(1));
					remTag.push(tag.slice(1));
				}
				// else ignore it
			});
			if (!addTag.length && !remTag.length) {
				irc.say(input.context, "Current tags for "+hottie[i].hottie+": "+hottie[i].tags.join(", "));
				irc.say(input.context, help.tag);
				return;
			}
			if (hottie.tags === undefined) {
				hottie.tags = addTag;
			} else {
				addTag.forEach(function (tag) {
					if (!hottie.tags.some(function (htag) { return (htag === tag); }))
						hottie.tags.push(tag);
				});
				remTag.forEach(function (tag) {
					hottie.tags = hottie.tags.filter(function (htag) { return (htag !== tag); });
				});
			}
			hotties[i] = hottie;
			hottieDB.saveOne(input.context, hotties);
			irc.say(input.context, "K. Tagged "+lib.randSelect(["dat ", "that "])
				+lib.randSelect(["fine ass.", "stunning hottie.", "ass.", "badonkadonk.", "fine-ass ass."]));
			break;
		case "add":
			if (!input.args[1]) {
				irc.say(input.context, bot.cmdHelp("hottie", "syntax"));
				return;
			}
			hottie = { hottie: input.args[1] };
			if (input.args[2])
				hottie.tags = input.args.slice(2);
			hotties = hottieDB.getOne(input.context);
			if (!hotties) {
				hotties = [];
				hottie.num = 1;
			} else { // make sure there are no duplicates
				hottie.num = hotties.length+1;
				for (i = 0; i < hotties.length; i++) {
					if (hotties[i].hottie === hottie.hottie) {
						tmp = hotties[i].from.split("!")[0];
						tmp = (tmp.toLowerCase() === input.nick.toLowerCase() ? "you" : tmp);
						irc.say(input.context, "That hottie was already added "+lib.duration(new Date(hotties[i].date))+" ago by "+tmp+".");
						return;
					}
				}
			}
			hottie.from = input.nick+"!"+input.address;
			hottie.date = new Date();
			hotties.push(hottie);
			hottieDB.saveOne(input.context, hotties);
			irc.say(input.context, "Added o7");
			break;
		case "remove":
			if (!input.args[1]) { 
				irc.say(input.context, help.remove);
				return;
			}
			hotties = hottieDB.getOne(input.context);
			if (!hotties || hotties.length === 0) {
				irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
				return;
			}
			hottie = input.args[1];
			l = hotties.length;
			hotties = hotties.filter(function (entry) { return (entry.hottie !== hottie); });
			if (hotties.length === l) {
				irc.say(input.context, "Couldn't find it. :\\");
				return;
			}
			hottieDB.saveOne(input.context, hotties);
			irc.say(input.context, "Removed. o7");
			break;
		case "convert":
			convertHotties(input.context);
			break;
		case "find":
			if (!input.args[1]) {
				irc.say(input.context, help.find);
				return;
			}
			hotties = hottieDB.getOne(input.context);
			if (!hotties || hotties.length === 0) {
				irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
				return;
			}
			hottie = input.args[1]; tmp = hottie.toLowerCase();
			i = 0; l = hotties.length;
			urlMatch = []; tagMatch = []; ptagMatch = [];
			for (; i < l; i++) {
				if (hotties[i].hottie.indexOf(hottie) > -1) {
					urlMatch.push(hotties[i].hottie);
				}
				if (hotties[i].tags) {
					k = 0; n = hotties[i].tags.length;
					for (; k < n; k++) {
						if (hotties[i].tags[k].toLowerCase() === tmp)
							tagMatch.push(hotties[i].hottie);
						else if (hotties[i].tags[k].toLowerCase().indexOf(tmp) > -1)
							ptagMatch.push(hotties[i].hottie+" ["+hotties[i].tags[k]+"]");
					}
				}
			}
			if (tagMatch.length || ptagMatch.length) {
				if (tagMatch.length)
					irc.say(input.context, "Tag matches: "+tagMatch.join(" "));
				if (ptagMatch.length)
					irc.say(input.context, "Partial tag matches: "+ptagMatch.join(", "));
				return;
			} else if (urlMatch.length) {
				irc.say(input.context, "URL matches: "+urlMatch.join(" "));
				return;
			}
			irc.say(input.context, "No matches found by URL or Tags.");
			break;
		case "random":
			hotties = hottieDB.getOne(input.context);
			if (!hotties || hotties.length === 0) {
				irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
				return;
			}
			hottie = lib.randSelect(hotties);
			irc.say(input.context, "Hottie #"+hottie.num+" added by "+hottie.from.split("!")[0]+
				" on "+makeTime(hottie.date)+": "+hottie.hottie+
				((hottie.tags !== undefined && hottie.tags.length > 0) ? " Tags: "+hottie.tags.join(", ") : ""));
			break;
		case "stats":
			hotties = hottieDB.getOne(input.context);
			if (!hotties || hotties.length === 0) {
				irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
				return;
			}
			tmp = [];
			hotties.forEach(function (entry) {
				entry = entry.from.split("!")[0];
				if (!tmp.some(function (item) { return (entry === item); })) {
					tmp.push(entry);
				}
			});
			irc.say(input.context, "There are "+hotties.length+" hotties for "+input.context+
				", added by "+tmp.length+" "+(tmp.length > 1 ? "people." : "person."));
			break;
		default:
			irc.say(input.context, bot.cmdHelp("hottie", "syntax"));
			break;
		}
	}
});

