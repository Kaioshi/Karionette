"use strict";

module.exports = function (globals) {
	const vm = require("vm"),
		fs = require("fs"),
		plugin = {
			sandbox: {
				console: console,
				require: require,
				fs: fs,
				setInterval: setInterval,
				setTimeout: setTimeout,
				clearInterval: clearInterval,
				process: process,
				globals: globals
			}
		};
	let vmContext,
		logInfo = function (line) {
			if (plugin.sandbox.logger) {
				logInfo = plugin.sandbox.logger.plugin;
				logInfo(line);
			} else {
				process.stdout.write(new Date().toLocaleTimeString()+" [Plugin] "+line+"\n");
			}
		},
		logError = function (line, error) {
			if (plugin.sandbox.logger) {
				logError = plugin.sandbox.logger.error;
				logError(line, error);
			} else {
				console.error(new Date().toLocaleTimeString()+" [Error] "+line, error);
			}
		};

	function declareGlobal(pluginName, handle, obj) {
		plugin.sandbox[handle] = obj;
	}

	function readPlugin(fn) {
		if (!fs.existsSync(fn)) {
			logError("Failed to load non-existant plugin: "+fn);
			return false;
		}
		try {
			return fs.readFileSync(fn).toString();
		} catch (error) {
			logError("Couldn't read "+fn+": "+error.message, error);
			return false;
		}
	}

	function loadPlugin(fn) {
		let plug = readPlugin(fn);
		if (plug === false || !plug.length)
			return;
		try {
			logInfo("Loading "+fn+" ...");
			let src = "(function () {"+plug+"})()";
			vm.runInContext(src, vmContext, {filename: fn});
			src = null; plug = null;
			return true;
		} catch (error) {
			logError("Error in "+fn+": "+error.message, error);
			return false;
		}
	}

	function loadCorePlugins(pluginOrder) {
		pluginOrder.forEach(plug => loadPlugin("core/"+plug+".js"));
	}

	function pluginIsAllowed(plug) {
		if (plug.slice(-3) !== ".js")
			return false;
		if (plugin.sandbox.config.enabled_plugins && plugin.sandbox.config.enabled_plugins.length)
			return !plugin.sandbox.config.enabled_plugins.some(p => p.toLowerCase() !== plug.slice(0, -3).toLowerCase());
		if (plugin.sandbox.config.disabled_plugins && plugin.sandbox.config.disabled_plugins.length)
			return !plugin.sandbox.config.disabled_plugins.some(p => p.toLowerCase() === plug.slice(0, -3).toLowerCase());
		return true;
	}

	function loadOptionalPlugins() {
		fs.readdirSync("./plugins")
			.filter(pluginIsAllowed)
			.forEach(plug => loadPlugin("plugins/"+plug));
	}

	plugin.sandbox.plugin = {
		load: loadPlugin,
		declareGlobal: declareGlobal
	};

	vmContext = vm.createContext(plugin.sandbox);

	plugin.load = loadPlugin;
	plugin.loadCorePlugins = loadCorePlugins;
	plugin.loadOptionalPlugins = loadOptionalPlugins;

	return plugin;
};
