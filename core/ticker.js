// tickers!
"use strict";
let	tickers = {}, ticker;

ticker = {
	start: function startTicker(interval) {
		if (tickers[interval])
			return; // already running this ticker
		tickers[interval] = setInterval(function () {
			bot.emitEvent("Ticker: "+interval+"s tick");
		}, parseInt(interval, 10)*1000);
	},
	stop: function stopTicker(interval) {
		if (!tickers || !tickers[interval])
			return;
		tickers[interval].close();
		clearInterval(tickers[interval]);
		delete tickers[interval];
	}
};

plugin.declareGlobal("ticker", "ticker", ticker);
