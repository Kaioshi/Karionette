// batoto!!
"use strict";
var batotoDB = new fragDB("batoto"),
	watched = batotoDB.getKeysObj();

timers.startTick(900); // start a 15 minute ticker

function extractRelease(chapter) {
	var index = chapter.indexOf(":");
	if (index > -1) {
		chapter = chapter.slice(0, index);
	}
	chapter = chapter.replace(/Vol\.|Ch\./gi, "").replace("v", ".");
	index = chapter.indexOf(" ");
	if (index > -1) {
		// includes Vol.N Ch.N
		chapter = chapter.split(" ");
		if (chapter[1] < 10) {
			chapter[1] = "0"+chapter[1];
		}
		chapter = chapter[0]+chapter[1];
	}
	return chapter;
}

function htmlToJson(body) {
	var titleReg = /font-weight:bold;\">([^<]+)/,
		reg = /<a href=\"(http:\/\/bato\.to\/read\/[^\"]+)\"><img src=\"http:\/\/bato\.to\/[^>]+\"\/> ([^<]+)<\/a>/,
		i, l, eng, tmp, results, title, chapter;
	tmp = lib.singleSpace(body).replace(/\n|\t|\r/g, "").split("</tr>");
	i = 0; l = tmp.length; eng = [];
	for (; i < l; i++) {
		if (tmp[i].indexOf("lang_English") > -1) {
			eng.push(lib.decode(tmp[i]));
		}
	}
	i = 0; l = eng.length; results = [];
	for (; i < l; i++) {
		title = titleReg.exec(eng[i]);
		if (title) {
			i++;
			chapter = reg.exec(eng[i]);
			chapter[2] = chapter[2].replace(/ read online/i, "");
			results.push({
				title: title[1],
				chapter: chapter[2],
				release: extractRelease(chapter[2]),
				link: chapter[1]
			});
		}
	}
	return results;
}

function findUpdates(releases, notify) {
	var i = 0, l = releases.length, hits = [],
		updates, title, msg;
	for (; i < l; i++) {
		for (title in watched) {
			if (releases[i].title.toLowerCase().trim() === title) {
				if (!lib.hasElement(hits, title))
					hits.push(title);
				if (!watched[title].title)
					watched[title] = batotoDB.getOne(title);
				if (!watched[title].latest || releases[i].release > watched[title].latest.release) {
					// new release~
					if (!updates)
						updates = [];
					// make the case nice if the user put in something weird.
					if (watched[title].title !== releases[i].title)
						watched[title].title = releases[i].title;
					watched[title].latest = releases[i];
					batotoDB.saveOne(title, watched[title]);
					msg = releases[i].title+" - "+releases[i].chapter+" is out \\o/ ~ "+releases[i].link;
					watched[title].announce.forEach(function (target) {
						if (target[0] === "#") {
							if (lib.hasElement(ial.Channels(), target)) {
								updates.push([ "say", target, msg, false ]);
							} else {
								logger.debug("Tried to send a "+type+" update to "+target+", but I'm not on it.");
							}
						} else {
							if (ial.Channels(target).length) {
								updates.push([ "notice", target, msg, false ]); // notice users
							} else { // user not found :S
								lib.events.emit("Event: queueMessage", {
									method: "notice",
									nick: target,
									message: msg,
									sanitise: false
								});
							}
						}
					});
				}
			}
		}
	}
	if (hits.length) {
		hits.forEach(function (title) {
			batotoDB.clearCache(title);
			watched[title] = "";
		});
		hits = null;
	}
	if (updates) {
		irc.rated(updates);
		updates = null;
	} else if (typeof notify === 'string') {
		irc.say(notify, "Nothing new. :\\");
	}
}

function checkBatoto(notify) {
	web.get("http://bato.to", function (err, resp, body) {
		findUpdates(htmlToJson(body), notify);
	});
}

evListen({
	handle: "batotoCheck",
	event: "900s tick", // check for updates every 15 min
	callback: checkBatoto
});

evListen({ // check for updates when we start and joins are done
	handle: "batotoCheckOnStart",
	event: "autojoinFinished",
	callback: checkBatoto
});

cmdListen({
	command: "batoto",
	help: "You say botato, I say batoto.",
	syntax: config.command_prefix+"batoto <add/remove/check/list> [<manga title>] - Example:"
		+config.command_prefix+"batoto add One Piece",
	callback: function (input) {
		var titles, title, ltitle;
		if (!input.args) {
			irc.say(input.context, cmdHelp("batoto", "syntax"));
			return;
		}
		switch (input.args[0]) {
		case "add":
			if (!input.args[1]) {
				irc.say(input.context, "[Help] "+config.command_prefix+"batoto add <manga title>");
				break;
			}
			title = input.args.slice(1).join(" ");
			ltitle = title.toLowerCase();
			if (watched[ltitle] !== undefined) {
				irc.say(input.context, "I'm already tracking "+title+" updates.");
				break;
			}
			watched[ltitle] = { title: title, announce: [ input.context ] };
			batotoDB.saveOne(ltitle, watched[ltitle]);
			irc.say(input.context, "Added! o7");
			checkBatoto();
			break;
		case "remove":
			if (!input.args[1]) {
				irc.say(input.context, "[Help] "+config.command_prefix+"batoto remove <manga title>");
				break;
			}
			title = input.args.slice(1).join(" ");
			ltitle = title.toLowerCase();
			if (watched[ltitle] === undefined) {
				irc.say(input.context, "I'm not tracking "+title+".");
				break;
			}
			delete watched[ltitle];
			batotoDB.removeOne(ltitle);
			irc.say(input.context, "Removed. o7");
			break;
		case "list":
			titles = [];
			watched = batotoDB.getAll();
			for (title in watched) {
				titles.push(watched[title].title);
			}
			if (titles.length > 0) {
				irc.say(input.context, "I'm tracking releases of "+lib.commaList(titles)+" from Batoto.");
			} else {
				irc.say(input.context, "I'm not tracking any Batoto releases right now. Add some!");
			}
			titles = null;
			watched = batotoDB.getKeysObj();
			batotoDB.clearCache();
			break;
		case "check":
			checkBatoto(input.context);
			break;
		default:
			irc.say(input.context, cmdHelp("batoto", "syntax"));
			break;
		}
	}
});















