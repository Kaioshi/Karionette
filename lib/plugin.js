/*
 * PLUGIN: This module loads and unloads plugins
 */
"use strict";
var fs = require("fs"),
	vm = require("vm"),
	vmContext;

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
			logger.plugin("Loading "+type+" plugins");
			for (i = 0; i < scripts.length; i++) {
				logger.plugin(scripts[i].plugin.slice(0, -3)+" ...");
				try {
					vm.runInContext("(function () {"+scripts[i].source+"}())", vmContext, scripts[i].name);
				} catch (err) {
					logger.error("Error in "+type+" plugin "+scripts[i].name+": "+err, err);
				}
			}
			scripts = null;
		},
		loadOne: function (plugin) {
			var script;
			// try core first
			if (fs.existsSync("plugins/core/"+plugin+".js"))
				script = fs.readFileSync("plugins/core/"+plugin+".js").toString();
			else if (fs.existsSync("plugins/"+plugin+".js"))
				script = fs.readFileSync("plugins/"+plugin+".js").toString();
			else {
				logger.warn("Couldn't find plugin '"+plugin+"'.");
				return;
			}
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
