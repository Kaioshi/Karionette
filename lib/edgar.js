"use strict";
/**
 * couldn't think of a name other than "events", which is taken globally. Edgar it is.
 * events["PRIVMSG"] -> [ { handle: foo, cb: callback() }, ... ]
 * commands["say"] -> { help, syntax, callback }
 * commandAliases["echo"] -> "say"
 */

module.exports = function () {
	// commandList is kept up to date so that we don't have to Object.keys(commands)
	// every time a command is attempted.
	var edgar = {}, events = {}, commandList = [], commands = {}, commandAliases = {};

	function objContains(type, obj, items) {
		var i;
		for (i = 0; i < items.length; i++) {
			if (obj[items[i]] === undefined) {
				console.error("Invalid "+type+", missing '"+items[i]+"'");
				return false;
			}
		}
		return true;
	}

	function eventsIndexOf(trigger, handle) {
		var i;
		if (events[trigger] === undefined)
			return -1;
		for (i = 0; i < events[trigger].length; i++) {
			if (handle === events[trigger][i].handle)
				return i;
		}
		return -1;
	}

	function registerEvent(e) {
		console.log("Registered "+e.handle+" event ("+e.event+")");
		unregisterEvent(e.event, e.handle); // There Can Be Only Juan
		events[e.event] = events[e.event] || [];
		events[e.event].push(e);
	}

	function unregisterEvent(trigger, handle) {
		var index = eventsIndexOf(trigger, handle);
		if (index > -1) {
			console.log("Removing "+handle+" event ("+trigger+")");
			events[trigger].splice(index, 1);
		}
	}

	function registerCommand(c) {
		// console.log("Registered "+c.command+" command");
		if (Array.isArray(c.command)) {
			unregisterCommand(c.command[0]);
			commands[c.command[0]] = c;
			c.command.slice(1).forEach(function (cmd) {
				commandAliases[cmd] = c.command[0];
			});
		} else {
			unregisterCommand(c.command);
			commands[c.command] = c;
		}
		updateCommandList();
	}

	function unregisterCommand(cmd) {
		if (commands[cmd] === undefined)
			return;
		console.log("Removed "+cmd+" command");
		delete commands[cmd];
		Object.keys(commandAliases).forEach(function (entry) {
			if (commandAliases[entry] === cmd) {
				console.log("Removed command alias "+entry+" ("+cmd+")");
				delete commandAliases[entry];
			}
		});
		updateCommandList();
	}

	function updateCommandList() {
		commandList = Object.keys(commands).concat(Object.keys(commandAliases));
	}

	edgar.emitCommand = function emitCommand(c, input) {
		commands[c].callback(input);
	};

	edgar.emitEvent = function emit(e, input) {
		var i;
		if (events[e] !== undefined && events[e].length) {
			// console.log("Emitting event "+e+" to "+events[e].length+" listeners");
			for (i = 0; i < events[e].length; i++) {
				if (events[e][i].regex) {
					input.match = events[e][i].regex.exec(input.raw);
					if (input.match)
						events[e][i].callback(input);
					else
						delete input.match;
				} else {
					events[e][i].callback(input);
				}
			}
		}
	};

	edgar.commandNeedsAdmin = function commandNeedsAdmin(cmd) {
		if (edgar.isCommand(cmd)) {
			if (commandAliases[cmd])
				return commands[commandAliases[cmd]].admin || false;
			return commands[cmd].admin || false;
		}
		return false;
	};

	edgar.commandArglen = function commandArglen(cmd) {
		if (edgar.isCommand(cmd)) {
			if (commandAliases[cmd])
				return commands[commandAliases[cmd]].arglen || 0;
			return commands[cmd].arglen || 0;
		}
	};

	edgar.commandAlias = function commandAlias(cmd) {
		return commandAliases[cmd];
	};

	edgar.isCommandAlias = function isCommandAlias(cmd) {
		return Object.keys(commandAliases).indexOf(cmd) > -1;
	};

	edgar.cmdHelp = function cmdHelp(cmd, type) {
		var command = commandAliases[cmd] || cmd;
		if (!commands[command] || !commands[command][type])
			return;
		switch (type) {
		case "help":
			return "[Help] "+commands[command][type];
		case "syntax":
			return "[Help] Syntax: "+commands[command][type];
		case "options":
			return "[Help] Options: "+commands[command][type];
		default:
			console.error("Tried to get non-existant help type "+type+" for command "+command);
			return;
		}
	};
	edgar.commandList = function () {
		return Object.keys(commands); // not including command aliases in this
	};
	edgar.isCommand = function isCommand(cmd) {
		return commandList.indexOf(cmd) > -1;
	};
	edgar.event = function (e) {
		if (!objContains("event", e, [ "handle", "event", "callback" ]))
			return;
		registerEvent(e);
	};
	edgar.command = function (c) {
		if (!objContains("command", c, [ "command", "help", "callback" ]))
			return;
		registerCommand(c);
	};

	return edgar;
};
