globals = {
	lastError: "",
	lastWarning: "",
	admins: { lastCheck: new Date().getTime() },
	channels: {},
	startTime: new Date(),
	memProf: { "loading requires": process.memoryUsage().rss }
};

require("./config.js");
require("./lib/funcs.js");
require("./lib/logger.js");
require("./lib/ial.js");
require("./lib/permissions.js");
require("./lib/timers.js");
require("./lib/words.js");

var DB = require("./lib/fileDB.js"),
	web = require("./lib/web.js"),
	regexFactory = require("./lib/regexFactory.js"),
	Eventpipe = require("./eventpipe.js"),
	Connection = require("./connection.js"),
	Plugin = require("./plugin.js"),
	repl = require('repl');
lib.memProf("loading requires");

function memClean() {
	lib.memProf("Running GC");
	global.gc();
	lib.memProf("Running GC");
}

timers.Add(10000, memClean);

function createSandbox() {
	return {
		irc: IRC,
		config: irc_config,
		console: console,
		setTimeout: setTimeout,
		setInterval: setInterval,
		web: web,
		DB: DB,
		lib: lib,
		ial: ial,
		timers: timers,
		require: require,
		regexFactory: regexFactory,
		listen: Eventpipe.bind,
		logger: logger,
		words: words,
		permissions: permissions,
		globals: globals
	};
}

var IRC = global.mari = new Connection(Eventpipe);
IRC.reload = function (plugin) {
	if (!plugin) {
		Eventpipe.purgeAll();
		Plugin.loadAll(createSandbox());
		Eventpipe.setHandles();
	} else {
		Eventpipe.purgeOne(plugin);
		Plugin.loadOne(createSandbox(), plugin);
		Eventpipe.setHandles();
	}
};

process.on('uncaughtException', function (err) {
	logger.error("Uncaught Exception: " + err + err.stack);
});

Plugin.loadAll(createSandbox());
Eventpipe.setHandles();

IRC.open({
	server: irc_config.server,
	port: irc_config.port,
	nickname: irc_config.nickname[0],
	username: irc_config.username,
	realname: irc_config.realname
});

repl.start({ prompt: '', ignoreUndefined: true });
