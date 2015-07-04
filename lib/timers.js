// global butt timers
"use strict";
module.exports = function (lib, emitEvent) {
	var timers = [],
		tickers = {};
	function partial(func) {
		var allArgs,
			args = Array.prototype.slice.call(arguments, 1);
		return function() {
			allArgs = args.concat(Array.prototype.slice.call(arguments));
			return func.apply(this, allArgs);
		};
	}

	return {
		Add: function (interval, func) {
			var id, i, args, funcStr, timerArgs;
			funcStr = /^function ([^ ]+)\(/.exec(func.toString())[1];
			args = Array.prototype.slice.call(arguments, 2);
			timerArgs = args.join(" ");
			if (timers.length > 0) {
				for (i = 0; i < timers.length; i++) {
					if (timers[i].func === funcStr && timers[i].args === timerArgs) {
						return; // not adding more than one function with the same args.
					}
				}
			}
			id = setInterval(function() {
				partial(func, args)();
			}, interval);

			timers.push({
				id: id,
				func: funcStr,
				freq: interval,
				args: timerArgs
			});
		},
		Remove: function (interval, func) {
			var i, args;
			if (timers.length <= 0)
				return; // nothing to remove
			func = /^function ([^ ]+)\(/.exec(func.toString())[1];
			args = Array.prototype.slice.call(arguments, 2).join(" ");
			for (i = 0; i < timers.length; i++) {
				if (timers[i].freq === interval && timers[i].func === func && timers[i].args === args) {
					timers[i].id.close();
					clearInterval(timers[i].id);
					timers.splice(i, 1);
				}
			}
		},
		startTick: function (interval) { // timers.startTick(seconds)
			if (tickers[interval])
				return; // already running this ticker
			tickers[interval] = setInterval(function () {
				emitEvent("Ticker: "+interval+"s tick");
			}, parseInt(interval, 10)*1000);
		},
		stopTick: function (interval) {
			if (!tickers || !tickers[interval])
				return;
			tickers[interval].close();
			clearInterval(tickers[interval]);
			delete tickers[interval];
		}
	};
};
