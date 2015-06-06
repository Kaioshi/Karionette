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
	
	// does a dumb check against the sandbox entries on all plugin source to make sure they're at least *mentioned*
	function optimiseSandbox(scripts, sandbox) {
		var i, l, allScripts = "", keys = Object.keys(sandbox);
		for (i = 0, l = scripts.length; i < l; i++) {
			scripts[i] = { plugin: scripts[i], source: fs.readFileSync("plugins/"+scripts[i]).toString() };
			allScripts += scripts[i].source;
		}
		for (i = 0, l = keys.length; i < l; i++) {
			if (allScripts.indexOf(keys[i]) === -1) {
				logger.debug("Removing unused sandbox entry: "+keys[i]);
				delete sandbox[keys[i]];
			}
		}
		allScripts = null;
	}
	
	return {
		// Load all scripts and bind events
		loadAll: function (sandbox) {
			var i, current, context,
				scripts = filterScripts(fs.readdirSync('plugins'), irc_config.disabled_plugins || []);
			clearCache();
			optimiseSandbox(scripts, sandbox);
			context = vm.createContext(sandbox);
			for (i = 0; i < scripts.length; i++) {
				logger.info("Loading plugin " + scripts[i].plugin + "...");
				try {
					vm.runInContext("(function() {" + scripts[i].source + "}())", context, scripts[i].name);
				} catch (err) {
					logger.error("Error in plugin " + scripts[i].name, err);
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
