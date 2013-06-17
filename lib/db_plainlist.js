var fs = require('fs');

module.exports = function (dbName, noCreate) {
	var values,
		filename = 'data/' + dbName + '.txt',
		fileExists = fs.existsSync(filename);

	if (!fileExists) {
		if (!noCreate) {
			fs.writeFile(filename, "", function (err) {
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

	// Get the file contents in array format
	function getContents() {
		try {
			values = fs.readFileSync(filename, 'ascii');
			if (values && values.length > 0) {
				values = values.split('\n');
			} else {
				values = [];
			}
		} catch (err) {
			values = [];
			console.log("Error retrieving plainlistDB:", err);
		}
		return values;
	}
	// Write to file by passing an array
	function writeFile(values) {
		try {
			fs.writeFileSync(filename, values.join('\n'), 'ascii');
		} catch (err) {
			console.log("There was an error saving the plainlist DB file: ", err);
		}
	}

	return {
		exists: fileExists,
		getCache: function () {
			return values;
		},
		getEntire: function () {
			return getContents();
		},
		hasValue: function (value, ignoreCase) {
			ignoreCase = ignoreCase || false;
			values = getContents();
			var i;
			for (i = 0; i < values.length; i += 1) {
				if (ignoreCase) {
					if (values[i].toUpperCase() === value.toUpperCase()) {
						return true;
					}
				} else {
					if (values[i] === value) {
						return true;
					}
				}
			}

			return false;
		},
		remove: function (value, ignoreCase) {
			ignoreCase = ignoreCase || false;
			values = getContents();
			if (ignoreCase) {
				values = values.filter(function (element) {
					return (element.toUpperCase() !== value.toUpperCase());
				});
			} else {
				values = values.filter(function (element) {
					return (element !== value);
				});
			}
			writeFile(values);
		},
		store: function (value) {
			values = getContents();
			values.push(value);
			writeFile(values);
		},
		save: function (arr) {
			writeFile(arr);
		}
	}
}