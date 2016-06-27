"use strict";

module.exports = function (globals) {
	let vm = require("vm"),
		fs = require("fs"),
		vmContext,
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

	function logError(line, error) {
		if (plugin.sandbox.logger)
			plugin.sandbox.logger.error(line, error);
		else
			console.error(new Date().toLocaleTimeString()+" [Error] "+line, error);
	}

	function logInfo(line) {
		if (plugin.sandbox.logger)
			plugin.sandbox.logger.plugin(line);
		else
			console.log(new Date().toLocaleTimeString()+" [Plugin] "+line);
	}

	function declareGlobal(pluginName, handle, obj) {
		plugin.sandbox[handle] = obj;
	}

	function readPlugin(fn) {
		if (!fs.existsSync(fn)) {
			logError("Failed to load non-existant plugin: "+fn);
			return false;
		}
		try {
			let p = fs.readFileSync(fn).toString();
			return p;
		} catch (error) {
			logError("Couldn't read "+fn+": "+error.message, error);
			return false;
		}
	}

	function loadPluginFromSource(fn, p) {
		try {
			logInfo("Loading "+fn+" ...");
			let src = "(function () {"+p+"})()";
			vm.runInContext(src, vmContext, {filename: fn});
			src = null;
			return true;
		} catch (error) {
			logError("Error in "+fn+": "+error.message, error);
			return false;
		}
	}

	function loadPlugin(fn) {
		let p = readPlugin(fn);
		if (p === false)
			return;
		return loadPluginFromSource(fn, p);
	}

	function loadCorePlugins(pluginOrder) {
		pluginOrder.forEach(p => loadPlugin("core/"+p+".js"));
	}

	function pluginIsAllowed(p, dp) {
		if (!dp.length)
			return true;
		let lp = p.toLowerCase();
		for (let i = 0; i < dp.length; i++)
			if (dp[i].toLowerCase() === lp)
				return false;
		return true;
	}

	function loadOptionalPlugins() {
		let pluginList = fs.readdirSync("./plugins"),
			dp = plugin.sandbox.config.disabled_plugins || [],
			plugins = [];
		pluginList.forEach(p => {
			if (p.slice(-3) !== ".js")
				return;
			if (pluginIsAllowed(p.slice(0,-3), dp))
				plugins.push(p);
		});
		if (plugins.length)
			plugins.forEach(p => loadPlugin("plugins/"+p));
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
