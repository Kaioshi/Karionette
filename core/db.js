"use strict";

const [fs, process, lib, ticker, setTimeout] = plugin.importMany("fs", "process", "lib", "ticker", "setTimeout"),
	dbCache = Object.create(null), atime = Object.create(null), recent = Object.create(null);

function saveCache() {
	lib.runCallback(function *(cb) {
		for (const db in dbCache) {
			if (!dbCache[db]._modified)
				continue;
			try {
				yield fs.writeFile(dbCache[db].fn, dbCache[db]._writeFile(), cb);
				dbCache[db]._modified = false;
				logger.info("Saved "+dbCache[db].fn);
			} catch (err) {
				logger.error("Failed to write "+dbCache[db].fn+": "+err.message, err.stack);
			}
		}
	});
}

function saveAndExit() {
	lib.runCallback(function *(cb) {
		for (const db in dbCache) {
			if (!dbCache[db]._modified)
				continue;
			try {
				yield fs.writeFile(dbCache[db].fn, dbCache[db]._writeFile(), cb);
				logger.info("Saved "+dbCache[db].fn);
			} catch (err) {
				logger.error("Failed to write "+dbCache[db].fn+": "+err.message, err.stack);
			}
		}
		process.exit(0);
	});
}

class DBObject {
	constructor(obj) { this.setAll(obj); }
	size() { return this.keys.length; }
	findKey(key) {
		const lkey = key.toLowerCase();
		for (let i = 0; i < this.keys.length; i++)
			if (lkey === this.keys[i].toLowerCase())
				return this.keys[i];
	}
	get(key, ignoreCase) {
		if (this.obj[key] !== undefined)
			return this.obj[key];
		if (ignoreCase) {
			const k = this.findKey(key);
			return k ? this.obj[k] : undefined;
		}
	}
	has(key, ignoreCase) { return ignoreCase ? this.findKey(key) !== undefined : this.obj[key] !== undefined; }
	set(key, value, matchCase) {
		if (this.obj[key] !== undefined) {
			const k = matchCase ? this.findKey(key) || key : key;
			this.obj[k] = value;
		} else {
			this.obj[key] = value;
			this.keys.push(key);
		}
	}
	setAll(obj) {
		this.obj = Object.create(null);
		this.keys = [];
		for (const key in obj) {
			this.keys.push(key);
			this.obj[key] = obj[key];
		}
	}
	delete(key, ignoreCase) {
		const k = ignoreCase ? this.findKey(key) || key : key;
		if (this.obj[k] !== undefined) {
			this.obj[k] = null;
			delete this.obj[k];
			this.keys.splice(this.keys.indexOf(k), 1);
			return true;
		}
		return false;
	}
	clear() {
		for (const key in this.obj) {
			this.obj[key] = null;
			delete this.obj[key];
		}
		this.keys = [];
	}
	values() {
		const values = [];
		for (let i = 0; i < this.keys.length; i++)
			values.push(this.obj[this.keys[i]]);
		return values;
	}
	forEach(callback) {
		for (let i = 0; i < this.keys.length; i++)
			callback(this.obj[this.keys[i]], this.keys[i]);
	}
}

class DB {
	constructor(fn) {
		this.fn = fn;
		dbCache[this.fn] = this;
	}
	get data() {
		if (!recent[this.fn]) {
			recent[this.fn] = true;
			atime[this.fn] = Date.now();
			setTimeout(() => recent[this.fn] = false, 1000);
		}
		if (!this._loaded)
			this.read();
		return this._data;
	}
	read() {
		if (!fs.existsSync(this.fn) || fs.lstatSync(this.fn).size === 0) {
			lib.fs.makePath(this.fn);
			this.clear();
			this._loaded = true;
			this._modified = true;
		} else {
			try {
				this._data = this._readFile();
				this._loaded = true;
			} catch (err) {
				logger.error("Failed to read/parse "+this.fn+": "+err.message, err);
			}
		}
	}
}

class Json extends DB {
	_writeFile() { return JSON.stringify(this._data.obj, null, 3); }
	_readFile() { return new DBObject(JSON.parse(fs.readFileSync(this.fn).toString())); }
	clear() {
		this._data.clear();
		this._modified = false;
		this._loaded = false;
	}
	size() { return this.data.keys.length; }
	random() { return this.data.obj[lib.randSelect(this.data.keys)]; }
	getKeys() { return this.data.keys; }
	saveAll(obj) { this._modified = true; this._data.setAll(obj); }
	getAll() { return this.data.obj; }
	hasOne(key, ignoreCase) { return this.data.has(key, ignoreCase); }
	getOne(key, ignoreCase) { return this.data.get(key, ignoreCase); }
	saveOne(key, value, matchCase) { this._modified = true; this.data.set(key, value, matchCase); }
	removeOne(key, ignoreCase) {
		const result = this.data.delete(key, ignoreCase);
		if (result) {
			this._modified = true;
			return true;
		}
		return false;
	}
	forEach(callback) { return this.data.forEach(callback); }
}

class List extends DB {
	_writeFile() { return JSON.stringify(this._data, null, 3); }
	_readFile() {
		try {
			return JSON.parse(fs.readFileSync(this.fn).toString());
		} catch (e) { // old format - save just to update it
			this._modified = true;
			return fs.readFileSync(this.fn).toString().split("\n");
		}
	}
	clear() {
		if (!this._data)
			this._data = [];
		else if (this._data.length) {
			this._data = null;
			this._data = [];
		}
		this._modified = false;
		this._loaded = false;
	}
	getAll() { return this.data; }
	saveAll(arr) { this._modified = true; this._data = arr; }
	size() { return this.data.length; }
	random() { return lib.randSelect(this.data); }
	saveOne(entry) { this._modified = true; this.data.push(entry); }
	hasOne(entry, ignoreCase) { return this.indexOf(entry, ignoreCase) > -1; }
	forEach() { return this.data.forEach; }
	indexOf(entry, ignoreCase) {
		if (ignoreCase) {
			const match = entry.toLowerCase();
			for (let i = 0; i < this.data.length; i++) {
				if (this.data[i].toLowerCase() === match)
					return i;
			}
			return -1;
		}
		return this.data.indexOf(entry);
	}
	findIndex(searchString, ignoreCase) {
		if (ignoreCase) {
			const match = searchString.toLowerCase();
			for (let i = 0; i < this.data.length; i++) {
				if (this.data[i].toLowerCase().indexOf(match) > -1)
					return i;
			}
		} else {
			for (let i = 0; i < this.data.length; i++) {
				if (this.data[i].indexOf(searchString) > -1)
					return i;
			}
		}
		return -1;
	}
	getOne(entry, ignoreCase) {
		const index = this.indexOf(entry, ignoreCase);
		if (index > -1)
			return this.data[index];
	}
	removeOne(entry) {
		const index = this.indexOf(entry);
		if (index > -1) {
			this.data.splice(index,1);
			this._modified = true;
			return true;
		}
		return false;
	}
	search(searchString, ignoreCase, index) { // returns an array of entries or indexes that contain searchString
		let ret = [];
		const match = ignoreCase ? searchString.toLowerCase() : searchString;
		for (let i = 0; i < this.data.length; i++) {
			const line = ignoreCase ? this.data[i].toLowerCase() : this.data[i];
			if (line.includes(match))
				ret.push(index ? i : this.data[i]);
		}
		return ret;
	}
	removeMatching(searchString, ignoreCase) {
		let index;
		while ((index = this.findIndex(searchString, ignoreCase)) > -1) {
			this.data.splice(index, 1);
			this._modified = true;
		}
	}
}

ticker.start(30); // save every 5 minutes
bot.event({ handle: "save DB Cache", event: "Ticker: 30s tick", callback: saveCache });
bot.event({ handle: "save DB on Quit", event: "closing", callback: saveAndExit });
process.on("SIGINT", saveAndExit); // Ctrl-C etc

plugin.export("DB", {
	Json: function (options) {
		if (!options || options.filename === undefined)
			throw new Error("filename isn't optional in new DB.Json({filename: \"filename\"})");
		const fn = "data/"+options.filename+".json";
		return dbCache[fn] || new Json(fn);
	},
	List: function (options) {
		if (!options || options.filename === undefined)
			throw new Error("filename isn't optional in new DB.List({filename: \"filename\"})");
		const fn = "data/"+options.filename+".txt";
		return dbCache[fn] || new List(fn);
	}
});
