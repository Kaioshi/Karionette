var fs = require('fs');

module.exports = function (dbName, noCreate, queue) {
	var dataString, cached, intervalID,
		filename = 'data/' + dbName + '.json',
		fileExists = fs.existsSync(filename);

	// Read the file and return the Json parsed contents
	function read(filename) {
		dataString = fs.readFileSync(filename, 'utf8');
		return JSON.parse(dataString);
	}
	// Get the file contents
	function getContents() {
		cached = (queue ? (cached || read(filename)) : read(filename));
		return cached;
	}
	// Save an entire object to the file
	function save(obj) {
		fs.writeFile(filename, JSON.stringify(obj, null, 4), function (err) {
			if (err) {
				console.log(err);
			} else {
				logger("JSON saved to " + filename);
			}
		});
	}

	if (!fileExists) {
		if (!noCreate) {
			fs.writeFile(filename, "{ }", function (err) {
				if (err) {
					console.log("[Error] Couldn't create:", filename);
				} else {
					logger("Created file:", filename);
				}
			});
		} else {
			return false;
		}
	}

	if (queue) {
		intervalID = setInterval(function () {
			if (cached) {
				save(cached);
				cached = null;
			}
		}, 1000 * 300);
	}

	return {
		exists: fileExists,
		unload: function () {
			clearInterval(intervalID);
			if (cached) {
				save(cached);
				cached = null;
			}
		},
		getCache: function () {
			return cached;
		},
		getKeyCache: function () {
			return Object.keys(cached);
		},
		getEntire: function () {
			return getContents();
		},
		getOne: function (key) {
			return getContents()[key];
		},
		getKeys: function () {
			return Object.keys(getContents());
		},
		hasKey: function (key) {
			if (getContents()[key]) {
				return true;
			}
			return false;
		},
		remove: function (key) {
			var db = getContents();
			delete db[key];
			cached = db;

			if (!queue) {
				fs.writeFile(filename, JSON.stringify(db, null, 4), function (err) {
					if (err) {
						console.log(err);
					} else {
						logger("JSON saved to " + filename);
					}
				});
			}
		},
		store: function (key, value) {
			var db = getContents();
			db[key] = value;
			cached = db;

			if (!queue) {
				fs.writeFile(filename, JSON.stringify(db, null, 4), function (err) {
					if (err) {
						console.log(err);
					} else {
						logger("JSON saved to " + filename);
					}
				});
			}
		},
		save: save
	};
}