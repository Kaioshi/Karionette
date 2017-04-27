"use strict";

const [web, lib] = plugin.importMany("web", "lib");

function currencyURL(code) {
    return `https://api.bitcoinaverage.com/exchanges/${code}`;
}

let KEYS = ["AUD", "BRL", "CAD", "CHF", "CNY", "EUR", "GBP", "IDR", "ILS", "MXN", "NOK", "NZD", "PLN", "RON", "RUB", "SEK", "SGD", "USD", "ZAR"];

let CURRENCY = KEYS.reduce((acc, code) => { acc[code] = currencyURL(code); return acc; }, {});

function trimNum(n) {
	let i;
	n = n.toString();
	i = n.indexOf(".");
	if (i === -1)
		return n;
	if (i === -1 || n.slice(i).length < 2)
		return n;
	return n.slice(0, i+3);
}

bot.command({
	command: "btc",
	help: "Retrieves high and low of bitcoin value. Defaults to USD if no argument is given",
	syntax: `${config.command_prefix}btc [<currency code>] - Example: ${config.command_prefix}btc AUD`,
	callback: function (input) {
		let provider, rate, cur, time, avg, high, low;
		if (input.args && input.args[0] !== undefined)
			cur = input.args[0].toUpperCase();
		else
			cur = "USD";
		if (!CURRENCY[cur]) {
			irc.say(input.context, `Invalid currency. Available: ${lib.commaList(KEYS)}.`);
			return;
		}
		web.json(CURRENCY[cur]).then(function (btc) {
			if (btc.timestamp) {
				time = `data fetched ${lib.duration(new Date(btc.timestamp))} ago.`;
				delete btc.timestamp;
			} else {
				time = "";
			}
			avg = 0;
			high = { val: 0 };
			low = { val: 0 };
			for (provider in btc) {
				if (btc.hasOwnProperty(provider)) {
					rate = btc[provider].rates.last;
					avg += rate;
					if (rate > high.val || !high.val) {
						high.val = rate;
						high.from = btc[provider].display_name;
					}
					if (rate < low.val || !low.val) {
						low.val = rate;
						low.from = btc[provider].display_name;
					}
				}
			}
			avg = avg / Object.keys(btc).length;
			irc.say(input.context, `Bitcoin values: [${cur}] Average: ${trimNum(avg)}, high: ${high.val} [${high.from}], low: ${low.val} [${low.from}] (${time})`);
		});
	}
});
