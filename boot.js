// this file is so goddamn messy.
"use strict";

global.globals = {
	os: process.platform,
	channels: {},
	startTime: new Date()
};

if (!require("fs").existsSync("config")) {
	console.error(" * NO config FOUND, SEE config.example");
	process.exit(1);
}

var lib = require("./lib/funcs.js")(),
	config = require("./lib/config.js")(),
	edgar = require("./lib/edgar.js")(),
	timers = require("./lib/timers.js")(lib, edgar.emitEvent),
	ial = require("./lib/ial.js")(lib),
	logger = require("./lib/logger.js")(lib, config, edgar.emitEvent),
	Plugin = require("./lib/plugin.js")(logger, config),
	fragDB = require("./lib/fragDB.js")(lib, logger),
	DB = require("./lib/db.js")(lib, logger),
	ignore = require("./lib/ignore.js")(DB, lib, ial),
	web = require("./lib/web.js")(lib, logger, config),
	words = require("./lib/words.js")(lib, config, logger, web),
	alias = require("./lib/alias.js")(DB, lib, config, ial, words),
	userLogin = require("./lib/login.js")(lib, config, logger, fragDB, ial, edgar.event),
	perms = require("./lib/perms.js")(DB, logger, ial, userLogin),
	bot = require("./lib/bot.js")(lib, config, logger, edgar, ial, perms, words, userLogin, alias, ignore),
	replPrompt = "", gc = true, gcInterval = 10000, mwInterval = 30000, repl = true;

processArgs(process.argv.slice(2));

global.irc = new require("./lib/irc.js")(config, bot, logger);

function processArgs(args) {
	var slicelen,
		memWatch = function () {
			lib.memReport();
		};
	while (args.length > 0) {
		slicelen = 1;
		switch (args[0]) {
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
			if (args[1]) {
				if (args[1].match(/[0-9]+/)) {
					mwInterval = parseInt(args[1], 10) * 1000;
					slicelen = 2;
				}
			}
			setInterval(memWatch, mwInterval);
			break;
		case "prompt":
			if (args[1]) {
				slicelen = 2;
				replPrompt = args[1];
			}
			break;
		case "gc-interval":
			if (args[1] && args[1].match(/[0-9]+/)) {
				slicelen = 2;
				gcInterval = parseInt(args[1], 10) * 1000;
			} else {
				logger.warn("gc-interval needs a number in seconds as it's argument. Using default.");
			}
			break;
		case "nogc":
			gc = false;
			break;
		case "nocmd":
			repl = false;
			break;
		default:
			logger.warn("Invalid argument: "+args[0]);
			break;
		}
		args = args.slice(slicelen);
	}
}

if (gc) {
	if (!global.gc) {
		logger.warn("You need to run node with --expose-gc if you want reasonable garbage collection.");
		logger.warn("Run with the \"nogc\" option to suppress this warning.");
	} else {
		setInterval(function () {
			global.gc();
		}, gcInterval);
	}
}

Plugin.setupSandbox({ // console and setInterval not used by any plugins as of 2015-06-29
	irc: global.irc,
	config: config,
	setTimeout: setTimeout,
	emitEvent: edgar.emitEvent,
	web: web,
	DB: DB,
	fragDB: fragDB,
	lib: lib,
	ial: ial,
	userLogin: userLogin,
	timers: timers,
	require: require,
	bot: bot,
	logger: logger,
	words: words,
	perms: perms,
	globals: globals
});

irc.reload = function (plugin) {
	if (!plugin) {
		Plugin.loadAll("core", "plugins/core");
		Plugin.loadAll("optional", "plugins");
	} else {
		Plugin.loadOne(plugin);
	}
};

process.on("uncaughtException", function caughtUncaughtExcaption(err) {
	logger.error("Uncaught Exception: ", err);
});

Plugin.loadAll("core", "plugins/core/");
Plugin.loadAll("optional", "plugins/");

irc.open({
	server: config.server,
	port: config.port,
	nickname: config.nickname[0],
	username: config.username,
	realname: config.realname
});

if (repl)
	require("repl").start({ prompt: replPrompt, ignoreUndefined: true });
