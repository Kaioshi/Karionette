// gets BTC
listen({
	handle: "btc",
	regex: regexFactory.startsWith("btc"),
	command: {
		root: "btc",
		options: "{Currency}",
		help: "Retrieves high and low of bitcoin value. Defaults to USD if no argument is given"
	},
	callback: function (input, match) {
		var uri, args = match[1].split(" ");

		if (args[0]) {
			uri = 'https://data.mtgox.com/api/2/BTC' + args[0] + '/money/ticker';
		} else {
			uri = 'https://data.mtgox.com/api/2/BTCUSD/money/ticker';
		}
		web.get(uri, function (error, response, body) {
			var result = JSON.parse(body);
			irc.say(input.context, '1BTC ---> [HIGH] ' + result.data.high.display_short + ', [LOW] ' + result.data.low.display_short, false);
		});
	}
});