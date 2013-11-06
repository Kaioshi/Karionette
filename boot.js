"use strict";
global.globals = {
	lastError: "",
	lastWarning: "",
	admins: { lastCheck: new Date().getTime() },
	channels: {},
	startTime: new Date()
};

require("./config.js");
require("./lib/funcs.js");
require("./lib/logger.js");
require("./lib/ial.js");
require("./lib/permissions.js");
require("./lib/timers.js");
require("./lib/words.js");
require("./lib/caveman.js");

var DB = require("./lib/fileDB.js"),
	web = require("./lib/web.js"),
	regexFactory = require("./lib/regexFactory.js"),
	Eventpipe = require("./eventpipe.js"),
	Connection = require("./connection.js"),
	Plugin = require("./plugin.js"),
	prompt = "",
	gc = true,
	gcInterval = 5000,
	mwInterval = 30000,
	repl = (process.argv[2] !== "nocmd" ? require("repl") : null);

/**
 *  I'm aware you can't do more than one of these options at a time.
 *  I guess it needs to loop through the args looking for commands.
 *  I'll do that another time. Butts united!
 */
switch (process.argv[2]) {
	case "-h":
	case "--help":
	case "help":
		console.log("Command line options: " + process.argv[0] + " [--expose-gc] boot.js <command>");
		console.log("  nocmd                \tDisables interactive prompt.");
		console.log("  prompt \"Mari> \"    \tSets interactive prompt string.");
		console.log("  nogc                 \tDisables forced garbage collection every 5 seconds.");
		console.log("                       \t[note: you need to run with --expose-gc if not using \"nogc\"]");
		console.log("  gc-interval <seconds>\tSets how often we do a forced garbage collection.                       (Default:  5)");
		console.log("  memwatch [<seconds>] \tShows how much memory we're using, if it changed since the last report. (Default: 30)");
		console.log("  help\t\t\tShows this help.");
		process.exit();
		break;
	case "memwatch":
		if (process.argv[3]) {
			if (process.argv[3].match(/[0-9]+/)) {
				mwInterval = parseInt(process.argv[3], 10) * 1000;
			} else {
				logger.warn("memwatch need a number in seconds as it's argument. Using default.");
			}
		}
		setInterval(function () {
			lib.memReport();
		}, mwInterval);
		break;
	case "prompt":
		if (process.argv[3]) prompt = process.argv[3];
		break;
	case "gc-interval":
		if (process.argv[3] && process.argv[3].match(/[0-9]+/)) {
			gcInterval = parseInt(process.argv[3], 10) * 1000;
		} else {
			logger.warn("gc-interval needs a number in seconds as it's argument. Using default.");
		}
		break;
	case "nogc":
		gc = false;
		break;
	default:
		break;
}

if (gc) {
	if (!global.gc) {
		logger.warn("You need to run node with --expose-gc if you want reasonable garbage collection.");
	} else {
		setInterval(function () {
			global.gc();
		}, gcInterval);
	}
}

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
		evListen: caveman.eventListen,
		cmdListen: caveman.commandListen,
		cmdHelp: caveman.cmdHelp,
		cmdList: caveman.cmdList,
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
	logger.error("Uncaught Exception: ", err);
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

if (repl) {
	repl.start({ prompt: prompt, ignoreUndefined: true });
}
