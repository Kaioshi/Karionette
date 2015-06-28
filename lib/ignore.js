"use strict";
module.exports = function (DB, lib, ial) {
	var ignoreDB = new DB.List({filename: "ignore"}),
		ignoreCache = {},
		ignored = ignoreDB.getAll();

	return {
		check: function checkIgnored(input) {
			var i, user = input.slice(1, input.indexOf(" "));
			// fast path! :D
			if (ignoreCache[user] !== undefined)
				return ignoreCache[user];
			// slow path. :<
			for (i = 0; i < ignored.length; i++) {
				if (ial.maskMatch(user, ignored[i])) { // <- this is why we keep it in memory.
					ignoreCache[user] = true;
					return true;
				}
			}
			ignoreCache[user] = false;
			return false;
		},
		add: function ignoreAdd(target) { // moving this here since this is the only place that pokes it.
			if (!lib.hasElement(ignored, target)) {
				ignored.push(target);
				ignoreDB.saveAll(ignored);
				ignoreCache = {}; // reset
				return target+" has been added to ignore.";
			}
			return target+" is already being ignored.";
		},
		remove: function unignore(target) {
			var i;
			for (i = 0; i < ignored.length; i++) {
				if (ignored[i] === target) {
					ignored.splice(i, 1);
					ignoreDB.saveAll(ignored);
					ignoreCache = {}; // reset
					return target+" has been removed from ignore.";
				}
			}
			return target+" was not being ignored.";
		},
		list: function ignoreList() {
			return ignored.join(", ");
		}
	};
};
