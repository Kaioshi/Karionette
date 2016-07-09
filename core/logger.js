"use strict";
const colourStrip = /\u001b\[[0-9]+m/g;
let logDay, logFile;


if (!fs.existsSync("data/logs"))
	fs.mkdirSync("data/logs");

function updateLogLocation(date) {
	let d = date.toJSON().slice(0, 10),
		dir = "data/logs/"+d.slice(0, 7);
	logFile = dir+"/"+d+".log";
	logDay = date.getDate();
	if (!fs.existsSync(dir))
		fs.mkdirSync(dir);
	if (!fs.existsSync(logFile))
		fs.writeFileSync(logFile, "");
}

function writeLog(date, line) {
	if (date.getDate() !== logDay)
		updateLogLocation(date);
	fs.appendFile(logFile, line.replace(colourStrip, ""));
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

updateLogLocation(new Date());

const logger = {
	log: function (type, line, print) {
		let date = new Date();
		line = date.toLocaleTimeString()+" "+shd(type)+" "+line+"\n";
		if (print)
			process.stdout.write(line);
		writeLog(date, line);
	},
	// skipping the log file for memreports
	memr: function (line) { process.stdout.write(`${new Date().toLocaleTimeString()} ${shd("MemR")} ${line}\n`); },
	chat: function (line) { logger.log("Chat", line, config.logging_chat); },
	denied: function (line) { logger.log("Denied", line, true); },
	ignored: function (line) { logger.log("Ignored", line, true); },
	traffic: function (line) { logger.log("Traf", line, config.logging_traffic); },
	info: function (line) { logger.log("Info", line, config.logging_info); },
	server: function (line) { logger.log("Serv", line, config.logging_serv); },
	debug: function (line) { logger.log("DEBUG", line, config.logging_debug); },
	sent: function (line, silent) { logger.log("Sent", line, (silent ? false : true)); },
	plugin: function (line) { logger.log("Plugin", line, true); },
	misc: function (line) { logger.log("Misc", line, true); },
	warning: function (line) { logger.warn(line); },
	warn: function (line) { logger.log("Warning", "\u001b[33m"+line+"\u001b[0m", true); },
	error: function (error, err) {
		if (error.stack) { // logger.error(Error)
			logger.log("Error", "\u001b[31m"+error.message+"\u001b[0m", true);
			bot.emitEvent("Event: Error", error.message);
			logger.log("Error", "\u001b[30;1m"+error.stack+"\u001b[0m", true);
			bot.emitEvent("Event: Error Stack", error.stack);
		} else { // logger.error("custom message", Error)
			logger.log("Error", "\u001b[31m"+error+"\u001b[0m", true);
			bot.emitEvent("Event: Error", error);
			if (err && err.stack) { // logger.error("custom message")
				logger.log("Error", "\u001b[30;1m" + err.stack + "\u001b[0m", true);
				bot.emitEvent("Event: Error Stack", err.stack);
			}
		}
	}
};

plugin.declareGlobal("logger", "logger", logger);
