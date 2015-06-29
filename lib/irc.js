"use strict";
/*
 * CONNECTION: This module handles connection to the IRC server,
 * 			   as well as sending and receiving data from it.
 */

var net = require("net");

module.exports = function (config, bot, logger) {
	var connected = false,
		connectInterval,
		bufferedData = "",
		socket = new net.Socket();

	function handleData(data) {
		var index;
		if (bufferedData.length) {
			data = bufferedData+data;
			bufferedData = "";
		}
		while ((index = data.indexOf("\r\n")) > -1) {
			bot.emitEvent(data.slice(0, index));
			data = data.slice(index+2);
		}
		if (data.length) // server doesn't always end on \r\n per packet
			bufferedData = data; // so we dump the remainder on the front of the next one
	}

	// Send a message via the open socket
	function send(data, opts) {
		if (!data || data.length === 0) {
			logger.error("Tried to send no data");
			return;
		}
		if (data.length > 510) {
			logger.error("Tried to send data > 510 chars in length: " + data);
			return;
		}
		if (opts) {
			if (opts.nolog)
				socket.write(data+"\r\n", "utf8");
			else if (opts.silent)
				socket.write(data+"\r\n", "utf8", logger.sent(data, true));
		} else {
			socket.write(data+"\r\n", "utf8", logger.sent(data));
		}
	}

	// Configure the socket appropriately
	function configureSocket() {
		socket.setNoDelay(true);
		socket.setEncoding("utf8");
		// Connection TimeOut support
		socket.setTimeout(300000, function socketTimeout() {
			// If fails, error and close events trigger
			send("VERSION");
			socket.destroy();
		});
		socket.on("close", function socketCloseEvent(hadError) {
			if (!(hadError || connected)) {
				process.emit("closing");
				logger.warn("Socket closed. Exiting process...");
				socket.end();
				setTimeout(process.exit, 1000);
			} else {
				logger.warn("Socket closed. Attempting to reconnect in 15 seconds...");
				socket = new net.Socket();
				if (!connectInterval) {
					connectInterval = setInterval(function () {
						logger.warn("Attempting reconnect...");
						openConnection({
							server: config.server,
							port: config.port,
							nickname: config.nickname[0],
							username: config.username,
							realname: config.realname
						});
					}, 15000);
				}
			}
		});
		socket.on("error", function socketErrorEvent(e) {
			logger.error("Socket error!", e);
			socket.destroy();
		});
		socket.on("data", handleData);
	}

	function openConnection(params) {
		configureSocket();
		socket.connect(params.port, params.server, function () {
			send("NICK " + sanitise(params.nickname));
			send("USER " + sanitise(params.username) + " localhost * :" + sanitise(params.realname));
			connected = true;
			if (connectInterval) {
				clearInterval(connectInterval);
				connectInterval = null;
			}
		});
	}

	// Sanatise a string for use in IRC
	function sanitise(string) {
		if (!string) {
			return string;
		}
		/* Note:
		* 0x00 (null character) is invalid
		* 0x01 signals a CTCP message, which we shouldn't ever need to do
		* 0x02 is bold in mIRC (and thus other GUI clients)
		* 0x03 precedes a color code in mIRC (and thus other GUI clients)
		* 0x04 thru 0x19 are invalid control codes, except for:
		* 0x16 is "reverse" (swaps fg and bg colors) in mIRC
		*/
		return string.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
			.replace(/[^\x02-\x03|\x16|\x20-\x7e]/g, "");
	}

	function sendMessage(type, context, message, sanitiseMessage, maxmsgs) {
		var msg, max, maxMessages, i, tempMsg;
		if (typeof message !== "string") {
			logger.error("Tried to send a non-String message: type of message -> "+typeof message);
			return;
		}
		message = message.replace(/\n|\t|\r/g, "");
		context = sanitise(context); // Avoid sanitising more than once
		msg = type+ " " + context + " :";
		if (config.address) {
			max = 508 - (config.nick+config.address+msg).length+3;
		} else {
			max = 473 - msg.length; // yay magic numbers - haven't joined a channel yet.
		}
		maxMessages = (maxmsgs < 3 ? maxmsgs : 3);
		if (sanitiseMessage !== false) {
			message = sanitise(message);
		}
		while (message && (maxMessages -= 1) >= 0) {
			i = 0;
			tempMsg = message.slice(0, max);
			if (message.length > tempMsg.length) {
				max = max-3;
				while (message[max - i] !== " ") {
					i += 1;
				}
				tempMsg = message.slice(0, (max - i)) + " ..";
			}
			send(msg + tempMsg.trim());
			message = message.slice(max - i);
		}
	}

	return {
		open: openConnection,
		quit: function quitConnection(msg) {
			connected = false;
			msg = msg || config.quit_msg;
			send("QUIT :" + msg);
			socket.end();
		},
		raw: function (stuff) {
			send(stuff);
		},
		// IRC COMMANDS
		pong: function (server) {
			send("PONG :" + server, { nolog: true });
		},
		join: function (channel, key) {
			if (key) {
				send(sanitise("JOIN "+channel+" "+key));
			} else {
				send("JOIN "+sanitise(channel));
			}
		},
		part: function (channel, reason) {
			if (reason) {
				send("PART "+sanitise(channel)+" :"+sanitise(reason));
			} else {
				send("PART "+sanitise(channel));
			}
		},
		say: function (context, message, sanitiseMessage, maxmsgs) {
			if (context && message) {
				sendMessage("PRIVMSG", context, message, sanitiseMessage, maxmsgs);
			}
		},
		rated: function (messages) {
			// messages = [ [ method, target, message, sanitise ], ... ]
			var n, that;
			if (!messages.length) {
				logger.debug("Tried to irc.rated() an empty array");
				return;
			}
			n = 0; that = this;
			messages.forEach(function (msg) {
				msg[3] = msg[3] || false;
				setTimeout(function () {
					that[msg[0]](msg[1], msg[2], msg[3]);
				}, n);
				n += 750;
			});
		},
		reply: function (input, message, sanitiseReply) {
			if (input && message) {
				if (sanitiseReply !== false) {
					this.say(input.context, input.from + ": " + message);
				} else {
					this.say(input.context, input.from + ": " + message, false);
				}
			}
		},
		action: function (channel, action, sanitiseAction) {
			if (channel && action) {
				action = action.replace(/\n|\t|\r/g, "");
				if (sanitiseAction !== false) {
					this.say(channel, "\x01ACTION "+sanitise(action)+"\x01", false);
				} else {
					this.say(channel, "\x01ACTION "+action+"\x01", false);
				}
			}
		},
		notice: function (target, notice, sanitiseNotice) {
			if (target && notice) {
				notice = notice.replace(/\n|\t|\r/g, "");
				if (sanitiseNotice)
					sendMessage("NOTICE", target, notice, sanitiseNotice);
				else
					sendMessage("NOTICE", target, notice);
			}
		},
		// CORE COMMANDS
		reload: function () {}
	};
};
