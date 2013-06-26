require("./lib/funcs.js");
require("./config.js");
var Eventpipe = require("./eventpipe.js"),
	Connection = require("./connection.js"),
	Plugin = require("./plugin.js"),
	repl = require('repl');

var IRC = global.mari = new Connection(Eventpipe),
	sandbox = {
		irc: IRC,
		config: irc_config,
		console: console,
		setTimeout: setTimeout,
		setInterval: setInterval,
		web: require('./lib/web.js'),
		DB: require("./lib/fileDB.js"),
		lib: lib,
		require: require,
		regexFactory: require('./lib/regexFactory'),
		listen: Eventpipe.bind,
		globals: { startTime: new Date() }
	};

IRC.reload = function () {
	Eventpipe.purgeAll();
	Plugin.loadAll(sandbox);
	Eventpipe.setHandles();
};

process.on('uncaughtException', function (err) {
	log2("error", "Uncaught Exception: " + err);
});

Plugin.loadAll(sandbox);
Eventpipe.setHandles();

IRC.open({
	server: irc_config.server,
	port: irc_config.port,
	nickname: irc_config.nickname[0],
	username: irc_config.username,
	realname: irc_config.realname
});

repl.start({ prompt: '', ignoreUndefined: true });
