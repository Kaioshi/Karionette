// tickers!
"use strict";
module.exports = function (emitEvent) {
	let	tickers = {};

	return {
		start: function startTicker(interval) { // timers.startTick(seconds)
			if (tickers[interval])
				return; // already running this ticker
			tickers[interval] = setInterval(function () {
				//lib.events.emit("Event", { event: "Ticker: "+interval+"s tick" });
				emitEvent("Ticker: "+interval+"s tick");
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
};
