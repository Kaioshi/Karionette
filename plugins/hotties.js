// collects ecchi
"use strict";
var hottieDB = new DB.Json({filename: "hotties"});

function zero(n) {
	return (n > 9 ? n : "0"+n);
}

function makeTime(time) {
	time = new Date(time);
	return zero(time.getDate())+"/"+zero(time.getMonth()+1)+"/"+time.getYear().toString().slice(1);
}

cmdListen({
	command: "hottie",
	help: "Hottie added by mitchplz on 24/07/13: <mitch_> should I into quotes",
	syntax: config.command_prefix+"hottie <add/remove/find/get/random/stats> - Example: "
		+config.command_prefix+"hottie find <search term> - "
		+config.command_prefix+"hottie add <Mari> mitches be like, \">implying\"",
	callback: function (input) {
		var i, k, hottie, hotties, tmp, first, matches, time;
		if (!input.channel) {
			irc.say(input.context, "You can only use this in a channel for now, sorry.");
			return;
		}
		if (!input.args || !input.args[0]) {
			irc.say(input.context, cmdHelp("hottie", "syntax"));
			return;
		}
		switch (input.args[0]) {
			case "add":
				if (!input.args[1]) {
					irc.say(input.context, cmdHelp("hottie", "syntax"));
					return;
				}
				hottie = { hottie: input.args.slice(1).join(" ") };
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
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"hottie remove <hottie ID/actual hottie url> - Example: "+config.command_prefix+
						"hottie remove <mitch_> I loooove me some futa. / "+config.command_prefix+
						"hottie remove 7");
					return;
				}
				hotties = hottieDB.getOne(input.context);
				if (!hotties || hotties.length === 0) {
					irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
					return;
				}
				if (input.args[1].match(/[0-9]+/) && !input.args[2]) {
					input.args[1] = parseInt(input.args[1]);
					if (input.args[1] > hotties.length) {
						irc.say(input.context, "There are only "+hotties.length+" hotties in here.");
						return;
					}
					tmp = [];
					
					for (i = 0, k = 0; i < hotties.length; i++) {
						if (hotties[i].num === input.args[1]) {
							irc.say(input.context, "Removed hottie: \""+hotties[i].hottie+
								"\" ~ which was added by "+hotties[i].from+" on "+makeTime(hotties[i].date)+".");
						} else {
							k++;
							hotties[i].num = k; // renumber entries
							tmp.push(hotties[i]);
						}
					}
					if (tmp.length === 0) hottieDB.removeOne(input.context);
					else hottieDB.saveOne(input.context, tmp);
					return;
				}
				hottie = input.args.slice(1).join(" ");
				for (i = 0; i < hotties.length; i++) {
					if (hotties[i].hottie === hottie) {
						tmp = [];
						hotties.forEach(function (entry) {
							if (entry.hottie !== hottie) tmp.push(entry);
						});
						if (tmp.length === 0) hottieDB.removeOne(input.context);
						else hottieDB.saveOne(input.context, tmp);
						irc.say(input.context, "Removed o7");
						return;
					}
				}
				irc.say(input.context, "Couldn't find it. :\\");
				break;
			case "find":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] Syntax: "+config.command_prefix+
						"hottie find <string> - returns a random hottie which contains string - Example: "+config.command_prefix+
						"hottie find butts");
					return;
				}
				hotties = hottieDB.getOne(input.context);
				if (!hotties || hotties.length === 0) {
					irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
					return;
				}
				hottie = input.args.slice(1).join(" ");
				for (matches = [], i = 0; i < hotties.length; i++) {
					if (hotties[i].hottie.indexOf(hottie) > -1) {
						matches.push(hotties[i]);
					}
				}
				if (!matches.length) {
					irc.say(input.context, "No match found.");
					return;
				}
				i = Math.floor(Math.random()*matches.length);
				time = makeTime(matches[i].date);
				irc.say(input.context, (matches.length > 1 ? "("+matches.length+" matches) " : "")+
					"Quote #"+matches[i].num+" added by "+matches[i].from.split("!")[0]+" on "+time+": "+matches[i].hottie);
				break;
			case "get":
				hotties = hottieDB.getOne(input.context);
				if (!hotties || hotties.length === 0) {
					irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
					return;
				}
				if (!input.args[1] || !input.args[1].match(/[0-9]+/) || parseInt(input.args[1]) > hotties.length) {
					irc.say(input.context, "You have "+hotties.length+" hotties to choose from - try "+config.command_prefix+
						"hottie get "+Math.floor(Math.random()*hotties.length+1)+".");
					return;
				}
				for (i = 0; i < hotties.length; i++) {
					if (hotties[i].num === parseInt(input.args[1])) {
						irc.say(input.context, "Quote #"+hotties[i].num+" added by "+hotties[i].from.split("!")[0]+
							" on "+makeTime(hotties[i].date)+": "+hotties[i].hottie);
						return;
					}
				}
				break;
			case "random":
				hotties = hottieDB.getOne(input.context);
				if (!hotties || hotties.length === 0) {
					irc.say(input.context, "There aren't any hotties for "+input.context+" ~ add some!");
					return;
				}
				hottie = lib.randSelect(hotties);
				irc.say(input.context, "Hottie #"+hottie.num+" added by "+hottie.from.split("!")[0]+
					" on "+makeTime(hottie.date)+": "+hottie.hottie);
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
				irc.say(input.context, cmdHelp("hottie", "syntax"));
				break;
		}
	}
});

