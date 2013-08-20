/**
 *  @file fileDB.js
 *  @exports Json(), List()
 *  @brief For all operations that deal with file I/O. There is currently
 *         List and Json DBs. FileDB itself is not exported.
 */
var path = require('path'),
	fs = require('fs'),
	util = require('util');

/**
 *  @brief mkdirPath
 *  
 *  @param dirp      {STRING} Directory path; can contain a filename
 *  @param mode      {INT} File permissions
 *  @param fn        {FUNC} Callback function to run when completed; takes (err, filename)
 *  @param filename  {STRING} Used in the function's recursion
 *  @return {BOOL} true
 *  
 *  @details Checks the path and creates it id it doesn't exist.
 */
function mkdirPath(dirp, mode, fn, filename) {
	var dirname, cb,
		match = (/\./i).exec(dirp);
	if (typeof mode === 'function' || mode === undefined) {
		fn = mode;
		mode = 0777 & (~process.umask());
	}
	cb = fn || function () {};

	if (match) {
		dirname = path.dirname(dirp);
		filename = path.basename(dirp);
	} else {
		dirname = dirp;
		filename = null;
	}
	dirname = path.resolve(dirname);
	if (fs.existsSync(dirname)) {
		cb(null, filename);
		return true;
	}

	fs.mkdir(dirname, mode, function (er) {
		if (!er) {
			return cb(null, filename);
		}
		switch (er.code) {
		case 'ENOENT':
			mkdirPath(path.dirname(dirname), mode, function (er, filename) {
				if (er) {
					cb(er, filename);
				} else { mkdirPath(dirname, mode, cb, filename); }
			}, filename);
			break;

		// In the case of any other error, just see if there's a dir
		// there already.  If so, then hooray!  If not, then something
		// is broken.
		default:
			fs.stat(dirname, function (er2, stat) {
				// let the original error be the failure reason.
				if (er2 || !stat.isDirectory()) {
					cb(er, filename);
				} else { cb(null, filename); }
			});
			break;
		}
	});
}

/**
 *  @brief pathCheck
 *  
 *  @param filename  {STRING} File to check
 *  @param exists    {BOOL} Whether file exists
 *  @param noCreate  {BOOL} Whether to create a missing file
 *  @param data      {STRING} Default data for created file
 *  @return {BOOL}
 *  
 *  @details Checks if the file (Path) exists- Returns true if exists or is created.
 *           False if an error is encountered, or was not created due to the supplied
 *           noCreate argument.
 */
function pathCheck(filename, exists, noCreate, data) {
	noCreate = noCreate || false;
	data = data || "";
	if (!exists) {
		if (!noCreate) {
			mkdirPath(filename, function (err) {
				if (!err) {
					try {
						fs.writeFileSync(filename, data, "utf8");
						logger.info("Created file: " + filename);
					} catch (caughtErr) {
						logger.error("Couldn't create " + filename + ": " + caughtErr, caughtErr);
					}
				} else {
					logger.error(err, err);
					return false;
				}
			});
		} else {
			logger.warn("noCreate flag set to TRUE, so did not create: " + filename);
			return false;
		}
	}
	return true;
}

function FileDB(options) {
	this._filename = options.filename;
	this._defaultData = options.data;
	this.pathExists = fs.existsSync(this._filename);

	var Q = options.queue || false,
		noCreate = options.noCreate || false,
		init = pathCheck(this._filename, this.pathExists, noCreate, this._defaultData);

	// Something went wrong with the path
	if (!init) {
		return false;
	}
	// Subscribe to the Write Queue
	if (Q) {
		this.queue.subscribe(this._filename);
	}
}

FileDB.prototype.queue = {
	on: false,
	intervalID: null,
	cache: {},
	queuees: [],
	fullStart: function (time) {
		time = time || 1000 * 300;
		this.on = true;
		this.intervalID = setInterval(this.saveCache.bind(this), time);
	},
	fullStop: function () {
		clearInterval(this.intervalID);
		this.saveCache();
	},
	saveCache: function () {
		function eachKey(element) {
			fs.writeFile(element, this.cache[element], function (err) {
				if (err) {
					logger.error("There was a problem writing to: " + element + " " + err);
				} else {
					logger.info("Data saved to " + element);
				}
			});
			delete this.cache[element];
		}
		
		var cKeys = Object.keys(this.cache),
			that = this;
		if (cKeys.length > 0) {
			logger.info("Queue Write...");
			cKeys.forEach(eachKey.bind(this));
		}
	},
	saveOneCache: function (filename) {
		fs.writeFile(filename, this.cache[filename], function (err) {
			if (err) {
				logger.error("There was a problem writing to: " + filename + " " + err, err);
			} else {
				logger.info("Data saved to " + filename);
			}
		});
	},
	subscribe: function (path) {
		if (this.queuees.length === 0 && !this.on) {
			this.fullStart();
			logger.info("Write Queue initiating...");
		}
		this.queuees.push(path);
	},
	unsubscribe: function (path, noStop) {
		this.queuees = this.queuees.filter(function (element) {
			return (element !== path);
		});
		if (this.queuees.length < 1 && !noStop) {
			this.fullStop();
			logger.info("Write Queue halting...");
		}
	},
	isSubscribed: function (filename) {
		return this.queuees.some(function (element) {
			return (element === filename);
		});
	},
	push: function (path, data) {
		this.cache[path] = data;
		//console.log(this.queuees);
	}
};

/**
 *  @brief private readFile
 *  
 *  @return STRING File data
 *  
 *  @details Reads from the queue cache when available, otherwise fetches the file
 */
FileDB.prototype._readFile = function readFile() {
	return this.queue.cache[this._filename] || fs.readFileSync(this._filename, 'utf8');
};

/**
 *  @brief private writeFile
 *  
 *  @param data  STRING Data to write
 *  @return void
 *  
 *  @details Writes to a file or dumps data into the Write Queue
 */
FileDB.prototype._writeFile = function writeFile(data) {
	function onWrite(err) {
		if (err) {
			logger.error("There was a problem writing to: " + this._filename + " " + err);
		} else {
			logger.info("Data saved to " + this._filename);
		}
	}
	
	if (this.queue.isSubscribed(this._filename)) {
		this.queue.push(this._filename, data);
	} else {
		fs.writeFile(this._filename, data, onWrite.bind(this));
	}
};

/**
 *  @brief fileSize
 *  
 *  @return {INT} Size of the file
 *  
 *  @details Gets the character size of the file
 */
FileDB.prototype.size = function fileSize() {
	var size = fs.lstatSync(this._filename).size;
	return ((size === 2 && this instanceof Json) ? 0 : size);
};

/**
 *  @brief writeCache
 *  
 *  @return void
 *  
 *  @details Writes whatever is in the queue cache to disk
 */
FileDB.prototype.writeCache = function writeCache() {
	this.queue.saveOneCache(this._filename);
};

/**
 *  @brief unload
 *  
 *  @param noStop  {BOOL} Whether to stop the queue if there are no more queuees
 *                        Only set this if you expect to fille queuees immediately after unload
 *  @return void
 *  
 *  @details Unsubscribes from the queue cache to clean up the object's presence
 */
FileDB.prototype.unload = function unload(noStop) {
	this.queue.unsubscribe(this._filename, noStop);
};

/**
 *  @brief removeAll
 *  
 *  @return void
 *  
 *  @details Writes over the data object with the `defaultData` of the DB Object
 */
FileDB.prototype.removeAll = function removeAll() {
	this._writeFile(this._filename, this._defaultData);
};

/**
 *  @brief Json extends FileDB
 *  
 *  @param options  {OBJECT}
 *  {
 *    filename {STRING}  Path to the DB file. REQUIRED.
 *    data {STRING}      Default data to write
 *    queue {BOOL}       Whether to use cache
 *    noCreate {BOOL}    Whether to create if not found
 *  }
 *  @return {JSONDB} Instance of Json DB object
 *  
 *  @details Create a new DB object to access and manipulate JSON files
 */
var Json = function Json(options) {
	options.data = options.data || "{}";
	options.filename = "data/" + options.filename + ".json";
	FileDB.call(this, options);
};
Json.prototype = Object.create(FileDB.prototype);

/**
 *  @brief getAllJson
 *  
 *  @return {OBJECT} Parsed JSON
 *  
 *  @details Gets the entire JSON data object
 */
Json.prototype.getAll = function getAllJson() {
	return JSON.parse(this._readFile());
};

/**
 *  @brief getOneJson
 *  
 *  @param key  {STRING} The specific key to access
 *  @return {OBJECT} Parsed JSON of specific key
 *  
 *  @details Gets one key from the JSON data object
 */
Json.prototype.getOne = function getOneJson(key) {
	return (this.getAll())[key];
};

/**
 *  @brief getKeysJson
 *  
 *  @return {ARRAY} Object's keys
 *  
 *  @details Gets a list of keys from the JSON data object
 */
Json.prototype.getKeys = function getKeysJson() {
	return Object.keys(this.getAll());
};

/**
 *  @brief saveAllJson
 *  
 *  @param obj  {OBJECT} Object to stringify to JSON data
 *  @return void
 *  
 *  @details Overwrites the JSON data object with the object supplied
 */
Json.prototype.saveAll = function saveAllJson(obj) {
	this._writeFile(JSON.stringify(obj));
};

/**
 *  @brief saveOneJson
 *  
 *  @param key   {STRING} Key to (over)write
 *  @param data  {STRING} data to store
 *  @return void
 *  
 *  @details Store data in a certain key of the JSON data obect
 */
Json.prototype.saveOne = function saveOneJson(key, data) {
	var all = this.getAll();
	all[key] = data;
	this.saveAll(all);
	all = null;
};

/**
 *  @brief removeOneJson
 *  
 *  @param key  {STRING} Key to remove
 *  @return void
 *  
 *  @details Deletes the specified key from the JSON data object
 */
Json.prototype.removeOne = function removeOneJson(key) {
	var all = this.getAll();
	delete all[key];
	this.saveAll(all);
	all = null;
};

/**
 *  @brief List extends FileDB
 *  
 *  @param options  {OBJECT}
 *  {
 *    filename {STRING}  Path to the DB file. REQUIRED.
 *    data {STRING}      Default data to write
 *    queue {BOOL}       Whether to use cache
 *    noCreate {BOOL}    Whether to create if not found
 *  }
 *  @return {LISTDB} Instance of List DB object
 *  
 *  @details Create a new DB object to access and manipulate List (.txt) files
 */
var List = function List(options) {
	options.data = options.data || "";
	options.filename = "data/" + options.filename + ".txt";
	FileDB.call(this, options);
};
List.prototype = Object.create(FileDB.prototype);

/**
 *  @brief parseArrayList
 *  
 *  @param all  {STRING} List data
 *  @return {ARRAY} Parsed List data
 *  
 *  @details Parse List data argument into an array
 */
List.prototype._parseArray = function parseArrayList(all) {
	if (all && all.length > 0) {
		all = all.split("\n");
	} else {
		all = [];
	}
	return all;
};

/**
 *  @brief getAllList
 *  
 *  @return {ARRAY} Parsed List array
 *  
 *  @details Gets the entire List data array
 */
List.prototype.getAll = function getAllList() {
	return this._parseArray(this._readFile(this._filename));
};

/**
 *  @brief getOneList
 *  
 *  @param data        {STRING|INT} List item you want
 *  @param ignoreCase  {BOOL} Whether to ignore case
 *  @return {STRING|BOOL} The data in question, or false if it doesn't exist
 *  
 *  @details Ensures data argument is in the List, or gets the data index supplied
 */
List.prototype.getOne = function getOneList(data, ignoreCase) {
	var has, all = this.getAll();
	if (typeof data === "string") {
		has = all.some(function (element) {
			if (ignoreCase) {
				return (element.toUpperCase() === data.toUpperCase());
			}
			return (element === data);
		});
		return (has ? data : false);
	}
	data = all[data];
	return data || false;
};

/**
 *  @brief saveAllList
 *  
 *  @param arr  {ARRAY} Data to (over)write to file
 *  @return void
 *  
 *  @details Overwrites the List data array with the array supplied
 */
List.prototype.saveAll = function saveAllList(arr) {
	this._writeFile(this._filename, arr.join('\n'));
};

/**
 *  @brief saveOneList
 *  
 *  @param data  {STRING} Data to save
 *  @return void
 *  
 *  @details Pushes a data onto the end of the List data array
 */
List.prototype.saveOne = function saveOneList(data) {
	var all = this.getAll();
	all.push(data);
	this.saveAll(all);
	all = null;
};

/**
 *  @brief removeOneList
 *  
 *  @param data        {STRING} Data to be removed
 *  @param ignoreCase  {BOOL} Whether to ignore case
 *  @return void
 *  
 *  @details Removes the specified data from the List data array
 */
List.prototype.removeOne = function removeOneList(data, ignoreCase) {
	var all = this.getAll();
	all = all.filter(function (element) {
		if (ignoreCase) {
			return (element.toLowerCase() !== data.toLowerCase());
		}
		return (element !== data);
	});
	this.saveAll(all);
	all = null;
};

exports.Json = Json;
exports.List = List;

// Save Cache on Exit
process.on("closing", function () {
	FileDB.prototype.queue.saveCache();
});
