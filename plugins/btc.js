// gets BTC
cmdListen({
	command: "btc",
	help: "Retrieves high and low of bitcoin value. Defaults to USD if no argument is given",
	syntax: config.command_prefix+"btc [<currency code>] - Example: "+config.command_prefix+
		"btc AUD",
	callback: function (input) {
		var uri;
		if (input.args && input.args[0]) {
			uri = 'https://data.mtgox.com/api/2/BTC' + input.args[0] + '/money/ticker';
		} else {
			uri = 'https://data.mtgox.com/api/2/BTCUSD/money/ticker';
		}
		web.get(uri, function (error, response, body) {
			var result = JSON.parse(body);
			irc.say(input.context, "1 Bitcoin has recently been worth: [HIGH] "
					+ result.data.high.display_short
					+ ", [LOW] "
					+ result.data.low.display_short
					+ ". [LATES SALE] "
					+ result.data.last_all.display_short, false);
		});
	}
});
