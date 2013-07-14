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
				context = vm.createContext(sandbox),
				scripts = fs.readdirSync('plugins');
			clearCache();
			for (i = 0; i < scripts.length; i += 1) {
				if (scripts[i].substr(-3) === '.js' && scripts[i].substr(-9) !== '.child.js') {
					logger.info("Loading plugin " + scripts[i] + "...");
					current = fs.readFileSync('plugins/' + scripts[i]);
					if (current) {
						try {
							lib.memProf("loading plugin "+scripts[i]);
							vm.runInContext("(function() {" + current + "}())", context, scripts[i]);
							lib.memProf("loading plugin "+scripts[i]);
						} catch (err) {
							logger.error("Error in plugin " + scripts[i] + ": " + err);
						}
					}
				}
			}
			current = null;
			scripts = null;
			logger.info("Scripts loaded.");
		},
		loadOne: function (sandbox, plugin) {
			console.log("loadOne(sandbox, "+plugin+") called");
			if (fs.existsSync('plugins/'+plugin+'.js')) {
				var context = vm.createContext(sandbox),
					script = fs.readFileSync('plugins/'+plugin+'.js');
				if (script) {
					clearCache();
					logger.info("Loading plugin "+plugin);
					try {
						lib.memProf("loading plugin "+plugin);
						vm.runInContext("(function() {"+script+"}())", context, plugin);
						lib.memProf("loading plugin "+plugin);
					} catch (err) {
						logger.error("Error in plugin " + plugin + ": " + err);
					}
				}
				script = null;
			}
		}
	}
}());
