/*
 * PLUGIN: This module loads and unloads plugins	   
 */
var fs = require('fs'),
	vm = require('vm');

module.exports = (function () {
	function clearCache() {
		var key;
		for (key in require.cache) {
			delete require.cache[key];
		}
	}

	return {
		// Load all scripts and bind events
		loadAll: function (sandbox) {
			var i, current,
				scripts = fs.readdirSync('plugins');
			clearCache();
			for (i = 0; i < scripts.length; i += 1) {
				if (scripts[i].substr(-3) === '.js' && scripts[i].substr(-9) !== '.child.js') {
					log2("info", "Loading plugin " + scripts[i] + "...");
					current = fs.readFileSync('plugins/' + scripts[i]);
					if (current) {
						try {
							vm.runInNewContext(current, sandbox, scripts[i]);
						} catch (err) {
							log2("error", "Error in plugin " + scripts[i] + ": " + err);
						}
					}
				}
			}
			current = null;
			scripts = null;
			log2("info", "Scripts loaded.");
		}
	}
}());
