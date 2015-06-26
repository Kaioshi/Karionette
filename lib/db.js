"use strict";
module.exports = function (lib, logger) {
	var fs = require("fs"), changed = {},
		Json, List, dbCache = {};

	function saveCache() {
		Object.keys(changed).forEach(function (fn) {
			writeFile(fn, dbCache[fn], fn.slice(-4) === ".txt" ? true : false);
		});
		changed = {};
	}

	function makePath(fn) {
		var path = fn.split("/").slice(0,-1),
			i, curPath = "";
		for (i = 0; i < path.length; i++) {
			curPath += path[i]+"/";
			if (!fs.existsSync(curPath)) {
				try {
					logger.info("Created directory "+curPath);
					fs.mkdirSync(curPath);
				} catch (e) {
					logger.error("Couldn't create directory "+curPath+": "+e, e.error);
					return;
				}
			}
		}
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
		if (dbCache[this.fn] === undefined) {
			if (!fs.existsSync(this.fn)) {
				makePath(this.fn);
				dbCache[this.fn] = [];
				changed[this.fn] = true;
			} else {
				dbCache[this.fn] = readFile(this.fn, true);
			}
		}
	};

	List.prototype.size = function () {
		return dbCache[this.fn].length;
	};

	List.prototype.getAll = function () {
		return dbCache[this.fn];
	};

	List.prototype.getOne = function (entry, ignoreCase) {
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

	List.prototype.hasOne = function (entry, ignoreCase) {
		for (var i = 0; i < dbCache[this.fn].length; i++) {
			if (ignoreCase) {
				if (dbCache[this.fn][i].toLowerCase() === entry.toLowerCase())
					return true;
			} else if (dbCache[this.fn][i] === entry) {
				return true;
			}
		}
		return false;
	};

	List.prototype.saveAll = function (arr) {
		dbCache[this.fn] = arr;
		changed[this.fn] = true;
	};

	List.prototype.saveOne = function (entry) {
		dbCache[this.fn].push(entry);
		changed[this.fn] = true;
	};

	List.prototype.removeOne = function (entry) {
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
		if (dbCache[this.fn] === undefined) {
			if (!fs.existsSync(this.fn)) {
				makePath(this.fn);
				dbCache[this.fn] = {};
				changed[this.fn] = true;
			} else {
				dbCache[this.fn] = readFile(this.fn);
			}
		}
	};

	Json.prototype.size = function () {
		return Object.keys(dbCache[this.fn]).length;
	};

	Json.prototype.getOne = function (entry) {
		if (dbCache[this.fn][entry] !== undefined)
			return dbCache[this.fn][entry];
	};

	Json.prototype.saveOne = function (entry, data) {
		dbCache[this.fn][entry] = data;
		changed[this.fn] = true;
	};

	Json.prototype.removeOne = function (entry) {
		if (dbCache[this.fn][entry] !== undefined) {
			delete dbCache[this.fn][entry];
			changed[this.fn] = true;
		}
	};

	Json.prototype.saveAll = function (data) {
		dbCache[this.fn] = data;
		changed[this.fn] = true;
	};

	Json.prototype.getAll = function () {
		return dbCache[this.fn];
	};

	Json.prototype.getKeys = function () {
		return Object.keys(dbCache[this.fn]);
	};

	Json.prototype.hasOne = function (entry) {
		return dbCache[this.fn].hasOwnProperty(entry);
	};

	setInterval(saveCache, 300000);

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
