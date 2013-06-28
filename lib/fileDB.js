var path = require('path'),
	fs = require('fs'),
	util = require('util');

var queue = {
	on: false,
	intervalID: null,
	cache: {},
	queuees: [],
	fullStart: function (time) {
		var that = this;
		time = time || 1000 * 300;
		this.on = true;
		this.intervalID = setInterval(function () {
			that.saveCache();
		}, time);
	},
	fullStop: function () {
		clearInterval(this.intervalID);
		this.saveCache();
	},
	saveCache: function () {
		var cKeys = Object.keys(this.cache),
			that = this;
		if (cKeys.length > 0) {
			logger.info("Queue Write...");
			cKeys.forEach(function (element) {
				fs.writeFile(element, that.cache[element], function (err) {
					if (err) {
						logger.error("There was a problem writing to: " + element + " " + err);
					} else {
						logger.info("Data saved to " + element);
					}
				});
				delete that.cache[element];
			});
		}
	},
	saveOneCache: function (filename) {
		fs.writeFile(filename, this.cache[filename], function (err) {
			if (err) {
				logger.error("There was a problem writing to: " + filename + " " + err);
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

// Save Cache on Exit
process.on("closing", function () {
	queue.saveCache();
});
/*
 * Checks the path and creates it id it doesn't exist.
 * @STRING dirp : directory path. Can contain a filename.
 * @INT mode : file permissions.
 * @FUNC lam : Callback function to run when completed; takes (err, filename).
 */
function mkdirPath(dirp, mode, lam, filename) {
	var dirname, cb,
		match = (/\./i).exec(dirp);
	if (typeof mode === 'function' || mode === undefined) {
		lam = mode;
		mode = 0777 & (~process.umask());
	}
	cb = lam || function () {};

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

/*
 * Handles path/file creation
 */
function pathCheck(filename, exists, noCreate, data) {
	noCreate = noCreate || false;
	data = data || "";
	if (!exists) {
		if (!noCreate) {
			mkdirPath(filename, function (err) {
				if (!err) {
					fs.writeFile(filename, data, function (err) {
						if (err) {
							logger.error("Couldn't create: " + filename);
						} else {
							logger.info("Created file: " + filename);
						}
					});
				} else {
					logger.error(err);
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

/*
 * Writes to a file or dumps data into the Write Queue
 * @STRING filename
 * @STRING data
 */
function writeFile(filename, data) {
	if (queue.isSubscribed(filename)) {
		queue.push(filename, data);
	} else {
		fs.writeFile(filename, data, function (err) {
			if (err) {
				logger.error("There was a problem writing to: " + filename + " " + err);
			} else {
				logger.info("Data saved to " + filename);
			}
		});
	}
}

/*
 * Reads from file or grabs from queue.cache if available
 * @STRING filename
 */
function readFile(filename) {
	return queue.cache[filename] || fs.readFileSync(filename, 'utf8');
}

/*
 * DB.Json Export
 * @OBJECT options
 *	~@STRING options.filename : Path to the DB file. REQUIRED.
 *	~@BOOL options.noCreate : If true, won't automatically create file if it doesn't exist.
 *                            Defaults to false.
 *	~@STRING options.data : Data to fill new file with. Defaults to empty string.
 *	~@BOOL options.queue : Whether to queue the data for writes or not. Defaults to false.
 */
exports.Json = function (options) {
	var Q = options.queue || false,
		noCreate = options.noCreate || false,
		defaultData = options.data || "{}",
		filename = "data/" + options.filename + ".json",
		pathExists = fs.existsSync(filename),
		init = pathCheck(filename, pathExists, noCreate, defaultData);
	// Something went wrong with the path
	if (!init) {
		return false;
	}
	// Subscribe to the Write Queue
	if (Q) {
		queue.subscribe(filename);
	}

	return {
		getAll: function () {
			return JSON.parse(readFile(filename));
		},
		getOne: function (key) {
			return JSON.parse(readFile(filename))[key];
		},
		getKeys: function () {
			return Object.keys(this.getAll());
		},
		saveAll: function (obj) {
			writeFile(filename, JSON.stringify(obj));
		},
		saveOne: function (key, data) {
			var all = this.getAll();
			all[key] = data;
			this.saveAll(all);
		},
		removeAll: function () {
			writeFile(filename, defaultData);
		},
		removeOne: function (key) {
			var all = this.getAll();
			delete all[key];
			this.saveAll(all);
		},
		writeCache: function () {
			queue.saveOneCache(filename);
		},
		fileExists: pathExists,
		unload: function (noStop) {
			queue.unsubscribe(filename, noStop);
		}
	};
};

/*
 * DB.List Export
 * @OBJECT options
 *	~@STRING options.filename : Path to the DB file. REQUIRED.
 *	~@BOOL options.noCreate : If true, won't automatically create file if it doesn't exist.
 *                            Defaults to false.
 *	~@STRING options.data : Data to fill new file with. Defaults to empty string.
 *	~@BOOL options.queue : Whether to queue the data for writes or not. Defaults to false.
 */
exports.List = function (options) {
	var Q = options.queue || false,
		noCreate = options.noCreate || false,
		defaultData = options.data || "",
		filename = "data/" + options.filename + ".txt",
		pathExists = fs.existsSync(filename),
		init = pathCheck(filename, pathExists, noCreate, defaultData);
	// Something went wrong with the path
	if (!init) {
		return false;
	}
	// Subscribe to the Write Queue
	if (Q) {
		queue.subscribe(filename);
	}

	// Parse List input into an array
	function parseArray(all) {
		if (all && all.length > 0) {
			all = all.split('\n');
		} else {
			all = [];
		}
		return all;
	}

	return {
		getAll: function () {
			return parseArray(readFile(filename));
		},
		getOne: function (data, ignoreCase) {
			var has = parseArray(readFile(filename)).some(function (element) {
				var matches;
				if (ignoreCase) {
					matches = (element.toUpperCase() === data.toUpperCase());
				} else {
					matches = (element === data);
				}
				return matches;
			});
			return (has ? data : false);
		},
		saveAll: function (arr) {
			writeFile(filename, arr.join('\n'));
		},
		saveOne: function (data) {
			var all = this.getAll();
			all.push(data);
			this.saveAll(all);
		},
		removeAll: function () {
			writeFile(filename, defaultData);
		},
		removeOne: function (data) {
			var all = this.getAll();
			all = all.filter(function (element) {
				return (element !== data);
			});
			this.saveAll(all);
		},
		writeCache: function () {
			queue.saveOneCache(filename);
		},
		fileExists: pathExists,
		unload: function (noStop) {
			queue.unsubscribe(filename, noStop);
		}
	};
};
