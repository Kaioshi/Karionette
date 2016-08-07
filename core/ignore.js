"use strict";
const ial = plugin.import("ial");

class Ignore {
	constructor() {
		this._cache = Object.create(null);
		this.db = plugin.import("DB").List({filename: "ignore"});
	}
	list() { return this.db.data.join(", "); }
	check(input) {
		const user = input.slice(1, input.indexOf(" "));
		if (this._cache[user] !== undefined)
			return this._cache[user];
		if (user.includes(".")) { // server
			this._cache[user] = false;
			return false;
		}
		// slow path. :<
		for (let i = 0; i < this.db.data.length; i++) {
			if (ial.maskMatch(user, this.db.data[i])) { // <- this is why we keep it in memory.
				this._cache[user] = true;
				return true;
			}
		}
		this._cache[user] = false;
		return false;
	}
	add(target) { // moving this here since this is the only place that pokes it.
		if (!this.db.hasOne(target)) {
			this.db.saveOne(target);
			this._cache = Object.create(null); // reset
			return target+" has been added to ignore.";
		}
		return target+" is already being ignored.";
	}
	remove(target) {
		if (this.db.removeOne(target)) {
			this._cache = Object.create(null); // reset
			return target+" has been removed from ignore.";
		}
		return target+" was not being ignored.";
	}
}

plugin.export("ignore", new Ignore());
