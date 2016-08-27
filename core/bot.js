"use strict";

class Bot {
	constructor() {
		this._events = Object.create(null);
		this._commands = Object.create(null);
		this._commandAliases = Object.create(null);
		this._commandList = [];
	}
	_updateCommandList() {
		this._commandList = Object.keys(this._commands).concat(Object.keys(this._commandAliases));
	}
	_removeCommand(cmd) {
		if (!this._commands[cmd])
			return;
		this._commands[cmd] = null;
		delete this._commands[cmd];
		for (const command in this._commandAliases)
			if (this._commandAliases[command] === cmd)
				delete this._commandAliases[command];
	}
	_removeEvent(type, handle) {
		this._events[type][handle] = null;
		delete this._events[type][handle];
	}

	commandArglen(cmd) {
		if (this.cmdExists(cmd)) {
			if (this._commandAliases[cmd])
				return this._commands[this._commandAliases[cmd]].arglen || 0;
			return this._commands[cmd].arglen || 0;
		}
	}
	cmdHelp(cmd, type) {
		const command = this._commandAliases[cmd] || cmd;
		if (!this._commands[command] || !this._commands[command][type])
			return;
		switch (type) {
			case "help": return "[Help] "+this._commands[command][type];
			case "syntax": return "[Help] Syntax: "+this._commands[command][type];
			default: return;
		}
	}
	commandNeedsAdmin(cmd) {
		if (!this.cmdExists(cmd))
			return false;
		if (this.isCommandAlias(cmd))
			return this._commands[this._commandAliases[cmd]].admin || false;
		return this._commands[cmd].admin || false;
	}
	isCommandAlias(cmd) { return this._commandAliases[cmd] !== undefined; }
	commandAlias(cmd) { return this._commandAliases[cmd]; }
	cmdExists(cmd) { return this._commandList.includes(cmd); }
	cmdList() { return Object.keys(this._commands); } // not including aliases
	hasEvent(eventHandle) { return this._events[eventHandle] !== undefined; }
	event(ev) {
		if (!ev.event || !ev.handle || !ev.callback)
			throw new Error("Events need to contain at least event, handle and callback elements.");
		this._events[ev.event] = this._events[ev.event] || Object.create(null);
		if (this._events[ev.event][ev.handle])
			this._removeEvent(ev.event, ev.handle);
		if (ev.once) {
			ev.cb = ev.callback;
			ev.callback = input => {
				this._removeEvent(ev.event, ev.handle);
				ev.cb(input);
			};
		}
		this._events[ev.event][ev.handle] = ev;
	}
	command(cmd) {
		if (!cmd.command || !cmd.help || !cmd.callback)
			throw new Error("Commands need to contain at least command, help and callback elements.");
		if (Array.isArray(cmd.command)) {
			this._removeCommand(cmd.command[0]);
			this._commands[cmd.command[0]] = cmd;
			cmd.command.slice(1).forEach(commandAlias => this._commandAliases[commandAlias] = cmd.command[0]);
		} else {
			this._removeCommand(cmd.command);
			this._commands[cmd.command] = cmd;
		}
		this._updateCommandList();
	}
	emitCommand(cmd, input) {
		if (this._commands[cmd])
			this._commands[cmd].callback(input);
	}
	emitEvent(type, input) {
		if (!this._events[type])
			return;
		for (const handle in this._events[type]) {
			const event = this._events[type][handle];
			if (event.condition === undefined || event.condition(input)) {
				if (!event.regex)
					event.callback(input);
				else {
					const match = event.regex.exec(input.raw);
					if (match) {
						input.match = match;
						event.callback(input);
					}
				}
			}
		}
	}
}

plugin.global("bot", new Bot());
