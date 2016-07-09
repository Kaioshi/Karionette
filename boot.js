"use strict";
global.globals = {
    memoryUsage: process.memoryUsage().rss,
    startTime: Date.now(),
    gc: global.gc
};

process.on("uncaughtException", function caughtUncaughtException(err) {
	if (plugin && plugin.sandbox && plugin.sandbox.logger)
		plugin.sandbox.logger.error(err);
	else
		console.error(err, err.stack);
});

const plugin = require("./plugin.js")(global.globals);
plugin.loadCorePlugins([ // the order matters
	"bot", "config", "logger", "lib", "ticker", "web", "db", "words", "ial", "alias", "ignore",
	"logins", "perms", "bot-parse", "irc", "admin-events", "words-events", "core-events",
	"logins-events", "seen-events", "ial-events", "perms-events", "alias-events", "config-events"
]);
plugin.loadOptionalPlugins();

plugin.sandbox.irc.open({
	server: plugin.sandbox.config.server,
	port: plugin.sandbox.config.port,
	nickname: plugin.sandbox.config.nick,
	username: plugin.sandbox.config.username,
	realname: plugin.sandbox.config.realname,
	password: plugin.sandbox.config.password
});

if (plugin.sandbox.config.repl)
	require("repl").start({ prompt: "", ignoreUndefined: true });
