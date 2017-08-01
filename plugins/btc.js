"use strict";

const [web, lib] = plugin.importMany("web", "lib");

function currencyURL(code) {
	return `https://apiv2.bitcoinaverage.com/indices/global/ticker/BTC${code}`;
}

const KEYS = ["AUD","BRL","CAD","CNY","CZK","EUR","GBP","IDR","ILS","JPY","MXN","MYR","NGN","NZD","PLN","RUB","SEK","SGD","TRY","USD","ZAR","AED",
	"AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTC","BTN","BWP","BYN",
	"BZD","CAD","CDF","CHF","CLF","CLP","CNH","CNY","COP","CRC","CUC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP",
	"GBP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD",
	"JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRO",
	"MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB",
	"RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLL","SOS","SRD","SSP","STD","SVC","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD",
	"TZS","UAH","UGX","USD","UYU","UZS","VEF","VND","VUV","WST","XAF","XAG","XAU","XCD","XDR","XOF","XPD","XPF","XPT","YER","ZAR","ZMW","ZWL"];

let CURRENCY = KEYS.reduce((acc, code) => { acc[code] = currencyURL(code); return acc; }, {});

bot.command({
	command: "btc",
	help: "Retrieves high and low of bitcoin value. Defaults to USD if no argument is given",
	syntax: `${config.command_prefix}btc [<currency code>] - Example: ${config.command_prefix}btc AUD`,
	callback: function (input) {
		let cur;
		if (input.args && input.args[0] !== undefined)
			cur = input.args[0].toUpperCase();
		else
			cur = "USD";
		if (!CURRENCY[cur]) {
			irc.say(input.context, `Invalid currency. Available: ${lib.commaList(KEYS)}.`);
			return;
		}
		web.json(CURRENCY[cur]).then(function (btc) {
			irc.say(input.context, `BTC prices in ${cur} - high: ${btc.high}, low: ${btc.low} - average for the day: ${btc.averages.day}, week: ${btc.averages.week}, month: ${btc.averages.month}`);
		}).catch(err => {
			irc.say(input.context, "Somethin' done broke. Whine at Kaioshi.");
			logger.error(";btc failed", err);
		});
	}
});
