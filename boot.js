"use strict";
const globals = { startTime: Date.now() };

process.on("uncaughtException", function caughtUncaughtException(err) {
	if (plugin && plugin.sandbox && plugin.sandbox.logger)
		plugin.sandbox.logger.error(err);
	else
		console.error(err, err.stack);
});

const plugin = require("./plugin.js")(globals);
plugin.loadCorePlugins([ // the order matters
	"bot", "config", "logger", "lib", "ticker", "web", "db", "words", "ial", "alias", "ignore",
	"logins", "perms", "irc", "admin-events", "words-events", "core-events",
	"logins-events", "ial-events", "perms-events", "alias-events", "config-events"
]);
plugin.loadOptionalPlugins();

if (plugin.sandbox.config.gc)
	globals.gc = global.gc;

plugin.sandbox.irc.connect();

if (plugin.sandbox.config.repl) {
	global.globals = globals;
	require("repl").start({ prompt: "", ignoreUndefined: true });
}
