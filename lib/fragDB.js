// splits objects into one file per key so it can read the part you want
// data/db/dbname/<random letters + numbers>.json
// NOTE: this was made because of JSON.parse's memory leaks in the past.
// XXX investigate if needed in future XXX
"use strict";
module.exports = function (lib, logger, fs) {
	let FragDB,	objCache = {}, keymap = {}, lastFetched = {};

	function makeKey(len) {
		let i, n, ret = "";
		len = len || 8;
		for (i = 0; i < len; i++) {
			n = Math.floor(Math.random()*9);
			if (n >= 5)
				ret += lib.randSelect([ "A", "B", "C", "D", "E", "F" ]);
			else
				ret += n;
		}
		return ret+".json";
	}

	function assignKeyDBs(db, keys) {
		for (let i = 0; i < keys.length; i++)
			keymap[db][keys[i]] = makeKey();
	}

	function loadKeymap(db, dbname) {
		if (fs.existsSync(dbname+"keymap")) {
			try {
				keymap[db] = JSON.parse(fs.readFileSync(dbname+"keymap").toString());
			} catch (err) {
				logger.error("Couldn't load "+dbname+" keymap: "+err, err);
			}
		} else {
			createKeymap(db, dbname);
		}
	}

	function saveKeymap(db, dbname) {
		try {
			fs.writeFileSync(dbname+"keymap", JSON.stringify(keymap[db], null, 3));
		} catch (err) {
			logger.error("Couldn't save "+dbname+" keymap: "+err, err);
		}
	}

	function createKeymap(db, dbname, obj) {
		let keys, data = "{}";
		if (obj) {
			keys = Object.keys(obj);
			if (!keys.length)
				logger.warn("createKeymap got passed an empty object.");
			else {
				assignKeyDBs(db, keys);
				data = JSON.stringify(keymap[db], null, 3);
			}
		}
		try {
			fs.writeFileSync(dbname+"keymap", data);
		} catch (err) {
			logger.error("Couldn't save "+dbname+" keymap: "+err, err);
		}
	}

	function overwriteDB(db, dbname, obj) {
		let i, newkeymap, accessTime, newkeys = Object.keys(obj);
		// find and replace objects with the same keys
		if (!newkeys.length) {
			// delete everything and set the keymap to {}
			logger.warn("Would be wiping "+dbname+" and resetting keymap - saveAll was passed an empty object.");
			// implement this in future if this happens I guess.
			return;
		}
		newkeymap = {}; accessTime = Date.now();
		for (i = 0; i < newkeys.length; i++) {
			if (keymap[db][newkeys[i]] !== undefined) {
				newkeymap[newkeys[i]] = keymap[db][newkeys[i]];
				keymap[db][newkeys[i]] = null;
				delete keymap[db][newkeys[i]];
				if (objCache[db][newkeys[i]] !== undefined) {
					objCache[db][newkeys[i]] = null;
					lastFetched[db][newkeys[i]] = null;
					delete objCache[db][newkeys[i]];
					delete lastFetched[db][newkeys[i]];
				}
			} else {
				newkeymap[newkeys[i]] = makeKey();
			}
			// write~
			try {
				objCache[db][newkeys[i]] = obj[newkeys[i]];
				lastFetched[db][newkeys[i]] = accessTime;
				fs.writeFileSync(dbname+newkeymap[newkeys[i]], JSON.stringify(obj[newkeys[i]], null, 3));
			} catch (err) {
				logger.error("Couldn't save "+dbname+" object "+newkeys[i]+" : "+newkeymap[newkeys[i]]+": "+err, err);
			}
		}
		// whatever is left in the old keymap needs deleting
		Object.keys(keymap[db]).forEach(function (key) {
			try {
				if (objCache[db][key] !== undefined) {
					objCache[db][key] = null;
					lastFetched[db][key] = null;
					delete objCache[db][key];
					delete lastFetched[db][key];
				}
				fs.unlinkSync(dbname+keymap[db][key]);
			} catch (err) {
				logger.error("Couldn't delete "+dbname+" object "+key+" : "+keymap[db][key]+": "+err, err);
			}
		});
		keymap[db] = newkeymap;
		saveKeymap(db, dbname);
	}

	function ensureDBEnv(db, dbname, old) {
		let data;
		if (keymap[db] !== undefined)
			keymap[db] = null;
		keymap[db] = {};
		if (objCache[db] !== undefined)
			objCache[db] = null;
		objCache[db] = {};
		if (lastFetched[db] !== undefined)
			lastFetched[db] = null;
		lastFetched[db] = {};
		if (!fs.existsSync(dbname)) {
			if (!lib.fs.makePath(dbname))
				return false;
			if (old) {
				if (fs.existsSync(old)) {
					logger.info("Converting "+old+" to fragmented db ...");
					try {
						data = JSON.parse(fs.readFileSync(old).toString());
						if (Object.keys(data).length)
							overwriteDB(db, dbname, data);
					} catch (err) {
						logger.error("Couldn't convert "+old+" to fragmented db: "+err, err);
						return false;
					}
				}
			}
		}
		return true;
	}

	function clearCache(specificDB, specificKey) {
		if (specificDB) {
			if (objCache[specificDB] !== undefined) {
				if (specificKey) {
					if (objCache[specificDB][specificKey] !== undefined) {
						objCache[specificDB][specificKey] = null;
						lastFetched[specificDB][specificKey] = null;
						delete objCache[specificDB][specificKey];
						delete lastFetched[specificDB][specificKey];
					}
				} else {
					lastFetched[specificDB] = null;
					objCache[specificDB] = null;
					lastFetched[specificDB] = {};
					objCache[specificDB] = {};
				}
			}
		} else {
			let now = new Date().valueOf(),
				db = Object.keys(objCache);
			for (let i = 0; i < db.length; i++) {
				let keys = Object.keys(lastFetched[db[i]]);
				if (!keys.length)
					continue;
				for (let k = 0; k < keys.length; k++) {
					if ((now - lastFetched[db[i]][keys[k]]) >= 900000) { // 15 minutes
						objCache[db[i]][keys[k]] = null;
						lastFetched[db[i]][keys[k]] = null;
						delete objCache[db[i]][keys[k]];
						delete lastFetched[db[i]][keys[k]];
					}
				}
			}
		}
	}

	function getFullDB(db, dbname) { // egads. please don't do this D:
		if (Object.keys(keymap[db]).length !== Object.keys(objCache[db]).length) {
			// need to fill the objCache
			let accessTime = Date.now(),
				key;
			for (key in keymap[db]) {
				if (keymap[db].hasOwnProperty(key)) {
					try {
						if (objCache[db][key] === undefined)
							objCache[db][key] = JSON.parse(fs.readFileSync(dbname+keymap[db][key]).toString());
						lastFetched[db][key] = accessTime;
					} catch (err) { // THE WHOROR
						logger.error("Failed to read "+dbname+" object "+key+" : "+keymap[db][key]+": "+err, err);
					}
				}
			}
		}
		return objCache[db]; // IT HURTS US
	}

	function getKeysObj(db) {
		let stub, keys = Object.keys(keymap[db]);
		if (!keys.length)
			return {};
		stub = {};
		keys.forEach(function (key) {
			stub[key] = "";
		});
		return stub;
	}

	function removeOne(db, dbname, key) {
		if (!keymap[db][key])
			return;
		try {
			if (objCache[db][key] !== undefined) {
				lastFetched[db][key] = null;
				objCache[db][key] = null;
				delete lastFetched[db][key];
				delete objCache[db][key];
			}
			fs.unlinkSync(dbname+keymap[db][key]);
			keymap[db][key] = null;
			delete keymap[db][key];
			saveKeymap(db, dbname);
		} catch (err) {
			logger.error("Couldn't remove "+db+" object: "+key+" : "+keymap[db][key]+": "+err, err);
		}
	}

	function saveOne(db, dbname, key, data) {
		if (!keymap[db][key])
			keymap[db][key] = makeKey();
		try {
			if (objCache[db][key] !== undefined) {
				objCache[db][key] = data;
				lastFetched[db][key] = Date.now();
			}
			fs.writeFileSync(dbname+keymap[db][key], JSON.stringify(data, null, 3));
			saveKeymap(db, dbname);
		} catch (err) {
			logger.error("Couldn't write "+dbname+" data: "+err, err);
		}
	}

	function getOne(db, dbname, key) {
		if (keymap[db][key] === undefined)
			return;
		if (objCache[db][key] !== undefined) {
			lastFetched[db][key] = Date.now();
			return objCache[db][key];
		}
		try {
			objCache[db][key] = JSON.parse(fs.readFileSync(dbname+keymap[db][key]).toString());
			lastFetched[db][key] = Date.now();
			return objCache[db][key];
		} catch (err) {
			logger.error("Couldn't get "+key+" : "+keymap[db][key]+" data: "+err, err);
		}
	}

	setInterval(clearCache, 300000); // 5 minutes between cache clears

	FragDB = function (db, old) {
		this.db = db;
		this.dbname = "data/db/"+this.db+"/";
		if (!ensureDBEnv(this.db, this.dbname, old))
			logger.error("Failed to ensure DB environment for "+this.db);
		else
			loadKeymap(this.db, this.dbname);
	};

	FragDB.prototype.getOne = function (key) { return getOne(this.db, this.dbname, key); };
	FragDB.prototype.saveOne = function (key, data) { saveOne(this.db, this.dbname, key, data); };
	FragDB.prototype.removeOne = function (key) { removeOne(this.db, this.dbname, key); };
	FragDB.prototype.hasOne = function (key) { return keymap[this.db][key] !== undefined ? true : false; };
	FragDB.prototype.getKeys = function () { return Object.keys(keymap[this.db]); };
	FragDB.prototype.getKeysObj = function () { return getKeysObj(this.db); };
	FragDB.prototype.getAll = function () { return getFullDB(this.db, this.dbname); };
	FragDB.prototype.saveAll = function (obj) { overwriteDB(this.db, this.dbname, obj); };
	FragDB.prototype.clearCache = function (key) { clearCache(this.db, key); };

	return FragDB;
};
