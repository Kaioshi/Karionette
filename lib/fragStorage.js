// splits objects into one file per key so it can read the part you want
// need to maintain a keymap - no getAll ?
// data/db/dbname/<random letters/numbers>.json

var fs = require('fs'),
	objCache = {}, keymap = {};

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
	var i = 0; l = keys.length;
	for (; i < l; i++)
		keymap[db][keys[i]] = makeKey();
}

function loadKeymap(db) {
	var dbname = "data/db/"+db+"/";
	if (fs.existsSync(dbname+"keymap")) {
		try {
			//logger.info("Loading "+dbname+" keymap ...");
			keymap[db] = JSON.parse(fs.readFileSync(dbname+"keymap").toString());
		} catch (err) {
			logger.error("Couldn't load "+dbname+" keymap: "+err, err);
		}
	} else {
		createKeymap(db);
	}
}

function saveKeymap(db) {
	var dbname = "data/db/"+db+"/";
	try {
		//logger.info("Saving "+dbname+" keymap ...");
		fs.writeFileSync(dbname+"keymap", JSON.stringify(keymap[db], null, 3));
	} catch (err) {
		logger.error("Couldn't save "+dbname+" keymap: "+err, err);
	}
}

function createKeymap(db, obj) {
	var keys, data = "{}",
		dbname = "data/db/"+db+"/";
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

function overwriteDB(db, obj) {
	var i, l, newkeymap, newkeys = Object.keys(obj),
		dbname = "data/db/"+db+"/";
	// find and replace objects with the same keys
	if (!newkeys.length) {
		// delete everything and set the keymap to {}
		logger.warn("Would be wiping "+dbname+" and resetting keymap - saveAll was passed an empty object.");
		// implement this in future if this happens I guess.
		return;
	}
	i = 0; l = newkeys.length; newkeymap = {};
	for (; i < l; i++) {
		if (keymap[db][newkeys[i]] !== undefined) {
			newkeymap[newkeys[i]] = keymap[db][newkeys[i]];
			delete keymap[db][newkeys[i]];
		} else {
			newkeymap[newkeys[i]] = makeKey();
		}
		// write~
		try {
			//logger.info("Saving "+dbname+" object "+newkeys[i]+" : "+newkeymap[newkeys[i]]);
			fs.writeFileSync(dbname+newkeymap[newkeys[i]], JSON.stringify(obj[newkeys[i]], null, 3));
		} catch (err) {
			logger.error("Couldn't save "+dbname+" object "+newkeys[i]+" : "+newkeymap[newkeys[i]]+": "+err, err);
		}
	}
	// whatever is left in the old keymap needs deleting
	if (Object.keys(keymap[db]).length) {
		for (key in keymap[db]) {
			try {
				//logger.info("Deleting stale "+dbname+" key: "+key+" : "+keymap[db][key]);
				fs.unlinkSync(dbname+keymap[db][key]);
			} catch (err) {
				logger.error("Couldn't delete "+dbname+" object "+key+" : "+keymap[db][key]+": "+err, err);
			}
		}
	}
	keymap[db] = newkeymap;
	saveKeymap(db);
}

function ensureDBEnv(db, old) {
	var data, dbname = "data/db/"+db+"/";
	keymap[db] = {}; objCache[db] = {};
	if (!fs.existsSync("data/db")) {
		try {
			fs.mkdirSync("data/db");
			//logger.info("Created primary database directory");
		} catch (err) {
			logger.error("Couldn't create primary database directory: "+err, err);
		}
	}
	if (!fs.existsSync(dbname)) {
		try {
			fs.mkdirSync(dbname);
			//logger.info("Created "+dbname+" directory");
			// construct from the old db if it exists
			if (old) {
				if (fs.existsSync(old)) {
					logger.info("Converting "+old+" to fragmented db ...");
					data = JSON.parse(fs.readFileSync(old).toString());
					if (Object.keys(data).length)
						overwriteDB(db, data);
				}
			}
		} catch (err) {
			logger.error("Couldn't create "+dbname+" directory: "+err, err);
		}
	}
}

function clearCache(specificDB) {
	var db;
	if (specificDB) {
		if (objCache[specificDB] !== undefined) {
			//logger.debug("Clearing "+specificDB+" object cache");
			delete objCache[specificDB];
			objCache[specificDB] = {};
		}
	} else {
		for (db in objCache) {
			if (Object.keys(objCache[db]).length) {
				//logger.debug("Clearing object cache");
				delete objCache[db];
				objCache[db] = {};
			}
		}
	}
}

function getFullDB(db) {
	// egads. please don't do this D:
	var key, dbname;
	if (Object.keys(keymap[db]).length === Object.keys(objCache[db]).length)
		return objCache[db]; // yay whole thing in memory already~
	dbname = "data/db/"+db+"/";
	for (key in keymap[db]) {
		try {
			if (objCache[db][key] === undefined)
				objCache[db][key] = JSON.parse(fs.readFileSync(dbname+keymap[db][key], null, 3).toString());
		} catch (err) { // THE WHOROR
			logger.error("Failed to read "+dbname+" object "+key+" : "+keymap[db][key]+": "+err, err);
		}
	}
	return objCache[db]; // IT HURTS US
}

setInterval(clearCache, 900000); // 15 min should be enough.

module.exports = function (db, old) {
	var dbname = "data/db/"+db+"/";
	// make sure the db environment is OK
	ensureDBEnv(db, old);
	// load keymap
	loadKeymap(db);
	
	return {
		getOne: function (key) { // return key's data
			if (!keymap[db][key]) return;
			if (objCache[db][key] !== undefined)
				return objCache[db][key];
			try {
				objCache[db][key] = JSON.parse(fs.readFileSync(dbname+keymap[db][key]).toString());
				return objCache[db][key];
			} catch (err) {
				logger.error("Couldn't get "+key+" : "+keymap[db][key]+" data: "+err, err);
			}
		},
		saveOne: function (key, data) { // save key : data pair
			if (!keymap[db][key]) keymap[db][key] = makeKey();
			try {
				if (objCache[db][key] !== undefined) {
					//logger.debug("Updated "+db+" cached object: "+key);
					objCache[db][key] = data;
				}
				fs.writeFileSync(dbname+keymap[db][key], JSON.stringify(data, null, 3));
				//logger.info("Saved "+db+" object "+key);
				saveKeymap(db);
			} catch (err) {
				logger.error("Couldn't write "+dbname+" data: "+err, err);
			}
		},
		removeOne: function (key) {
			if (!keymap[db][key]) return;
			try {
				if (objCache[db][key] !== undefined) {
					//logger.debug("Removed "+db+" cached object: "+key);
					delete objCache[db][key];
				}
				fs.unlinkSync(dbname+keymap[db][key]);
				delete keymap[db][key];
				saveKeymap(db);
			} catch (err) {
				logger.error("Couldn't remove "+db+" object: "+key+" : "+keymap[db][key]+": "+err, err);
			}
		},
		hasKey: function (key) {
			return keymap[db][key] !== undefined ? true : false;
		},
		getKeys: function () {
			return Object.keys(keymap[db]);
		},
		getKeysObj: function () { // returns a stub object
			var stub, keys = Object.keys(keymap[db]);
			if (!keys.length) return {};
			stub = {};
			keys.forEach(function (key) {
				stub[key] = "";
			});
			return stub;
		},
		getAll: function () {
			return getFullDB(db);
		},
		saveAll: function (obj) {
			overwriteDB(db, obj);
		},
		clearCache: function () {
			clearCache(db);
		}
	}
};
