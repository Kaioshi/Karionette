"use strict";
const dbCache = new Map();

class DB {
	constructor(fn, defaultData, readFunc, writeFunc) {
		this.fn = fn;
		this._modified = false;
		this._readFile = readFunc;
		this._writeFile = writeFunc;
		this._defaultData = defaultData;
		this._loaded = false;
		dbCache.set(this.fn, this);
	}
	static saveCache() { dbCache.forEach(db => db.write()); }
	get data() { this.read(); return this._data; }
	set data(data) { this.read(); this._data = data; }
	read() {
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
		if (!this._modified)
			return;
		try {
			logger.info("Saving "+this.fn+" ...");
			this._writeFile(this.fn, this.data);
			this._modified = false;
		} catch (err) {
			logger.error("Failed to write "+this.fn+": "+err.message, err);
		}
	}
}

function objToMap(obj) {
	let map = new Map();
	Object.keys(obj).forEach(key => map.set(key, obj[key]));
	return map;
}

function mapToObj(map) {
	let obj = {};
	map.forEach((value, key) => obj[key] = value);
	return obj;
}

function writeJson(fn, data) { fs.writeFileSync(fn, JSON.stringify(mapToObj(data), null, 3)); }
function readJson(fn) { return objToMap(JSON.parse(fs.readFileSync(fn).toString())); }

class Json extends DB {
	constructor(filename) { super(filename, new Map(), readJson, writeJson); }
	size() { return this.data.size; }
	random() { return lib.randSelect([ ...this.data ]); }
	hasOne(key) { return this.data.has(key); }
	getKeys() { return [ ...this.data.keys() ]; }
	saveOne(key, value) { this._modified = true; this.data.set(key, value); }
	getOne(key) { return this.data.get(key); }
	getAll() { return mapToObj(this.data); }
	saveAll(obj) { this._modified = true; this._data = objToMap(obj); }
	removeOne(key) { this._modified = true; return this.data.delete(key); }
}

function writeList(fn, data) { fs.writeFileSync(fn, data.join("\n")); }
function readList(fn) { return fs.readFileSync(fn).toString().split("\n"); }

class List extends DB {
	constructor(filename) { super(filename, [], readList, writeList); }
	getAll() { return this.data; }
	saveAll(arr) { this._modified = true; this._data = arr; }
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
		}
	}
	search(searchString, ignoreCase, index) { // returns an array of entries or indexes that contain searchString
		let ret = [];
		const match = ignoreCase ? searchString.toLowerCase() : searchString;
		for (let i = 0; i < this.data.length; i++) {
			const line = ignoreCase ? this.data[i].toLowerCase() : this.data[i];
			if (line.indexOf(match) > -1)
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

ticker.start(300); // save every 5 minutes
bot.event({ handle: "save DB Cache", event: "Ticker: 300s tick", callback: DB.saveCache });

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
		return dbCache.get(fn) || new Json(fn);
	},
	List: function (options) {
		if (!options || options.filename === undefined)
			throw new Error("filename isn't optional in new DB.List({filename: \"filename\"})");
		const fn = "data/"+options.filename+".txt";
		return dbCache.get(fn) || new List(fn);
	}
});
