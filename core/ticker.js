// tickers!
"use strict";
const [setInterval, clearInterval] = plugin.importMany("setInterval", "clearInterval");

class Ticker {
	constructor() { this.tickers = Object.create(null); }
	start(interval) {
		if (this.tickers[interval])
			return; // already running this ticker
		this.tickers[interval] = setInterval(function() {
			bot.emitEvent("Ticker: "+interval+"s tick");
		}, parseInt(interval, 10)*1000);
	}
	stop(interval) {
		if (!this.tickers[interval])
			return;
		this.tickers[interval].close();
		clearInterval(this.tickers[interval]);
		delete this.tickers[interval];
	}
}

plugin.export("ticker", new Ticker());
