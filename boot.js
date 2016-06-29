"use strict";

let plugin, replPrompt = "", useGc = true, gcInterval = 10000, mwInterval = 30000, repl = true;

global.globals = { startTime: Date.now() };

if (!require("fs").existsSync("config")) {
	console.error(" * NO config FOUND, SEE config.example");
	process.exit(1);
}

process.on("uncaughtException", function caughtUncaughtException(err) {
	if (plugin && plugin.sandbox && plugin.sandbox.logger)
		plugin.sandbox.logger.error(err, err);
	else
		console.error(err, err.stack);
});

plugin = require("./plugin.js")(global.globals);
plugin.loadCorePlugins([ // the order matters
	"bot", "ticker", "config", "logger", "lib", "web", "db", "words", "ial", "alias", "ignore",
	"logins", "perms", "bot-parse", "irc", "admin", "words-events", "core-events", "logins-events",
	"seen-events", "ial-events", "perms-events", "alias-events", "config-events"
]);
plugin.loadOptionalPlugins();

function processArgs(args) {
	let slicelen;
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
			setInterval(plugin.sandbox.lib.memReport, mwInterval);
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
				plugin.sandbox.logger.warn("gc-interval needs a number in seconds as it's argument. Using default.");
			}
			break;
		case "nogc":
			useGc = false;
			break;
		case "nocmd":
			repl = false;
			break;
		default:
			plugin.sandbox.logger.warn("Invalid argument: "+args[0]);
			break;
		}
		args = args.slice(slicelen);
	}
}

processArgs(process.argv.slice(2));

if (useGc) {
	if (!global.gc) {
		plugin.sandbox.logger.warn("You need to run node with --expose-gc if you want reasonable garbage collection.");
		plugin.sandbox.logger.warn("Run with the \"nogc\" option to suppress this warning.");
	} else {
		setInterval(global.gc, gcInterval);
	}
}

plugin.sandbox.irc.open({
	server: plugin.sandbox.config.server,
	port: plugin.sandbox.config.port,
	nickname: plugin.sandbox.config.nickname[0],
	username: plugin.sandbox.config.username,
	realname: plugin.sandbox.config.realname
});

if (repl)
	require("repl").start({ prompt: replPrompt, ignoreUndefined: true });
