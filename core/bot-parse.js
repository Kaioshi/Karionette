"use strict";
/**
 * couldn't think of a name other than "events", which is taken globally. Edgar it is.
 * events["PRIVMSG"] -> [ { handle: foo, cb: callback() }, ... ]
 * commands["say"] -> { help, syntax, callback }
 * commandAliases["echo"] -> "say"
 */

module.exports = function (EventEmitter) {
	// commandList is kept up to date so that we don't have to Object.keys(commands)
	// every time a command is attempted.
	var edgar = {}, events = {}, commandList = [], commands = {}, commandAliases = {};

	function objContains(obj, items) {
		for (let i = 0; i < items.length; i++) {
			if (obj[items[i]] === undefined)
				return false;
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
		unregisterEvent(e.event, e.handle); // There Can Be Only Juan
		events[e.event] = events[e.event] || [];
		events[e.event].push(e);
	}

	function unregisterEvent(trigger, handle) {
		var index = eventsIndexOf(trigger, handle);
		if (index > -1)
			events[trigger].splice(index, 1);
	}

	function registerCommand(c) {
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
		delete commands[cmd];
		Object.keys(commandAliases).forEach(function (entry) {
			if (commandAliases[entry] === cmd)
				delete commandAliases[entry];
		});
		updateCommandList();
	}

	function updateCommandList() {
		commandList = Object.keys(commands).concat(Object.keys(commandAliases));
	}

	function runRegexEvent(e, input) {
		var match = e.regex.exec(input.raw);
		if (match) {
			input.match = match;
			e.callback(input);
		}
	}

	edgar.emitCommand = function emitCommand(c, input) {
		commands[c].callback(input);
	};

	edgar.emitEvent = function emit(e, input) {
		var i;
		if (events[e] !== undefined && events[e].length) {
			for (i = 0; i < events[e].length; i++) {
				if (events[e][i].condition === undefined || events[e][i].condition(input)) {
					if (events[e][i].regex)
						runRegexEvent(events[e][i], input);
					else
						events[e][i].callback(input);
				}
			}
		}
	};
	
	// this is just a relay to things I don't want to pull all of edgar to get to.
	// EventEmitter.emit("Event", { event: "event Name", input: args })
	EventEmitter.on("Event", function (e) {
		if (e && e.event && typeof e.event === "string") {
			if (e.input)
				edgar.emitEvent("Event "+e.event, e.input);
			else
				edgar.emitEvent(e.event);
		} else {
			console.log(new Date().toLocaleTimeString()+" invalid event sent to edgar", e);
		}
	});

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

	edgar.commandHelp = function commandHelp(cmd, type) {
		var command = commandAliases[cmd] || cmd;
		if (!commands[command] || !commands[command][type])
			return;
		switch (type) {
		case "help": return "[Help] "+commands[command][type];
		case "syntax": return "[Help] Syntax: "+commands[command][type];
		case "options": return "[Help] Options: "+commands[command][type];
		default: return;
		}
	};
	edgar.commandList = function () {
		return Object.keys(commands); // not including command aliases in this
	};
	edgar.isCommand = function isCommand(cmd) {
		return commandList.indexOf(cmd) > -1;
	};
	edgar.event = function (e) {
		if (!objContains(e, [ "handle", "event", "callback" ]))
			return;
		registerEvent(e);
	};
	edgar.command = function (c) {
		if (!objContains(c, [ "command", "help", "callback" ]))
			return;
		registerCommand(c);
	};

	return edgar;
};
