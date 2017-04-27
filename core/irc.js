"use strict";

const [setInterval, clearInterval, Connection, IRCParser] = plugin.importMany("setInterval", "clearInterval", "connection", "ircparser");
const sanityCheck = /[\n\t\r]g/;

class IRC {
	constructor() {
		this.connection = new Connection();
		this._sendQueue = [];
	}
	static sanitise(line) {
		if (sanityCheck.test(line))
			return line.replace(sanityCheck, "");
		return line;
	}
	connect() { this.connection.connect(); }
	send(data) { this.connection.send(IRC.sanitise(data)); }
	queueMessage(message, lowPriority) {
		if (lowPriority) // end of the line
			this._sendQueue.push(message);
		else
			this._sendQueue.unshift(message);
		if (!this._processingQueue) {
			this._processingQueue = true;
			this._processQueue();
		}
	}
	_processQueue(delay=10) {
		this._processingQueue = setInterval(() => {
			if (delay === 10 && this._sendQueue.length >= 3) {
				clearInterval(this._processingQueue);
				return this._processQueue(750);
			}
			const msg = this._sendQueue.shift();
			if (msg)
				this.send(msg);
			else {
				clearInterval(this._processingQueue);
				this._processingQueue = false;
			}
		}, delay);
	}
	longMessage(target, message, maxLines = 3) {
		while (message.length > 345 && maxLines--) {
			const index = message.lastIndexOf(" ", 345); // -5 for ".."
			this.queueMessage(target+message.slice(0, index)+" ..", true);
			message = message.slice(index+1);
		}
		if (maxLines > 0 && message.length)
			this.queueMessage(target+message, true);
	}
	say(target, message, lowPriority, maxLines) {
		if (message.length > 345)
			this.longMessage("PRIVMSG "+target+" :", message, maxLines);
		else
			this.queueMessage("PRIVMSG "+target+" :"+message, lowPriority);
	}
	notice(target, message, lowPriority, maxLines) {
		if (message.length > 345)
			this.longMessage("NOTICE "+target+" :", message, maxLines);
		else
			this.queueMessage("NOTICE "+target+" :"+message, lowPriority);
	}
	action(target, message, lowPriority) { this.queueMessage("PRIVMSG "+target+" :\x01ACTION "+message+"\x01", lowPriority); }
	rated(messages) { messages.forEach(msg => this[msg[0]](msg[1], msg[2], true)); }
	join(channel, key) { this.send("JOIN "+channel+(key ? " "+key : "")); }
	part(channel, reason) { this.send("PART "+channel+(reason ? " :"+reason : "")); }
	pong(challenge) { this.connection.socket.write("PONG :"+challenge+"\r\n"); }
	quit(message) { this.send("QUIT"+(message ? " :"+message : "")); this.connection.quit(); }
	raw(data) { this.send(data); }
}

plugin.global("irc", new IRC());
