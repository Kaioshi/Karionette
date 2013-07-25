// global butt timers
timers = {
	timers: {},
	Add: function (interval, func) {
		if (interval < 10000) {
			logger.error("Tried to add a timer with a < 10 sec frequency.");
			return;
		}
		if (!this.timers[interval]) {
			this.timers[interval] = {
				funcs: [],
				callback: function () {
					if (this.funcs.length > 0) {
						this.funcs.forEach(function (entry) {
							entry();
						});
					}
					setTimeout(function () {
						timers.timers[interval].callback();
					}, interval);
				}
			};
		}
		if (!this.timers[interval].funcs.some(function (entry) { return (entry.toString() === func.toString()); })) {
			this.timers[interval].funcs.push(func);
			this.timers[interval].callback();
		}
	}
};

