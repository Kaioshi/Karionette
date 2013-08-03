// collects quotes
var quoteDB = new DB.Json({filename: "quotes"});

function zero(n) {
	return (n > 9 ? n : "0"+n);
}

function makeTime(time) {
	time = new Date(time);
	return zero(time.getDate())+"/"+zero(time.getMonth()+1)+"/"+time.getYear().toString().slice(1);
}

listen({
	plugin: "quote",
	handle: "quote",
	regex: regexFactory.startsWith("quote"),
	command: {
		root: "quote",
		options: "add, remove, find, random",
		help: "Quote added by mitch- on 24/07/13: <mitch_> should I into quotes",
		syntax: "[Help] Syntax: "+config.command_prefix+"quote <add/remove> <mitch_> huurrr memes - quote find <search term> - quote random"
	},
	callback: function (input, match) {
		var i, quote, quotes, tmp, first, matches, time,
			args = match[1].split(" ");
		if (input.context[0] !== "#") {
			irc.say(input.context, "You can only use this in a channel for now, sorry.");
			return;
		}
		switch (args[0]) {
			case "add":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return; }
				quote = { quote: args.slice(1).join(" "), from: input.user, date: new Date() };
				quotes = quoteDB.getOne(input.context);
				if (!quotes) quotes = [];
				else { // make sure there are no duplicates
					for (i = 0; i < quotes.length; i++) {
						if (quotes[i].quote === quote.quote) {
							if (quotes[i].from !== quote.from) {
								irc.say(input.context, quotes[i].from.split("!")[0]+" already added that quote "
									+lib.duration(new Date(quotes[i].date))+" ago.");
								return;
							}
							quotes[i] = quote;
							quoteDB.saveOne(input.context, quotes);
							irc.say(input.context, "Overwritten o7");
							return;
						}
					}
				}
				quotes.push(quote);
				quoteDB.saveOne(input.context, quotes);
				irc.say(input.context, "Added o7");
				break;
			case "remove":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return; }
				quotes = quoteDB.getOne(input.context);
				if (!quotes || quotes.length === 0) {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
					return;
				}
				quote = args.slice(1).join(" ");
				for (i = 0; i < quotes.length; i++) {
					if (quotes[i].quote === quote) {
						tmp = [];
						quotes.forEach(function (entry) {
							if (entry.quote !== quote) tmp.push(entry);
						});
						if (tmp.length === 0) quoteDB.removeOne(input.context);
						else quoteDB.saveOne(input.context, tmp);
						irc.say(input.context, "Removed o7");
						return;
					}
				}
				irc.say(input.context, "Couldn't find it. :\\");
				break;
			case "find":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return; }
				quotes = quoteDB.getOne(input.context);
				if (!quotes || quotes.length === 0) {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
					return;
				}
				quote = args.slice(1).join(" ");
				for (matches = [], i = 0; i < quotes.length; i++) {
					if (quotes[i].quote.indexOf(quote) > -1) {
						matches.push(quotes[i]);
					}
				}
				if (!matches.length) {
					irc.say(input.context, "No match found.");
					return;
				}
				i = Math.floor(Math.random()*matches.length);
				time = makeTime(matches[i].date);
				irc.say(input.context, (matches.length > 1 ? "("+matches.length+" matches) " : "")+
					"Quote added by "+matches[i].from.split("!")[0]+" on "+time+": "+matches[i].quote);
				break;
			case "get":
				quotes = quoteDB.getOne(input.context);
				if (!quotes || quotes.length === 0) {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
					return;
				}
				if (!args[1] || !args[1].match(/[0-9]+/) || parseInt(args[1]) > quotes.length) {
					irc.say(input.context, "You have "+quotes.length+" quotes to choose from - try "+config.command_prefix+
						"quote get "+Math.floor(Math.random()*quotes.length+1)+".");
					return;
				}
				for (i = 0; i < quotes.length; i++) {
					if (quotes[i].num === parseInt(args[1])) {
						irc.say(input.context, "Quote added by "+quotes[i].from.split("!")[0]+
							" on "+makeTime(quotes[i].date)+": "+quotes[i].quote);
						return;
					}
				}
				break;
			case "random":
				quotes = quoteDB.getOne(input.context);
				if (!quotes || quotes.length === 0) {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
					return;
				}
				quote = quotes[Math.floor(Math.random()*quotes.length)];
				irc.say(input.context, "Quote added by "+quote.from.split("!")[0]+" on "+makeTime(quote.date)+": "+quote.quote);
				break;
			case "stats":
				quotes = quoteDB.getOne(input.context);
				if (!quotes || quotes.length === 0) {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
					return;
				}
				tmp = [];
				quotes.forEach(function (entry) {
					entry = entry.from.split("!")[0];
					if (!tmp.some(function (item) { return (entry === item); })) {
						tmp.push(entry);
					}
				});
				irc.say(input.context, "There are "+quotes.length+" quotes for "+input.context+
					", added by "+tmp.length+" "+(tmp.length > 1 ? "people." : "person."));
				break;
			case "numberem":
				// very temporary, need to give numbers to the old format.
				quotes = quoteDB.getOne(input.context);
				if (!quotes) {
					irc.say(input.context, "There's nothing to numberbutt.");
					return;
				}
				for (i = 0; i < quotes.length; i++) {
					quotes[i].num = i+1;
				}
				quoteDB.saveOne(input.context, quotes);
				break;
			default:
				irc.say(input.context, this.command.syntax);
				break;
		}
	}
});

