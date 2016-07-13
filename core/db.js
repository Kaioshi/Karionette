"use strict";
const dbCache = {};

class DB {
	constructor(fn, defaultData, readFunc, writeFunc) {
		this.fn = fn;
		this._modified = false;
		this._readFile = readFunc;
		this._writeFile = writeFunc;
		this._defaultData = defaultData;
		this._loaded = false;
		dbCache[this.fn] = this;
	}
	static saveCache() { Object.keys(dbCache).forEach(db => dbCache[db].write()); }
	get data() { this.read(); return this._data; }
	set data(data) { this._data = data; }
	getAll() { return this.data; }
	saveAll(data) { this._modified = true; this._data = data; }
	read() {
		this._lastAccess = Date.now();
		if (this._loaded)
			return;
		if (!fs.existsSync(this.fn) || fs.lstatSync(this.fn).size === 0) {
			lib.fs.makePath(this.fn);
			this._data = this._defaultData;
			this._loaded = true;
			return;
		}
		try {
			this._data = this._readFile(this.fn);
			this._loaded = true;
		} catch (err) {
			logger.error("Failed to read/parse "+this.fn+": "+err.message, err);
		}
	}
	write() {
		if (!this._modified) { // if DB wasn't accessed for >5 minutes, clear the data.
			if (this._loaded && (!this._lastAccess || (Date.now()-this._lastAccess) >= 600000)) {
				this._data = null;
				this._loaded = false;
			}
			return;
		}
		try {
			logger.info("Saving "+this.fn+" ...");
			this._writeFile(this.fn, this.data);
			this._modified = false;
		} catch (err) {
			logger.error("Failed to write "+this.fn+": "+err.message, err);
		}
	}
}

class Json extends DB {
	constructor(fileName) {
		super(fileName, {}, fn => JSON.parse(fs.readFileSync(fn).toString()),
			(fn, data) => fs.writeFileSync(fn, JSON.stringify(data, null, 3)));
	}
	size() { return Object.keys(this.data).length; }
	random() { return this.data[lib.randSelect(Object.keys(this.data))]; }
	hasOne(handle) { return this.data[handle] !== undefined; }
	getKeys() { return Object.keys(this.data); }
	saveOne(handle, entry) { this._modified = true; this.data[handle] = entry; }
	getOne(handle) { return this.data[handle] || false; }
	removeOne(handle) {
		if (this.data[handle] !== undefined) {
			delete this.data[handle];
			this._modified = true;
		}
	}
}

class List extends DB {
	constructor(fileName) {
		super(fileName, [], fn => fs.readFileSync(fn).toString().split("\n"),
			(fn, data) => fs.writeFileSync(fn, data.join("\n")));
	}
	size() { return this.data.length; }
	random() { return lib.randSelect(this.data); }
	saveOne(entry) { this._modified = true; this.data.push(entry); }
	hasOne(entry, ignoreCase) { return this.indexOf(entry, ignoreCase) > -1; }
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
		}
	}
	search(searchString, ignoreCase) { // returns an array of entries that contain match
		let ret = [];
		const match = ignoreCase ? searchString.toLowerCase() : searchString;
		for (let i = 0; i < this.data.length; i++) {
			const line = ignoreCase ? this.data[i].toLowerCase() : this.data[i];
			if (line.indexOf(match) > -1)
				ret.push(this.data[i]);
		}
		return ret;
	}
}

setInterval(DB.saveCache, 300000);
process.on("closing", DB.saveCache); // regular quit
process.on("SIGINT", function () { // Ctrl-C - since we capture it we have to exit manually
	DB.saveCache();
	setTimeout(process.exit, 500);
});

plugin.declareGlobal("db", "DB", {
	Json: function (options) {
		if (!options || options.filename === undefined)
			throw new Error("filename isn't optional in new DB.Json({filename: \"filename\"})");
		const fn = "data/"+options.filename+".json";
		if (dbCache[fn])
			return dbCache[fn];
		return new Json(fn);
	},
	List: function (options) {
		if (!options || options.filename === undefined)
			throw new Error("filename isn't optional in new DB.List({filename: \"filename\"})");
		const fn = "data/"+options.filename+".txt";
		if (dbCache[fn])
			return dbCache[fn];
		return new List(fn);
	}
});
