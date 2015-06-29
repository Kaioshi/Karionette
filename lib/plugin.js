/*
 * PLUGIN: This module loads and unloads plugins
 */
"use strict";
var fs = require("fs"),
	vm = require("vm"),
	vmContext;

function clearCache() {
	var key;
	for (key in require.cache) {
		if (require.cache.hasOwnProperty(key))
			delete require.cache[key];
	}
}

function readScripts(path, scripts) {
	return scripts.map(function (script) {
		return { plugin: script, source: fs.readFileSync(path+script).toString() };
	});
}

module.exports = function (logger, config) {
	function filterScripts(scripts) {
		scripts = scripts.filter(function (script) { return script.slice(-3) === ".js"; });
		if (config.enabled_plugins !== undefined && Array.isArray(config.enabled_plugins))
			return scripts.filter(function (script) { return config.enabled_plugins.indexOf(script.slice(0, -3)) > -1; });
		if (config.disabled_plugins !== undefined && Array.isArray(config.disabled_plugins))
			return scripts.filter(function (script) { return config.disabled_plugins.indexOf(script.slice(0, -3)) === -1; });
		return scripts;
	}

	return {
		// Load all scripts and bind events
		setupSandbox: function (sandbox) {
			vmContext = vm.createContext(sandbox);
		},
		loadAll: function (type, path) {
			var i, scripts;
			if (type === "optional")
				scripts = readScripts(path, filterScripts(fs.readdirSync(path)));
			else
				scripts = readScripts(path, fs.readdirSync(path));
			clearCache();
			logger.info("Loading "+type+" plugins: ", {newline: false});
			for (i = 0; i < scripts.length; i++) {
				process.stdout.write(scripts[i].plugin.slice(0,-3)+" ");
				try {
					vm.runInContext("(function () {"+scripts[i].source+"}())", vmContext, scripts[i].name);
				} catch (err) {
					logger.error("Error in "+type+" plugin "+scripts[i].name+": "+err, err);
				}
			}
			process.stdout.write("\n");
			scripts = null;
		},
		loadOne: function (plugin) {
			var script;
			// try core first
			[ "plugins/core/"+plugin+".js", "plugins/"+plugin+".js" ].forEach(function (p) {
				if (fs.existsSync(p))
					script = fs.readFileSync(p).toString();
			});
			if (script === undefined) {
				logger.warn("Couldn't find plugin '"+plugin+"'.");
				return;
			}
			clearCache();
			logger.info("Loading"+plugin+" plugin ...");
			try {
				vm.runInContext("(function() {"+script+"}())", vmContext, plugin);
			} catch (err) {
				logger.error("Error in plugin " + plugin + ": "+err, err);
			}
			script = null;
		}
	};
};
