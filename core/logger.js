"use strict";
let	logDay = new Date().getDate(),
	logFile, logger;

if (!fs.existsSync("data/logs"))
	fs.mkdirSync("data/logs");

function zero(n) { return n < 10 ? "0" + n : n.toString(); }

function logFileDate(d) {
	return d.getFullYear()+"-"+zero(d.getMonth()+1)+"-"+zero(d.getDate());
}

function writeLog(date, line) {      // XXX: Can not use logger.* functions in this call.
	if (date.getDate() !== logDay) { // Recursive loops, yo!
		logDay = date.getDate();     // new day, new log, new dog, new.. fog.. pog. whatever.
		logFile = "data/logs/" + logFileDate(date) + ".log";
		fs.writeFileSync(logFile, "");
	}
	if (logFile === undefined)
		logFile = "data/logs/" + logFileDate(date) + ".log";
	fs.appendFile(logFile, line.replace(/\u001b\[[0-9]+m/g, "") + "\n");
}

function shd(text) { // colourful
	switch (text) {
	case "Chat": text = "\u001b[36m"+text; break;
	case "Denied": text = "\u001b[36mChat-"+text; break;
	case "Ignored": text = "\u001b[36mIgnored"+text; break;
	case "Sent": text = "\u001b[32m"+text; break;
	case "Info": text = "\u001b[94m"+text; break;
	case "Traf": text = "\u001b[37m"+text; break;
	case "Error": text = "\u001b[91m"+text; break;
	case "Warning": text = "\u001b[93m"+text; break;
	case "Serv": text = "\u001b[0m"+text; break;
	case "DEBUG": text = "\u001b[93m"+text; break;
	case "Misc": text = "\u001b[97m"+text; break;
	case "Plugin": text = "\u001b[96m"+text; break;
	case "MemR": text = "\u001b[92m"+text; break;
	default: text = "\u001b[97m"+text; break;
	}
	return "\u001b[90m["+text+"\u001b[90m]\u001b[0m";
}

logger = {
	log: function (type, line, out, lineOpt) {
		let date = new Date();
		if (type)
			line = shd(type)+" "+line;
		if (config.logging_timestamp && (!lineOpt || lineOpt.timestamp !== false))
			line = date.toLocaleTimeString() + " " + line;
		if (type !== "MemR")
			writeLog(date, line);
		if (out) {
			if (lineOpt) { // logger.info("stuff", {newline: false});
				if (lineOpt.newline === false)
					process.stdout.write(line);
				else
					console.log(line);
			} else {
				console.log(line);
			}
		}
	},
	memr: function (line) { this.log("MemR", line, config.logging_timestamp); },
	chat: function (line) { this.log("Chat", line, config.logging_chat); },
	denied: function (line) { this.log("Denied", line, true); },
	ignored: function (line) { this.log("Ignored", line, true); },
	traffic: function (line) { this.log("Traf", line, config.logging_traffic); },
	info: function (line, options) { this.log("Info", line, config.logging_info, options); },
	server: function (line) { this.log("Serv", line, config.logging_serv); },
	debug: function (line, options) { this.log("DEBUG", line, config.logging_debug, options); },
	sent: function (line, silent) { this.log("Sent", line, (silent ? false : true)); },
	plugin: function (line) { this.log("Plugin", line, true); },
	misc: function (line, options) { this.log("Misc", line, true, options); },
	error: function (line, err, options) {
		this.log("Error", "\u001b[31m"+line+"\u001b[0m", true, options);
		bot.emitEvent("Event: Error", line);
		if (err && err.stack) {
			this.log("Error", "\u001b[30;1m" + err.stack + "\u001b[0m", true, options);
			bot.emitEvent("Event: Error Stack", err.stack);
		}
	},
	warning: function (line, options) { this.warn(line, options); },
	warn: function (line, options) {
		globals.lastWarning = new Date().toLocaleTimeString()+" [Warning] "+line;
		this.log("Warning", "\u001b[33m"+line+"\u001b[0m", true, options);
	}
};

plugin.declareGlobal("logger", "logger", logger);
