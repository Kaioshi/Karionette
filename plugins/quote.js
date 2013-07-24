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
		help: "<mitch_> should I into quotes",
		syntax: "[Help] Syntax: "+config.command_prefix+"quote <add/remove> <mitch_> huurrr memes - quote find <search term> - quote random"
	},
	callback: function (input, match) {
		var i, quote, quotes, tmp, first, matches, time,
			args = match[1].split(" ");
		switch (args[0]) {
			case "add":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return }
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
				if (!args[1]) { irc.say(input.context, this.command.syntax); return }
				quotes = quoteDB.getOne(input.context);
				if (quotes) {
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
				} else {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
				}
				break;
			case "find":
				if (!args[1]) { irc.say(input.context, this.command.syntax); return }
				quotes = quoteDB.getOne(input.context);
				
				if (quotes && quotes.length !== 0) {
					quote = args.slice(1).join(" ");
					for (matches = 0, i = 0; i < quotes.length; i++) {
						if (quotes[i].quote.indexOf(quote) > -1) {
							if (!first) first = quotes[i];
							matches++;
						}
					}
					time = makeTime(first.date);
					irc.say(input.context, (matches > 1 ? "("+matches+" matches) " : "")+"Quote added by "+first.from.split("!")[0]+" on "+time+": "+first.quote);
				} else {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
				}
				break;
			case "random":
				quotes = quoteDB.getOne(input.context);
				if (quotes) {
					quote = quotes[Math.floor(Math.random()*quotes.length)];
					irc.say(input.context, "Quote added by "+quote.from.split("!")[0]+" on "+makeTime(quote.date)+": "+quote.quote);
				} else {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
				}
				break;
			case "stats":
				quotes = quoteDB.getOne(input.context);
				if (quotes) {
					tmp = [];
					quotes.forEach(function (entry) {
						entry = entry.from.split("!")[0];
						if (!tmp.some(function (item) { return (entry === item); })) {
							tmp.push(entry);
						}
					});
					irc.say(input.context, "There are "+quotes.length+" quotes for "+input.context+", added by "+tmp.length+" "+(tmp.length > 1 ? "people." : "person."));
				} else {
					irc.say(input.context, "There aren't any quotes for "+input.context+" ~ add some!");
				}
				break;
			default:
				irc.say(input.context, this.command.syntax);
				break;
		}
	}
});
