"use strict";

const [setInterval, clearInterval, IRCParser] = plugin.importMany("setInterval", "clearInterval", "ircparser");
const net = plugin.import("require")("net");

class Connection {
	constructor() {
		this._quitting = false;
		this.buffer = "";
	}
	quit() { this._quitting = true; this.socket.end(); }
	send(data) { this.socket.write(data+"\r\n", "utf8"); logger.sent(data); }
	configure() {
		if (this.socket) {
			this.socket.destroy();
			this.socket = null;
		}
		this.socket = new net.Socket();
		this.socket.setNoDelay(false);
		this.socket.setEncoding("utf8");
		this.socket.setTimeout(300000, () => this.socket.destroy());
		this.socket.on("close", () => {
			if (this._quitting) {
				logger.warn("Quitting. Exiting process...");
				bot.emitEvent("closing");
			} else {
				logger.warn("Disconnected. Attempting to reconnect in 15 seconds...");
				if (!this._connectInterval)
					this._connectInterval = setInterval(() => this.connect(), 15000);
			}
		});
		this.socket.on("error", err => {
			logger.error("Socket error!", err);
			this.socket.destroy();
		});
		this.socket.on("data", data => this.handleData(data));
	}
	connect() {
		this.configure();
		this.socket.connect(config.port, config.server, () => {
			if (config.password !== undefined)
				this.send("PASS "+config.password);
			this.send("NICK "+config.nickname);
			this.send("USER "+config.username+" localhost * :"+config.realname);
			if (config.twitch)
				this.send("CAP REQ :twitch.tv/membership");
			if (this._connectInterval) {
				clearInterval(this._connectInterval);
				delete this._connectInterval;
			}
		});
	}
	handleData(data) {
		let index;
		if (this.buffer.length) {
			data = this.buffer+data;
			this.buffer = "";
		}
		while ((index = data.indexOf("\r\n")) > -1) {
			IRCParser.parse(data.slice(0, index));
			data = data.slice(index+2);
		}
		if (data.length) // server doesn't always end on \r\n per packet
			this.buffer = data; // so we dump the remainder on the front of the next one
	}
}

plugin.export("connection", Connection);
