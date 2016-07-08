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
		},
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
			let plug = fs.readFileSync(fn).toString();
			return plug;
		} catch (error) {
			logError("Couldn't read "+fn+": "+error.message, error);
			return false;
		}
	}

	function loadPluginFromSource(fn, plug) {
		try {
			logInfo("Loading "+fn+" ...");
			let src = "(function () {"+plug+"})()";
			vm.runInContext(src, vmContext, {filename: fn});
			src = null;
			return true;
		} catch (error) {
			logError("Error in "+fn+": "+error.message, error);
			return false;
		}
	}

	function loadPlugin(fn) {
		let plug = readPlugin(fn);
		if (plug === false)
			return;
		return loadPluginFromSource(fn, plug);
	}

	function loadCorePlugins(pluginOrder) {
		pluginOrder.forEach(plug => loadPlugin("core/"+plug+".js"));
	}

	function pluginIsAllowed(plug, disabled_plugins) {
		if (!disabled_plugins.length)
			return true;
		for (let i = 0; i < disabled_plugins.length; i++)
			if (disabled_plugins[i].toLowerCase() === plug)
				return false;
		return true;
	}

	function loadOptionalPlugins() {
		const pluginList = fs.readdirSync("./plugins"),
			disabled_plugins = plugin.sandbox.config.disabled_plugins || [];
		for (let i = 0; i < pluginList.length; i++) {
			const plug = pluginList[i];
			if (plug.slice(-3) !== ".js")
				continue;
			if (pluginIsAllowed(plug.slice(0,-3).toLowerCase(), disabled_plugins))
				loadPlugin("plugins/"+plug);
		}
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
