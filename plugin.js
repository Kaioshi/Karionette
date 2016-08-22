"use strict";

module.exports = function (globals) {
	let vmContext;
	const vm = require("vm"),
		fs = require("fs"),
		importables = { fs, process, require, console, setInterval, setTimeout, clearInterval, Buffer },
		plugin = { sandbox: { globals } };

	function logInfo(line) {
		if (plugin.sandbox.logger)
			plugin.sandbox.logger.plugin(line);
		else
			process.stdout.write(new Date().toLocaleTimeString()+" \u001b[96mPlug\u001b[0m "+line+"\n");
	}

	function logError(line, error) {
		if (plugin.sandbox.logger)
			plugin.sandbox.logger.error(line, error);
		else
			console.error(new Date().toLocaleTimeString()+" Error "+line, error);
	}

	function pluginGlobal(globalName, obj) {
		plugin.sandbox[globalName] = obj;
	}

	function pluginExport(exportName, obj) {
		importables[exportName] = obj;
	}

	function pluginImport(importName) {
		if (importables[importName] === undefined && !loadPlugin("core/"+importName+".js") && !loadPlugin("plugins/"+importName+".js"))
			throw new Error("No such importable: "+importName);
		return importables[importName];
	}

	function pluginImportMany(...importNames) {
		return importNames.map(importName => pluginImport(importName));
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
			vm.runInContext("{"+plug+"}", vmContext, {filename: fn});
			return true;
		} catch (error) {
			logError("Error in "+fn+": "+error.message, error);
			process.exit(1);
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
			return plugin.sandbox.config.enabled_plugins.some(p => p.toLowerCase() === plug.slice(0, -3).toLowerCase());
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
		global: pluginGlobal,
		import: pluginImport,
		importMany: pluginImportMany,
		export: pluginExport
	};

	vmContext = vm.createContext(plugin.sandbox);

	plugin.load = loadPlugin;
	plugin.loadCorePlugins = loadCorePlugins;
	plugin.loadOptionalPlugins = loadOptionalPlugins;

	return plugin;
};
