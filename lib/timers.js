// global butt timers
"use strict";
function partial(func) {
	var allArgs,
		args = Array.prototype.slice.call(arguments, 1);
	return function() {
		allArgs = args.concat(Array.prototype.slice.call(arguments));
		return func.apply(this, allArgs);
	};
}

global.timers = {
	timers: [],
	Add: function (interval, func) {
		var id, i, args, funcStr, timerArgs;
		funcStr = /^function ([^ ]+)\(/.exec(func.toString())[1];
		args = Array.prototype.slice.call(arguments, 2);
		timerArgs = args.join(" ");
		if (this.timers.length > 0) {
			for (i = 0; i < this.timers.length; i++) {
				if (this.timers[i].func === funcStr && this.timers[i].args === timerArgs) {
					return; // not adding more than one function with the same args.
				}
			}
		}
		id = setInterval(function() {
			partial(func, args)();
		}, interval);
		
		this.timers.push({
			id: id,
			func: funcStr,
			freq: interval,
			args: timerArgs
		});
	},
	Remove: function (interval, func) {
		var i, args;
		if (this.timers.length <= 0) return; // nothing to remove
		func = /^function ([^ ]+)\(/.exec(func.toString())[1];
		args = Array.prototype.slice.call(arguments, 2).join(" ");
		for (i = 0; i < this.timers.length; i++) {
			if (this.timers[i].freq === interval && this.timers[i].func === func && this.timers[i].args === args) {
				this.timers[i].id.close();
				clearInterval(this.timers[i].id);
				timers.timers.splice(i, 1);
			}
		}
	},
	startTick: function (interval) { // timers.startTick(seconds)
		if (!timers.ticks) timers.ticks = {};
		if (timers.ticks[interval]) return; // already running this ticker
		timers.ticks[interval] = setInterval(function () {
			lib.events.emit("Event: "+interval+"s tick");
		}, parseInt(interval, 10)*1000);
	},
	stopTick: function (interval) {
		if (!timers.ticks || !timers.ticks[interval]) return;
		timers.ticks[interval].close();
		clearInterval(timers.ticks[interval]);
		delete timers.ticks[interval];
	}
};

