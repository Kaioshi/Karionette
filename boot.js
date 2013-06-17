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
		listDB: require("./lib/db_plainlist.js"),
		jsonDB: require("./lib/db_json.js"),
		Funcs: Funcs,
		require: require,
		regexFactory: require('./lib/regexFactory'),
		listen: Eventpipe.bind
	};

IRC.reload = function () {
	Eventpipe.purgeAll();
	Plugin.loadAll(sandbox);
	Eventpipe.setHandles();
};

process.on('uncaughtException', function (err) {
	console.log('[ERROR] Uncaught Exception: ' + err);
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

repl.start({ prompt: '> ', ignoreUndefined: true });
