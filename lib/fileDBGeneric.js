/**
 *  @file fileDBGeneric.js
 *  @exports FileDB()
 *  @brief Generic FileDB to extend from
 */
var fs = require('fs');

var FileDB = (function () {
	"use strict";
	var path = require('path'),
		DBCache = {};

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
			mode = parseInt("0777", 8) & (~process.umask());
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

	return function ConstructFileDB(options) {
		if (DBCache[options.filename]) {
			return DBCache[options.filename];
		}

		this._filename = options.filename;
		this._defaultData = options.data;
		this.pathExists = fs.existsSync(this._filename);

		var Q = (options.queue === undefined || options.queue ? true : false),
			noCreate = options.noCreate || false,
			init = pathCheck(this._filename, this.pathExists, noCreate, this._defaultData),
			initialData;

		// Something went wrong with the path
		if (!init) {
			return false;
		}
		// Subscribe to the Write Queue
		if (Q) {
			initialData = this._readFile();
			FileDB.queue.subscribe(this._filename, initialData);
		}
		DBCache[options.filename] = this;
	};
}());

FileDB.queue = {
	on: false,
	intervalID: null,
	cache: {},
	queuees: [],
	fullStart: function (time) {
		time = time || 1000 * 900;
		this.on = true;
		this.intervalID = setInterval(this.saveCache.bind(this), time);
	},
	fullStop: function () {
		clearInterval(this.intervalID);
		this.saveCache();
	},
	saveCache: function () {
		var eachKey;

		if (this.queuees.length > 0) {

			eachKey = function eachCacheKey(element) {
				var data;
				try {
					data = this.stringify(element, this.cache[element]);
					fs.writeFileSync(element, data);
					logger.info("Data saved to " + element);
				} catch (err) {
					logger.error("There was a problem writing to : " + element, err);
				}
				data = null;
				fileExt = null;
				// uncomment for cache deletion
				// delete this.cache[element];
			};

			logger.info("Queue Write...");
			this.queuees.forEach(eachKey.bind(this));
			this.queuees = [];
		}
	},
	saveOneCache: function (filename) {
		var data;
		if (this.cache[filename]) {
			data = this.stringify(filename, this.cache[filename]);
			fs.writeFile(filename, data, function (err) {
				if (err) {
					logger.error("There was a problem writing to: " + filename + " " + err, err);
				} else {
					logger.info("Data saved to " + filename);
				}
			});
			data = null;
		} else {
			logger.warn("There's no cache to write for " + filename);
		}
	},
	stringify: function (filename, o) {
		var data,
			fileExt = (filename.substr(filename.lastIndexOf(".") + 1))
					.toLowerCase();
		if (fileExt === "json") {
			data = JSON.stringify(o, null, 3);
		} else if (fileExt === "txt") {
			data = o.join("\n");
		} else {
			data = o.toString();
		}
		fileExt = null;
		return data;
	},
	subscribe: function (path, data) {
		if (this.queuees.length === 0 && !this.on) {
			this.fullStart();
			logger.info("Write Queue initiating...");
		}
		//this.queuees.push(path);
		this.cache[path] = data;
	},
	unsubscribe: function (path, noStop) {

		function filterQueuees(element) {
			var noMatch = (element !== path);
			if (!noMatch) {
				delete this.cache[element];
			}
			return noMatch;
		}

		this.queuees = this.queuees.filter(filterQueuees.bind(this));
		if (this.queuees.length < 1 && !noStop) {
			this.fullStop();
			logger.info("Write Queue halting...");
		}
	},
	isSubscribed: function (filename) {
		return (this.cache[filename] ? true : false);
	},
	push: function (path, data) {
		var written;
		this.cache[path] = data;
		written = this.queuees.some(function (element) {
			return (element === path);
		});
		if (!written) {
			this.queuees.push(path);
		}
		written = null;
		path = null;
		data = null;
		//console.log(this.queuees);
	}
};

/**
 *  @brief private readFile
 *  
 *  @return STRING|OBJECT File string or cache object
 *  
 *  @details Reads from the queue cache when available, otherwise fetches the file
 */
FileDB.prototype._readFile = function readFile() {
	var data;
	try {
		if (FileDB.queue.isSubscribed(this._filename)) {
			data = FileDB.queue.cache[this._filename];
		} else {
			data = this._parse(fs.readFileSync(this._filename, 'utf8'));
		}
		if (data === undefined) {
			throw new Error(this._filename + "'s data was erroneous...");
		}
	} catch (e) {
		logger.error("Couldn't read cache or file for " + this._filename + ". Is it subscribed with no cache data?", e);
	}
	return data;
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
	if (FileDB.queue.isSubscribed(this._filename)) {
		FileDB.queue.push(this._filename, data);
	} else {
		try {
			fs.writeFileSync(this._filename, this._stringify(data));
			logger.info("Data saved to " + this._filename);
		} catch (err) {
			logger.error("There was a problem writing to: " + this._filename + " " + err, err);
		}
	}
	data = null;
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
	return ((size === 2 && this.type ===  "Json") ? 0 : size);
};

/**
 *  @brief writeCache
 *  
 *  @return void
 *  
 *  @details Writes whatever is in the queue cache to disk
 */
FileDB.prototype.writeCache = function writeCache() {
	FileDB.queue.saveOneCache(this._filename);
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
	FileDB.queue.unsubscribe(this._filename, noStop);
};

/**
 *  @brief removeAll
 *  
 *  @return void
 *  
 *  @details Writes over the data object with the `defaultData` of the DB Object
 */
FileDB.prototype.removeAll = function removeAll() {
	this._writeFile(this._parse(this._defaultData));
};

module.exports = FileDB;
