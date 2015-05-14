"use strict";
global.globals = {
	os: process.platform,
	channels: {},
	startTime: new Date()
};

var fs = require('fs'),
	DB = require("./lib/fileDB.js"),
	fragDB = require("./lib/fragStorage.js"),
	web = require("./lib/web.js"),
	regexFactory = require("./lib/regexFactory.js"),
	Connection = require("./connection.js"),
	Plugin = require("./plugin.js"),
	prompt = "",
	gc = true, gcInterval = 5000, mwInterval = 30000, repl = true;

if (!fs.existsSync("config")) {
	console.error(" * NO CONFIG FOUND~ SEE config.example");
	process.exit();
} else {
	require("./lib/config.js");
}

require("./lib/funcs.js");
require("./lib/logger.js");
require("./lib/ial.js");
require("./lib/perms.js");
require("./lib/timers.js");
require("./lib/words.js");
require("./lib/caveman.js");
require("./lib/login.js");

function processArgs(args) {
	var slicelen,
		args = process.argv.slice(2);
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
			setInterval(function () {
				lib.memReport();
			}, mwInterval);
			break;
		case "prompt":
			if (args[1]) {
				slicelen = 2;
				prompt = args[1];
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

processArgs(process.argv);

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

function createSandbox() {
	return {
		irc: IRC,
		config: irc_config,
		console: console,
		setTimeout: setTimeout,
		setInterval: setInterval,
		web: web,
		DB: DB,
		fragDB: fragDB,
		lib: lib,
		ial: ial,
		userLogin: userLogin,
		timers: timers,
		require: require,
		regexFactory: regexFactory,
		evListen: caveman.eventListen,
		cmdListen: caveman.commandListen,
		cmdHelp: caveman.cmdHelp,
		cmdList: caveman.cmdList,
		cmdExists: caveman.cmdExists,
		getAliasHelp: caveman.getAliasHelp,
		ignore: caveman.ignore,
		unignore: caveman.unignore,
		ignoreList: caveman.ignoreList,
		logger: logger,
		words: words,
		perms: perms,
		globals: globals
	};
}

var IRC = global.mari = new Connection();
IRC.reload = function (plugin) {
	if (!plugin) {
		Plugin.loadAll(createSandbox());
	} else {
		Plugin.loadOne(createSandbox(), plugin);
	}
};

process.on('uncaughtException', function (err) {
	logger.error("Uncaught Exception: ", err);
});

Plugin.loadAll(createSandbox());

IRC.open({
	server: irc_config.server,
	port: irc_config.port,
	nickname: irc_config.nickname[0],
	username: irc_config.username,
	realname: irc_config.realname
});

if (repl) {
	repl = require("repl");
	repl.start({ prompt: prompt, ignoreUndefined: true });
}
