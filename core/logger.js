"use strict";
const [fs, process, lib] = plugin.importMany("fs", "process", "lib"),
	colourStrip = /\u001b\[[0-9]+m/g;

class Logger {
	constructor() {
		if (!fs.existsSync("data/logs"))
			fs.mkdirSync("data/logs");
		this.updateLogLocation(new Date());
	}
	updateLogLocation(date) {
		const d = date.toJSON().slice(0, 10),
			dir = "data/logs/"+d.slice(0,7);
		this.logFile = dir+"/"+d+".log";
		this.logDay = date.getDate();
		if (!fs.existsSync(dir))
			return fs.mkdirSync(dir);
		if (!fs.existsSync(this.logFile))
			return fs.writeFileSync(this.logFile, "");
	}
	appendLog(date, line) {
		if (date.getDate() !== this.logDay)
			this.updateLogLocation(date);
		return fs.appendFileSync(this.logFile, line.replace(colourStrip, ""));
	}
	log(line, print) {
		const date = new Date();
		line = date.toLocaleTimeString()+" "+line+"\n";
		if (print)
			process.stdout.write(line);
		return this.appendLog(date, line);
	}
	memr(line) { return process.stdout.write(`${new Date().toLocaleTimeString()} \u001b[92mMemR\u001b[0m ${line}\n`); }
	chat(line) { return this.log("\u001b[36mChat\u001b[0m "+line, true); }
	denied(line) { return this.log("\u001b[36mChat-Denied\u001b[0m "+line, true); }
	ignored(line) { return this.log("\u001b[36mChat-Ignored\u001b[0m "+line, true); }
	traffic(line) { return this.log("\u001b[37mTraf\u001b[0m "+line, config.logging_traffic); }
	info(line) { return this.log("\u001b[94mInfo\u001b[0m "+line, config.logging_info); }
	server(line) { return this.log("\u001b[35mServ\u001b[0m "+line, config.logging_serv); }
	debug(line) { return this.log("\u001b[93mDBUG\u001b[0m "+line, config.logging_debug); }
	sent(line, silent) { return this.log("\u001b[32mSent\u001b[0m "+line, (silent ? false : true)); }
	plugin(line) { return this.log("\u001b[96mPlug\u001b[0m "+line, true); }
	misc(line) { return this.log("\u001b[97mMisc\u001b[0m "+line, true); }
	warning(line) { return this.warn(line); }
	warn(line) { return this.log("\u001b[93mWarn\u001b[33m "+line+"\u001b[0m", true); }
	error(error, err) {
		if (error.stack) { // logger.error(Error)
			this.log("\u001b[91mError \u001b[31m"+error.message+"\u001b[0m", true);
			bot.emitEvent("Event: Error", error.message);
			this.log("\u001b[91mError \u001b[30;1m"+lib.objToString(error.stack)+"\u001b[0m", true);
			return bot.emitEvent("Event: Error Stack", error.stack);
		} else { // logger.error("custom message", Error)
			this.log("\u001b[31mError \u001b[31m"+lib.objToString(error)+"\u001b[0m", true);
			bot.emitEvent("Event: Error", error);
			if (err && err.stack) { // logger.error("custom message")
				this.log("\u001b[31mError \u001b[30;1m"+lib.objToString(err.stack)+"\u001b[0m", true);
				return bot.emitEvent("Event: Error Stack", err.stack);
			}
		}
	}
}

plugin.global("logger", new Logger());
