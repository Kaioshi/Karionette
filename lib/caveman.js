require("./funcs.js");

caveman = {
	emitEvent: function (input) {
		var data, tmp, type, i,
			params = { raw: input };
		
		if (input[0] === ":") {
			tmp = input.slice(input.indexOf(" ")+1);
			type = tmp.slice(0, tmp.indexOf(" "));
			tmp = null;
		} else {
			type = input.slice(0, input.indexOf(" ")); // Y U NO :, PING
		}
		
		input = input.split(" ");
		if (input[0].indexOf("!") > -1) {
			params.nick = input[0].slice((input[0][0] === ":" ? 1 : 0), input[0].indexOf("!"));
			params.address = input[0].slice(input[0].indexOf("!") + 1);
		}
		if (input[2]) {
			params.context = input[2];
			if (input[2].indexOf("#") > -1) {
				params.channel = (input[2][0] !== ":" ? input[2] : input[2].slice(1));
			} else if (params.nick) {
				params.context = params.nick;
			} else {
				params.server = input[0].slice(1);
				delete params.context;
			}
		}
		switch (type) {
			case "PRIVMSG":
				params.message = input.slice(3).join(" ").slice(1);
				if (params.message[0] === irc_config.command_prefix) {
					params.command = input[3].slice(2);
					params.args = input.slice(4);
					data = params.raw.slice(1);
					params.data = data.slice(data.indexOf(":")+(params.command.length+3));
					data = null;
					if (params.args.length === 0) delete params.args;
					if (caveman.cmdAliases && caveman.cmdAliases[params.command]) {
						params.command = caveman.cmdAliases[params.command];
					}
					lib.events.emit("Command: "+params.command, params);
				}
				break;
			case "PING":
				params.challenge = input[1].slice(1);
				break;
			case "MODE":
				params.mode = input[3];
				params.affected = input.slice(4).join(" ");
				break;
			case "TOPIC":
				params.topic = input.slice(3).join(" ").slice(1);
				break;
			case "PART":
				params.reason = (input[3] ? input.slice(3).join(" ").slice(1) : "");
				break;
			case "NICK":
				params.newnick = input[2].slice(1);
				break;
			case "QUIT":
				params.reason = input.slice(2).join(" ").slice(1);
				break;
			case "KICK":
				params.kicked = input[3];
				params.reason = input.slice(4).join(" ").slice(1);
				break;
		}
		// check for and emit complex events
		if (caveman.eventRegexes[type]) {
			//logger.debug("Running "+type+" regexes..");
			for (i = 0; i < caveman.eventRegexes[type].length; i++) {
				params.match = caveman.eventRegexes[type][i][1].exec(params.raw);
				if (params.match) {
					//logger.debug("Matched!");
					lib.events.emit("Event: "+caveman.eventRegexes[type][i][0]+" "+type, params);
				}
			}
			//logger.debug(i+" regexes were run.");
			if (!params.match) delete params.match;
		}
		lib.events.emit("Event: " + type, params);
		params = null;
	},
	commandListen: function (command) {
		var trigger, i;
		if (!(command.command && command.help && command.callback)) {
			logger.error("Incorrect caveman.commandListen format - need at least a command, help and callback.");
			return;
		}
		if (Array.isArray(command.command)) {
			if (command.command.length === 1) {
				command.command = command.command[0];
			} else {
				if (!caveman.cmdAliases) caveman.cmdAliases = {};
				for (i = 1; i < command.command.length; i++) {
					caveman.cmdAliases[command.command[i]] = command.command[0];
				}
				command.command = command.command[0];
			}
		}
		trigger = "Command: "+command.command;
		// check for and remove dupes
		if (caveman.commands[command.command]) {
			lib.events.removeListener(trigger, lib.events.listeners(trigger)[0]); // there can be oonly oneee
			delete caveman.commands[command.command];
		}
		caveman.commands[command.command] = {
			id: command.command,
			help: command.help
		};
		if (command.syntax) caveman.commands[command.command].syntax = command.syntax;
		if (command.options) caveman.commands[command.command].options = command.options;
		lib.events.on(trigger, command.callback);
	},
	eventListen: function (event) {
		var i, events, funcStr, dupe;
		if (!(event.event && event.handle && event.callback)) {
			logger.error("Incorrect caveman.eventListen format - need at least an event, handle and callback.");
			return;
		}
		funcStr = event.callback.toString().replace(/\n|\t| /g, "");
		// register as a vanilla event or regex based
		if (event.regex) {
			trigger = "Event: "+event.handle+" "+event.event;
			if (!caveman.eventRegexes) caveman.eventRegexes = {};
			if (!caveman.eventRegexes[event.event]) caveman.eventRegexes[event.event] = [];
			// dupe check
			dupe = false;
			for (i = 0; i < caveman.eventRegexes[event.event].length; i++) {
				if (caveman.eventRegexes[event.event][i][0] === event.handle) {
					dupe = true;
					caveman.eventRegexes[event.event][i][1] = event.regex;
				}
			}
			if (!dupe) {
				caveman.eventRegexes[event.event].push( [ event.handle, event.regex ] );
			}
		} else {
			trigger = "Event: "+event.event;
		}
		// check for and remove dupes
		if (caveman.events[event.handle]) {
			events = lib.events.listeners(trigger);
			for (i = 0; i < events.length; i++) {
				if (events[i].toString().replace(/\n|\t| /g, "") === caveman.events[event.handle].func) {
					lib.events.removeListener(trigger, events[i]);
				}
			}
			delete caveman.events[event.handle];
		}
		caveman.events[event.handle] = {
			id: event.handle,
			func: funcStr
		};
		lib.events.on(trigger, event.callback);
	},
	cmdHelp: function (command, type) {
		if (type !== "help" && type !== "syntax" && type !== "options") {
			logger.error("Tried to get non-existant help type "+type+" for command "+command);
		} else {
			if (caveman.cmdAliases[command]) {
				return caveman.commands[caveman.cmdAliases[command]][type];
			}
			if (caveman.commands[command] && caveman.commands[command][type]) {
				return caveman.commands[command][type];
			}
		}
	},
	cmdList: function () {
		return Object.keys(caveman.commands);
	}
};

if (!caveman.events) caveman.events = {};
if (!caveman.commands) caveman.commands = {};
