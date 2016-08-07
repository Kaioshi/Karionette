// internal address list take 2. maintains both user/channel lists as "first class"
"use strict";

const listTypes = [ "nicks", "opped", "halfopped", "voiced", "ircop" ];
let uidCounter = 0;

class Channel {
	constructor(ch) {
		this.channel = ch;
		this.nicks = [];
		this.opped = [];
		this.voiced = [];
		this.halfopped = [];
		this.ircop = [];
		this.active = {};
	}
	isop(nick) { return this.opped.includes(nick); }
	isvoice(nick) { return this.voiced.includes(nick); }
	ishalfop(nick) { return this.halfopped.includes(nick); }
	isircop(nick) { return this.ircop.includes(nick); }
	setActive(nick) { this.active[nick] = Date.now(); }
	giveStatus(status, nick) {
		if (!this[status].includes(nick))
			this[status].push(nick);
	}
	removeStatus(status, nick) {
		const index = this[status].indexOf(nick);
		if (index > -1)
			this[status].splice(index, 1);
	}
	addNick(nick) {
		if (!this.nicks.includes(nick))
			this.nicks.push(nick);
	}
	removeNick(nick) {
		for (let i = 0; i < listTypes.length; i++) {
			const index = this[listTypes[i]].indexOf(nick);
			if (index > -1)
				this[listTypes[i]].splice(index, 1);
		}
		if (this.active[nick])
			delete this.active[nick];
	}
	updateNick(oldnick, newnick) {
		for (let i = 0; i < listTypes.length; i++) {
			const index = this[listTypes[i]].indexOf(oldnick);
			if (index > -1)
				this[listTypes[i]][index] = newnick;
		}
		if (this.active[oldnick]) {
			this.active[newnick] = this.active[oldnick];
			delete this.active[oldnick];
		}
	}
}

class User {
	constructor(nick, userhost) {
		this.nick = nick;
		this.userhost = userhost;
		this.fulluser = nick+"!"+userhost;
		this.username = userhost.slice(0, userhost.indexOf("@"));
		this.hostname = userhost.slice(userhost.indexOf("@")+1);
		this.channels = [];
		this.uid = ++uidCounter;
	}
	nickChange(newnick) {
		this.nick = newnick;
		this.fulluser = newnick+"!"+this.userhost;
	}
	ison(channel) {
		const lch = channel.toLowerCase();
		for (let i = 0; i < this.channels.length; i++)
			if (this.channels[i].toLowerCase() === lch)
				return true;
		return false;
	}
	removeChannel(ch) {
		const index = this.channels.indexOf(ch);
		if (index > -1)
			this.channels.splice(index, 1);
	}
	addChannel(ch) {
		if (!this.channels.includes(ch))
			this.channels.push(ch);
	}
}

class IAL {
	constructor() {
		this.channels = Object.create(null);
		this.users = Object.create(null);
	}
	// for fixing user input.
	_findNickCase(nick) {
		if (this.users[nick])
			return nick;
		const lnick = nick.toLowerCase();
		for (const nickname in this.users) {
			if (lnick === nickname.toLowerCase())
				return nickname;
		}
	}
	_findChannelCase(ch) {
		if (this.channels[ch])
			return ch;
		const lch = ch.toLowerCase();
		for (const chan in this.channels) {
			if (lch === chan.toLowerCase())
				return chan;
		}
	}
	addChannel(chan) {
		if (this.channels[chan])
			delete this.channels[chan];
		this.channels[chan] = new Channel(chan);
	}
	addUser(nick, userhost) { this.users[nick] = this.users[nick] || new User(nick, userhost); }
	nickChange(oldnick, newnick) {	// update channel entries
		for (const ch in this.channels)
			this.channels[ch].updateNick(oldnick, newnick);
		// change user entries
		this.users[newnick] = this.users[oldnick];
		delete this.users[oldnick];
		this.users[newnick].nickChange(newnick);
	}
	userJoined(ch, nick) {
		this.channels[ch].nicks.push(nick);
		this.users[nick].channels.push(ch);
	}
	userLeft(ch, nick, uid) {
		if (nick === config.nick) { // purge it from users as well since we can't track them now.
			delete this.channels[ch];
			for (const nickname in this.users)
				this.users[nickname].removeChannel(ch);
		} else {
			if (this.users[nick].uid === uid) {
				this.channels[ch].removeNick(nick);
				this.users[nick].removeChannel(ch);
				if (!this.users[nick].channels.length) // kill it, can't see them anymore
					delete this.users[nick];
			} else {
				logger.debug(`userLeft: uid didn't match (${ch}, ${nick}, ${uid})`);
			}
		}
	}
	// TODO figure out a smarter way to ensure things are done in order. not Promises
	userQuit(nick, uid) { // KILL 'EM ALL
		// avoids a race condition with the quit timer when people nickchange before it's removed the stale entry
		if (this.users[nick].uid === uid) { // (nickchange removes entries too.)
			delete this.users[nick];
			for (const ch in this.channels)
				this.channels[ch].removeNick(nick);
		} else {
			logger.debug(`userQuit: uid didn't match (${nick}, ${uid})`);
		}
	}
	Active(ch, seconds=600) {
		const active = [], now = Date.now();
		for (const nick in this.channels[ch].active)
			if (((now - this.channels[ch].active[nick])/1000) <= seconds)
				active.push(nick);
		return active;
	}
	User(nick) {
		const nickname = this._findNickCase(nick);
		if (nickname !== undefined)
			return this.users[nickname];
	}
	Channel(ch) {
		const chan = this._findChannelCase(ch);
		if (chan !== undefined)
			return this.channels[chan];
	}
	Channels() { return Object.keys(this.channels); }
	Nicks() { return Object.keys(this.users); }
	maskMatch(user, mask) { return new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i").test(user); }
	// returns a list of nicks that match the mask, only for channel if provided
	maskSearch(mask, channel) {
		let ch;
		if (channel)
			ch = this._findChannelCase(channel);
		const matches = [],
			regMask = new RegExp("^"+mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)")+"$", "i");
		for (const nick in this.users) {
			if (regMask.test(this.users[nick].fulluser)) {
				if (!ch) // don't combine these,
					matches.push(nick);
				else if (this.users[nick].ison(ch))
					matches.push(nick);
			}
		}
		return matches;
	}
	regexSearch(reg, channel) { // TODO condense these two
		let ch;
		if (channel)
			ch = this._findChannelCase(channel);
		const matches = [];
		for (const nick in this.users) {
			if (reg.test(this.users[nick].fulluser)) {
				if (!ch)
					matches.push(nick);
				else if (this.users[nick].ison(ch))
					matches.push(nick);
			}
		}
		return matches;
	}
}

plugin.export("ial", new IAL());
