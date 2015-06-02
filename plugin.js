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
	
	function filterScripts(scripts, disabled) {
		return scripts.filter(function (script) {
			return (script.substr(-3) === ".js" && disabled.indexOf(script.slice(0,-3)) === -1);
		});
	}
	
	return {
		// Load all scripts and bind events
		loadAll: function (sandbox) {
			var i, current, context = vm.createContext(sandbox),
				scripts = filterScripts(fs.readdirSync('plugins'), irc_config.disabled_plugins || []);
			clearCache();
			for (i = 0; i < scripts.length; i += 1) {
				logger.info("Loading plugin " + scripts[i] + "...");
				current = fs.readFileSync('plugins/' + scripts[i]);
				if (current) {
					try {
						vm.runInContext("(function() {" + current + "}())", context, scripts[i]);
					} catch (err) {
						logger.error("Error in plugin " + scripts[i], err);
					}
				}
			}
			current = null;
			scripts = null;
			logger.info("Scripts loaded.");
		},
		loadOne: function (sandbox, plugin) {
			var script, context;
			if (fs.existsSync('plugins/'+plugin+'.js')) {
				script = fs.readFileSync('plugins/'+plugin+'.js');
				clearCache();
				logger.info("Loading plugin "+plugin+"...");
				try {
					context = vm.createContext(sandbox);
					vm.runInContext("(function() {"+script+"}())", context, plugin);
				} catch (err) {
					logger.error("Error in plugin " + plugin + ": " + err, err);
				}
				script = null;
			} else {
				logger.error("Plugin "+plugin+" not found.");
			}
		}
	}
}());
