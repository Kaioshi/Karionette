"use strict";

// commandList is kept up to date so that we don't have to Object.keys(commands)
// every time a command is attempted.
let bot = {}, events = {}, commandList = [], commands = {}, commandAliases = {};

function objContains(obj, items) {
	for (let i = 0; i < items.length; i++) {
		if (obj[items[i]] === undefined)
			return false;
	}
	return true;
}

function hasEvent(e) {
	return events[e] !== undefined;
}

function eventsIndexOf(trigger, handle) {
	if (events[trigger] === undefined)
		return -1;
	for (let i = 0; i < events[trigger].length; i++) {
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
	let index = eventsIndexOf(trigger, handle);
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

function emitCommand(c, input) {
	if (commands[c])
		commands[c].callback(input);
}

function emitEvent(e, input) {
	if (events[e] === undefined || !events[e].length)
		return;
	for (let i = 0; i < events[e].length; i++) {
		if (events[e][i].condition === undefined || events[e][i].condition(input)) {
			if (events[e][i].regex) {
				let match = events[e][i].regex.exec(input.raw);
				if (match) {
					input.match = match;
					events[e][i].callback(input);
				}
			} else {
				events[e][i].callback(input);
			}
			if (events[e][i].once)
				unregisterEvent(events[e][i].event, events[e][i].handle);
		}
	}
}

function commandNeedsAdmin(cmd) {
	if (bot.cmdExists(cmd)) {
		if (commandAliases[cmd])
			return commands[commandAliases[cmd]].admin || false;
		return commands[cmd].admin || false;
	}
	return false;
}

function commandArglen(cmd) {
	if (bot.cmdExists(cmd)) {
		if (commandAliases[cmd])
			return commands[commandAliases[cmd]].arglen || 0;
		return commands[cmd].arglen || 0;
	}
}

function commandAlias(cmd) {
	return commandAliases[cmd];
}

function isCommandAlias(cmd) {
	return Object.keys(commandAliases).indexOf(cmd) > -1;
}

function cmdHelp(cmd, type) {
	let command = commandAliases[cmd] || cmd;
	if (!commands[command] || !commands[command][type])
		return;
	switch (type) {
	case "help": return "[Help] "+commands[command][type];
	case "syntax": return "[Help] Syntax: "+commands[command][type];
	case "options": return "[Help] Options: "+commands[command][type];
	default: return;
	}
}

function cmdList() {
	return Object.keys(commands); // not including command aliases in this
}

function cmdExists(cmd) {
	return commandList.indexOf(cmd) > -1;
}

function event(e) {
	if (!objContains(e, [ "handle", "event", "callback" ]))
		return;
	registerEvent(e);
}

function command(c) {
	if (!objContains(c, [ "command", "help", "callback" ]))
		return;
	registerCommand(c);
}

bot.emitEvent = emitEvent;
bot.commandNeedsAdmin = commandNeedsAdmin;
bot.commandArglen = commandArglen;
bot.commandAlias = commandAlias;
bot.isCommandAlias = isCommandAlias;
bot.cmdHelp = cmdHelp;
bot.cmdList = cmdList;
bot.cmdExists = cmdExists;
bot.event = event;
bot.command = command;
bot.hasEvent = hasEvent;
bot.emitCommand = emitCommand;

plugin.declareGlobal("bot", "bot", bot); // this is a problem~
