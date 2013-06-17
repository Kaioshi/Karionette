var fs = require('fs');

module.exports = function (dbName, noCreate) {
	var dataString, cached,
		filename = 'data/' + dbName + '.json',
		fileExists = fs.existsSync(filename);;

	// Get the file contents
	function getContents() {
		dataString = fs.readFileSync(filename, 'utf8');
		cached = JSON.parse(dataString);
		return cached;
	}	

	if (!fileExists) {
		if (!noCreate) {
			fs.writeFile(filename, "{ }", function (err) {
				if (err) {
					console.log("[Error] Couldn't create:", filename);
				} else {
					Logger("Created file:", filename);
				}
			});
		} else {
			return false;
		}
	}

	return {
		exists: fileExists,
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

			fs.writeFile(filename, JSON.stringify(db, null, 4), function (err) {
				if (err) {
					console.log(err);
				} else {
					Logger("JSON saved to " + filename);
				}
			});
		},
		store: function (key, value) {
			var db = getContents();
			db[key] = value;

			fs.writeFile(filename, JSON.stringify(db, null, 4), function (err) {
				if (err) {
					console.log(err);
				} else {
					Logger("JSON saved to " + filename);
				}
			});
		},
		save: function (obj) {
			fs.writeFile(filename, JSON.stringify(obj, null, 4), function (err) {
				if (err) {
					console.log(err);
				} else {
					Logger("JSON saved to " + filename);
				}
			});
		}
	}
}