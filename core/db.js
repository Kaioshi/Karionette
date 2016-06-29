"use strict";
let changed = {}, lastAccess = {}, clearCache = {}, dbCache = {}, isList = {};

function saveCache() {
	let now = Date.now(),
		keys = Object.keys(dbCache);
	for (let i = 0; i < keys.length; i++) {
		let fn = keys[i];
		if (changed[fn])
			writeFile(fn, dbCache[fn]);
		if (clearCache[fn]) {
			if (!lastAccess[fn] || (now-lastAccess[fn]) >= 600000) {
				lastAccess[fn] = null; dbCache[fn] = null;
				delete lastAccess[fn]; // hasn't been touched in 10 minutes
				delete dbCache[fn];
			}
		}
	}
	changed = null;
	changed = {};
}

function cacheCheck(fn) {
	lastAccess[fn] = Date.now();
	if (!dbCache[fn])
		dbCache[fn] = readFile(fn);
}

function writeFile(fn, data) {
	let output;
	if (isList[fn]) {
		if (!Array.isArray(data)) {
			logger.error("Tried to save non-array to "+fn);
			return;
		}
		output = data.join("\n");
	} else {
		try {
			output = JSON.stringify(data, null, 3);
		} catch (e) {
			logger.error("Couldn't JSON.stringify data for "+fn+": "+e, e);
			return;
		}
	}
	try {
		logger.info("Saving "+fn+" ...");
		fs.writeFileSync(fn, output);
	} catch (e) {
		logger.error("Couldn't write to "+fn+": "+e, e);
	}
}

function readFile(fn) {
	if (!fs.existsSync(fn)) {
		if (dbCache[fn]) // this
			return dbCache[fn]; // shouldn't
		dbCache[fn] = isList[fn] ? {} : []; // happen
		changed[fn] = true;
		logger.debug("readFile had to make "+fn+"'s data.");
		return dbCache[fn];
	}
	if (isList[fn]) {
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

class List {
	constructor(options) {
		this.fn = "data/"+options.filename+".txt";
		isList[this.fn] = true;
		clearCache[this.fn] = options.clearCache === undefined ? true : options.clearCache;
		if (dbCache[this.fn] === undefined) {
			if (!fs.existsSync(this.fn)) {
				lib.fs.makePath(this.fn);
				dbCache[this.fn] = [];
				changed[this.fn] = true;
			} else {
				cacheCheck(this.fn);
			}
		}
	}

	size() {
		cacheCheck(this.fn);
		return dbCache[this.fn].length;
	}

	getAll() {
		cacheCheck(this.fn);
		return dbCache[this.fn];
	}

	getOne(entry, ignoreCase) {
		cacheCheck(this.fn);
		for (let i = 0; i < dbCache[this.fn].length; i++) {
			if (ignoreCase) {
				if (dbCache[this.fn][i].toLowerCase() === entry.toLowerCase())
					return dbCache[this.fn][i];
			} else if (dbCache[this.fn][i] === entry) {
				return dbCache[this.fn][i];
			}
		}
		return false;
	}

	random() {
		cacheCheck(this.fn);
		return lib.randSelect(dbCache[this.fn]);
	}
	// returns an array of entries that contain "word"
	search(word, ignoreCase) {
		let i, lword, matches = [];
		cacheCheck(this.fn);
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
	}

	hasOne(entry, ignoreCase) {
		let i, lentry;
		cacheCheck(this.fn);
		if (!ignoreCase)
			return dbCache[this.fn].indexOf(entry) > -1;
		lentry = entry.toLowerCase();
		for (i = 0; i < dbCache[this.fn].length; i++) {
			if (dbCache[this.fn][i].toLowerCase() === lentry)
				return true;
		}
		return false;
	}

	saveAll(arr) {
		cacheCheck(this.fn);
		dbCache[this.fn] = arr;
		changed[this.fn] = true;
	}

	saveOne(entry) {
		cacheCheck(this.fn);
		dbCache[this.fn].push(entry);
		changed[this.fn] = true;
	}

	removeOne(entry) {
		cacheCheck(this.fn);
		for (let i = 0; i < dbCache[this.fn].length; i++) {
			if (dbCache[this.fn][i] === entry) {
				dbCache[this.fn].splice(i,1);
				changed[this.fn] = true;
				return;
			}
		}
	}
}

class Json {
	constructor(options) {
		this.fn = "data/"+options.filename+".json";
		isList[this.fn] = false;
		clearCache[this.fn] = options.clearCache === undefined ? true : options.clearCache;
		if (dbCache[this.fn] === undefined) {
			if (!fs.existsSync(this.fn)) {
				lib.fs.makePath(this.fn);
				dbCache[this.fn] = {};
				changed[this.fn] = true;
			} else {
				cacheCheck(this.fn);
			}
		}
	}

	size() {
		cacheCheck(this.fn);
		return Object.keys(dbCache[this.fn]).length;
	}

	random() {
		cacheCheck(this.fn);
		return dbCache[this.fn][lib.randSelect(Object.keys(dbCache[this.fn]))];
	}

	getOne(entry) {
		cacheCheck(this.fn);
		return dbCache[this.fn][entry] || false;
	}

	saveOne(entry, data) {
		cacheCheck(this.fn);
		dbCache[this.fn][entry] = data;
		changed[this.fn] = true;
	}

	removeOne(entry) {
		cacheCheck(this.fn);
		if (dbCache[this.fn][entry] !== undefined) {
			dbCache[this.fn][entry] = null;
			delete dbCache[this.fn][entry];
			changed[this.fn] = true;
		}
	}

	saveAll(data) {
		cacheCheck(this.fn);
		dbCache[this.fn] = null;
		dbCache[this.fn] = data;
		changed[this.fn] = true;
	}

	getAll() {
		cacheCheck(this.fn);
		return dbCache[this.fn];
	}

	getKeys() {
		cacheCheck(this.fn);
		return Object.keys(dbCache[this.fn]);
	}

	hasOne(entry) {
		cacheCheck(this.fn);
		return dbCache[this.fn].hasOwnProperty(entry);
	}
}

setInterval(saveCache, 180000);

// Save Cache on Exit
process.on("closing", function () {
	bot.emitEvent("closing");
	saveCache();
});

process.on("SIGINT", function () {
	bot.emitEvent("closing");
	saveCache();
	setTimeout(process.exit, 500);
});

plugin.declareGlobal("db", "DB", {
	Json: Json,
	List: List
});
