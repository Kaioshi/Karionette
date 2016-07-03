"use strict";

const net = require("net");
const sanityCheck = /\n|\r|\t/g;
let connected = false,
	connectInterval,
	bufferedData = "",
	socket = new net.Socket();

function handleData(data) {
	let index;
	if (bufferedData.length) {
		data = bufferedData+data;
		bufferedData = "";
	}
	while ((index = data.indexOf("\r\n")) > -1) {
		bot.parse(data.slice(0, index));
		data = data.slice(index+2);
	}
	if (data.length) // server doesn't always end on \r\n per packet
		bufferedData = data; // so we dump the remainder on the front of the next one
}

function sanitise(message) {
	if (sanityCheck.test(message))
		message = message.replace(sanityCheck, "");
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
	sanitise(data); // remove \n \r \t
	if (opts) {
		if (opts.nolog) {
			socket.write(data+"\r\n", "utf8");
		} else if (opts.silent) {
			socket.write(data+"\r\n", "utf8");
			logger.sent(data, true);
		}
	} else {
		socket.write(data+"\r\n", "utf8");
		logger.sent(data);
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
		send("NICK "+params.nickname);
		send("USER "+params.username+" localhost * :"+params.realname);
		connected = true;
		if (connectInterval) {
			clearInterval(connectInterval);
			connectInterval = null;
		}
	});
}

function getMaxMessageLength(prefix) {
	if (config.address)
		return 508-(config.nick+config.address+prefix).length+3;
	return 473-prefix.length;
}

function sendMessage(type, context, message, maxmsgs) {
	let sliceAt, prefix, max;
	if (typeof message !== "string") {
		logger.error("Tried to send a non-String message: type -> "+typeof message);
		return;
	}
	if (!message) {
		logger.error("Tried to send an empty message: "+[type, context, message].join(", "));
		return;
	}
	prefix = type+" "+context+" :";
	max = getMaxMessageLength(prefix);
	if (message.length <= max) {
		send(prefix+message);
		return;
	}
	maxmsgs = maxmsgs || 3;
	while (--maxmsgs >= 0) {
		if (message.length > max) {
			sliceAt = message.lastIndexOf(" ", max-5); // " ..\r\n" = 5
			send(prefix+message.slice(0, sliceAt)+" ..");
			message = message.slice(sliceAt+1); // +1 removes the trailing space
		} else {
			send(prefix+message);
			break;
		}
	}
}

const irc = {
	open: openConnection,
	quit: function quitConnection(msg) {
		connected = false;
		msg = msg || config.quit_msg;
		send("QUIT :" + msg);
		socket.end();
	},
	raw: function raw(message) {
		send(message);
	},
	// IRC COMMANDS
	pong: function pong(challenge) {
		send("PONG :"+challenge, { nolog: true });
	},
	join: function join(channel, key) {
		if (key) {
			send("JOIN "+channel+" "+key);
		} else {
			send("JOIN "+channel);
		}
	},
	part: function part(channel, reason) {
		if (reason) {
			send("PART "+channel+" :"+reason);
		} else {
			send("PART "+channel);
		}
	},
	say: function say(context, message, maxmsgs) {
		sendMessage("PRIVMSG", context, message, maxmsgs);
	},
	rated: function rated(messages, delay) {
		// messages = [ [ method, target, message ], ... ]
		if (!messages.length) {
			logger.debug("Tried to irc.rated() an empty array");
			return;
		}
		delay = delay || 500;
		let repeater = setInterval(() => {
			let msg = messages.shift();
			if (msg)
				this[msg[0]](msg[1], msg[2]);
			else
				clearInterval(repeater);
		}, delay);
	},
	action: function action(channel, actionMsg, maxActions) {
		this.say(channel, "\x01ACTION "+actionMsg+"\x01", maxActions);
	},
	notice: function notice(target, noticeMsg, maxNotices) {
		sendMessage("NOTICE", target, noticeMsg, maxNotices);
	},
	// OP/DEOP/etc TODO: make op/deop/ban etc take multiple nicks/banmasks
	// op: function op(target, nick) { // UNUSED FROM HERE ON
	// 	send("MODE "+target+" +o "+nick);
	// },
	// deop: function deop(target, nick) {
	// 	send("MODE "+target+" -o "+nick);
	// },
	// voice: function voice(target, nick) {
	// 	send("MODE "+target+" +v "+nick);
	// },
	// devoice: function devoice(target, nick) {
	// 	send("MODE "+target+" -v "+nick);
	// },
	// halfop: function halfop(target, nick) {
	// 	send("MODE "+target+" +h "+nick);
	// },
	// dehalfop: function dehalfop(target, nick) {
	// 	send("MODE "+target+" -h "+nick);
	// },
	// kick: function kick(target, nick, reason) {
	// 	send("KICK "+target+" "+nick+" :"+reason);
	// },
	// ban: function ban(target, banmask) {
	// 	send("MODE "+target+" +b "+banmask);
	// },
	// unban: function unban(target, banmask) {
	// 	send("MODE "+target+" -b "+banmask);
	// },
	// topic: function topic(target, message) {
	// 	send("TOPIC "+target+" :"+message);
	// }
};

plugin.declareGlobal("irc", "irc", irc);
