// splits objects into one file per key so it can read the part you want
// need to maintain a keymap - no getAll ?
// data/db/dbname/<random letters + numbers>.json
"use strict";
var fs = require('fs'),
	objCache = {}, keymap = {}, lastFetched = {};

function makeKey(len) {
	var i = 0, n, ret = "";
	len = len || 8;
	for (; i < len; i++) {
		n = Math.floor(Math.random()*9);
		if (n >= 5)
			ret += lib.randSelect([ "A", "B", "C", "D", "E", "F" ]);
		else
			ret += n;
	}
	return ret+".json";
}

function assignKeyDBs(db, keys) {
	var i = 0, l = keys.length;
	for (; i < l; i++)
		keymap[db][keys[i]] = makeKey();
}

function loadKeymap(db, dbname) {
	if (fs.existsSync(dbname+"keymap")) {
		try {
			//logger.info("Loading "+dbname+" keymap ...");
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
		//logger.info("Saving "+dbname+" keymap ...");
		fs.writeFileSync(dbname+"keymap", JSON.stringify(keymap[db], null, 3));
	} catch (err) {
		logger.error("Couldn't save "+dbname+" keymap: "+err, err);
	}
}

function createKeymap(db, dbname, obj) {
	var keys, data = "{}";
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
		//logger.info("Created "+dbname+" keymap");
		fs.writeFileSync(dbname+"keymap", data);
	} catch (err) {
		logger.error("Couldn't save "+dbname+" keymap: "+err, err);
	}
}

function overwriteDB(db, dbname, obj) {
	var i, l, key, newkeymap, accessTime, newkeys = Object.keys(obj);
	// find and replace objects with the same keys
	if (!newkeys.length) {
		// delete everything and set the keymap to {}
		logger.warn("Would be wiping "+dbname+" and resetting keymap - saveAll was passed an empty object.");
		// implement this in future if this happens I guess.
		return;
	}
	i = 0; l = newkeys.length; newkeymap = {}; accessTime = new Date().valueOf();
	for (; i < l; i++) {
		if (keymap[db][newkeys[i]] !== undefined) {
			newkeymap[newkeys[i]] = keymap[db][newkeys[i]];
			delete keymap[db][newkeys[i]];
			if (objCache[db][newkeys[i]] !== undefined) {
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
	if (Object.keys(keymap[db]).length) {
		for (key in keymap[db]) {
			if (keymap[db].hasOwnProperty(key)) {
				try {
					//logger.info("Deleting stale "+dbname+" key: "+key+" : "+keymap[db][key]);
					if (objCache[db][key] !== undefined) {
						delete objCache[db][key];
						delete lastFetched[db][key];
					}
					fs.unlinkSync(dbname+keymap[db][key]);
				} catch (err) {
					logger.error("Couldn't delete "+dbname+" object "+key+" : "+keymap[db][key]+": "+err, err);
				}
			}
		}
	}
	keymap[db] = newkeymap;
	saveKeymap(db, dbname);
}

function ensureDBEnv(db, dbname, old) {
	var data;
	keymap[db] = {}; objCache[db] = {}; lastFetched[db] = {};
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
	var db, key, now;
	if (specificDB) {
		if (objCache[specificDB] !== undefined) {
			if (specificKey) {
				if (objCache[specificDB][specificKey] !== undefined) {
					delete objCache[specificDB][specificKey];
					delete lastFetched[specificDB][specificKey];
				}
			} else {
				delete lastFetched[specificDB];
				delete objCache[specificDB];
				lastFetched[specificDB] = {};
				objCache[specificDB] = {};
			}
		}
	} else {
		now = new Date().valueOf();
		for (db in objCache) {
			if (Object.keys(objCache[db]).length) {
				for (key in lastFetched[db]) {
					if ((now-lastFetched[db][key]) >= 900000) { // 15 minutes
						delete objCache[db][key];
						delete lastFetched[db][key];
					}
				}
			}
		}
	}
}

function getFullDB(db, dbname) {
	// egads. please don't do this D:
	var key, accessTime;
	if (Object.keys(keymap[db]).length !== Object.keys(objCache[db]).length) {
		// need to fill the objCache
		accessTime = new Date().valueOf();
		for (key in keymap[db]) {
			if (keymap[db].hasOwnProperty(key)) {
				try {
					if (objCache[db][key] === undefined)
						objCache[db][key] = JSON.parse(fs.readFileSync(dbname+keymap[db][key], null, 3).toString());
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
	var stub, keys = Object.keys(keymap[db]);
	if (!keys.length)
		return {};
	stub = {};
	keys.forEach(function (key) {
		stub[key] = "";
	});
	return stub;
}

function removeOne(db, dbname, key) {
	if (!keymap[db][key]) return;
	try {
		if (objCache[db][key] !== undefined) {
			delete lastFetched[db][key];
			delete objCache[db][key];
		}
		fs.unlinkSync(dbname+keymap[db][key]);
		delete keymap[db][key];
		saveKeymap(db, dbname);
	} catch (err) {
		logger.error("Couldn't remove "+db+" object: "+key+" : "+keymap[db][key]+": "+err, err);
	}
}

function saveOne(db, dbname, key, data) {
	if (!keymap[db][key]) keymap[db][key] = makeKey();
	try {
		if (objCache[db][key] !== undefined) {
			objCache[db][key] = data;
			lastFetched[db][key] = new Date().valueOf();
		}
		fs.writeFileSync(dbname+keymap[db][key], JSON.stringify(data, null, 3));
		saveKeymap(db, dbname);
	} catch (err) {
		logger.error("Couldn't write "+dbname+" data: "+err, err);
	}
}

function getOne(db, dbname, key) {
	if (!keymap[db][key]) return;
	if (objCache[db][key] !== undefined) {
		lastFetched[db][key] = new Date().valueOf();
		return objCache[db][key];
	}
	try {
		objCache[db][key] = JSON.parse(fs.readFileSync(dbname+keymap[db][key]).toString());
		lastFetched[db][key] = new Date().valueOf();
		return objCache[db][key];
	} catch (err) {
		logger.error("Couldn't get "+key+" : "+keymap[db][key]+" data: "+err, err);
	}
}

setInterval(clearCache, 300000); // 5 minutes between cache clears

module.exports = function (db, old) {
	var dbname = "data/db/"+db+"/";
	// make sure the db environment is OK
	if (!ensureDBEnv(db, dbname, old)) {
		logger.error("Failed to ensure DB environment for "+db);
	} else {
		// load keymap
		loadKeymap(db, dbname);
	}
	
	return {
		getOne: function (key) { // return key's data
			return getOne(db, dbname, key);
		},
		saveOne: function (key, data) { // save key : data pair
			saveOne(db, dbname, key, data);
		},
		removeOne: function (key) {
			removeOne(db, dbname, key);
		},
		hasKey: function (key) {
			return keymap[db][key] !== undefined ? true : false;
		},
		getKeys: function () {
			return Object.keys(keymap[db]);
		},
		getKeysObj: function () { // returns a stub object
			return getKeysObj(db);
		},
		getAll: function () {
			return getFullDB(db, dbname);
		},
		saveAll: function (obj) {
			overwriteDB(db, dbname, obj);
		},
		clearCache: function (key) {
			clearCache(db, key);
		}
	};
};
