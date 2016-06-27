"use strict";
module.exports = function (lib, logger) {
	var fs = require("fs"), changed = {},
		Json, List, lastAccess = {}, clearCache = {}, dbCache = {};

	function saveCache() {
		var now = Date.now();
		Object.keys(dbCache).forEach(function (fn) {
			if (changed[fn])
				writeFile(fn, dbCache[fn], fn.slice(-4) === ".txt" ? true : false);
			if (clearCache[fn]) {
				if (!lastAccess[fn] || (now-lastAccess[fn]) >= 600000) {
					delete lastAccess[fn]; // hasn't been touched in 10 minutes
					delete dbCache[fn];
				}
			}
		});
		changed = {};
	}

	function cacheCheck(fn, list) {
		lastAccess[fn] = Date.now();
		if (!dbCache[fn])
			dbCache[fn] = readFile(fn, list);
	}

	function writeFile(fn, data, list) {
		if (list) {
			if (!Array.isArray(data)) {
				logger.error("Tried to save non-array to "+fn);
				logger.debug(data);
				return;
			}
			try {
				logger.info("Saving "+fn+" ...");
				fs.writeFileSync(fn, data.join("\n"));
			} catch (e) {
				logger.error("Couldn't write to "+fn+": "+e, e.error);
			}
		} else {
			try {
				data = JSON.stringify(data, null, 3);
			} catch (e) {
				logger.error("Couldn't JSON.stringify data for "+fn+": "+e, e.error);
				logger.debug(data);
				return;
			}
			try {
				logger.info("Saving "+fn+" ...");
				fs.writeFileSync(fn, data);
			} catch (e) {
				logger.error("Couldn't write to "+fn+": "+e, e.error);
			}
		}
	}

	function readFile(fn, list) {
		if (!fs.existsSync(fn)) {
			logger.error("Couldn't read "+fn+", no such file or directory.");
			return;
		}
		if (list) {
			try {
				if (fs.lstatSync(fn).size > 0)
					return fs.readFileSync(fn).toString().split("\n");
				else
					return [];
			} catch (e) {
				logger.error("Couldn't read "+fn+": "+e, e.error);
			}
		} else {
			try {
				return JSON.parse(fs.readFileSync(fn).toString());
			} catch (e) {
				logger.error("Couldn't read or parse "+fn+": "+e, e.error);
			}
		}
	}

	List = function List(options) {
		this.fn = "data/"+options.filename+".txt";
		clearCache[this.fn] = options.clearCache === undefined ? true : options.clearCache;
		if (dbCache[this.fn] === undefined) {
			if (!fs.existsSync(this.fn)) {
				lib.fs.makePath(this.fn);
				dbCache[this.fn] = [];
			} else {
				cacheCheck(this.fn, true);
			}
		}
	};

	List.prototype.size = function () {
		cacheCheck(this.fn, true);
		return dbCache[this.fn].length;
	};

	List.prototype.getAll = function () {
		cacheCheck(this.fn, true);
		return dbCache[this.fn];
	};

	List.prototype.getOne = function (entry, ignoreCase) {
		cacheCheck(this.fn, true);
		for (var i = 0; i < dbCache[this.fn].length; i++) {
			if (ignoreCase) {
				if (dbCache[this.fn][i].toLowerCase() === entry.toLowerCase())
					return dbCache[this.fn][i];
			} else if (dbCache[this.fn][i] === entry) {
				return dbCache[this.fn][i];
			}
		}
		return false;
	};

	List.prototype.random = function () {
		cacheCheck(this.fn, true);
		return lib.randSelect(dbCache[this.fn]);
	};
	// returns an array of entries that contain "word"
	List.prototype.search = function (word, ignoreCase) {
		var i, lword, matches = [];
		cacheCheck(this.fn, true);
		lword = word.toLowerCase();
		for (i = 0; i < dbCache[this.fn].length; i++) {
			if (ignoreCase) {
				if (dbCache[this.fn][i].indexOf(lword) > -1)
					matches.push(dbCache[this.fn][i]);
			} else if (dbCache[this.fn][i].indexOf(word) > -1) {
				matches.push(dbCache[this.fn][i]);
			}
		}
		return matches;
	};

	List.prototype.hasOne = function (entry, ignoreCase) {
		var i, lentry;
		cacheCheck(this.fn, true);
		if (!ignoreCase)
			return dbCache[this.fn].indexOf(entry) > -1;
		lentry = entry.toLowerCase();
		for (i = 0; i < dbCache[this.fn].length; i++) {
			if (dbCache[this.fn][i].toLowerCase() === lentry)
				return true;
		}
		return false;
	};

	List.prototype.saveAll = function (arr) {
		cacheCheck(this.fn, true);
		dbCache[this.fn] = arr;
		changed[this.fn] = true;
	};

	List.prototype.saveOne = function (entry) {
		cacheCheck(this.fn, true);
		dbCache[this.fn].push(entry);
		changed[this.fn] = true;
	};

	List.prototype.removeOne = function (entry) {
		cacheCheck(this.fn, true);
		for (var i = 0; i < dbCache[this.fn].length; i++) {
			if (dbCache[this.fn][i] === entry) {
				dbCache[this.fn].splice(i,1);
				changed[this.fn] = true;
				return;
			}
		}
	};

	Json = function Json(options) {
		this.fn = "data/"+options.filename+".json";
		clearCache[this.fn] = options.clearCache === undefined ? true : options.clearCache;
		if (dbCache[this.fn] === undefined) {
			if (!fs.existsSync(this.fn)) {
				lib.fs.makePath(this.fn);
				dbCache[this.fn] = {};
			} else {
				cacheCheck(this.fn, false);
			}
		}
	};

	Json.prototype.size = function () {
		cacheCheck(this.fn, false);
		return Object.keys(dbCache[this.fn]).length;
	};

	Json.prototype.getOne = function (entry) {
		cacheCheck(this.fn, false);
		if (dbCache[this.fn][entry] !== undefined)
			return dbCache[this.fn][entry];
	};

	Json.prototype.saveOne = function (entry, data) {
		cacheCheck(this.fn, false);
		dbCache[this.fn][entry] = data;
		changed[this.fn] = true;
	};

	Json.prototype.removeOne = function (entry) {
		cacheCheck(this.fn, false);
		if (dbCache[this.fn][entry] !== undefined) {
			delete dbCache[this.fn][entry];
			changed[this.fn] = true;
		}
	};

	Json.prototype.saveAll = function (data) {
		cacheCheck(this.fn, false);
		dbCache[this.fn] = data;
		changed[this.fn] = true;
	};

	Json.prototype.getAll = function () {
		cacheCheck(this.fn, false);
		return dbCache[this.fn];
	};

	Json.prototype.getKeys = function () {
		cacheCheck(this.fn, false);
		return Object.keys(dbCache[this.fn]);
	};

	Json.prototype.hasOne = function (entry) {
		cacheCheck(this.fn, false);
		return dbCache[this.fn].hasOwnProperty(entry);
	};

	setInterval(saveCache, 180000);

	// Save Cache on Exit
	process.on("closing", function () {
		lib.events.emit("closing");
		saveCache();
	});

	process.on("SIGINT", function () {
		lib.events.emit("closing");
		saveCache();
		setTimeout(function () {
			process.exit();
		}, 500);
	});

	return {
		Json: Json,
		List: List
	};
};