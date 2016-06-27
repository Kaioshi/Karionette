// internal address list take 2. maintains both user/channel lists as "first class"
"use strict";

let Channel = require("./core/ial/channel.js"),
	User = require("./core/ial/user.js"),
	channels = {}, users = {}, ial;

globals.users = users;
globals.channels = channels;

// for fixing user input.
function findNickCase(nick) {
	let i, lnick, nicks;
	if (users[nick])
		return nick;
	nicks = Object.keys(users);
	for (i = 0, lnick = nick.toLowerCase(); i < nicks.length; i++)
		if (lnick === nicks[i].toLowerCase())
			return nicks[i];
}

function findChannelCase(ch) {
	let i, lch, chans;
	if (channels[ch])
		return ch;
	chans = Object.keys(channels);
	for (i = 0, lch = ch.toLowerCase(); i < chans.length; i++)
		if (lch === chans[i].toLowerCase())
			return chans[i];
}

function addChannel(chan) {
	if (channels[chan])
		delete channels[chan];
	channels[chan] = new Channel(chan);
}

function addUser(nick, userhost) {
	users[nick] = users[nick] || new User(nick, userhost);
}

function nickChange(oldnick, newnick) {	// update channel entries
	for (let i = 0, chans = Object.keys(channels); i < chans.length; i++)
		channels[chans[i]].updateNick(oldnick, newnick);
	// change user entries
	users[newnick] = users[oldnick];
	delete users[oldnick];
	users[newnick].nickChange(newnick);
}

function userJoined(ch, nick) {
	channels[ch].nicks.push(nick);
	users[nick].channels.push(ch);
}

function userLeft(ch, nick, uid) {
	if (nick === config.nick) { // purge it from users as well since we can't track them now.
		delete channels[ch];
		for (let i = 0, nicks = Object.keys(users); i < nicks.length; i++)
			users[nicks[i]].removeChannel(ch);
	} else {
		if (users[nick].uid === uid) {
			channels[ch].removeNick(nick);
			users[nick].removeChannel(ch);
			if (!users[nick].channels.length) // kill it, can't see them anymore
				delete users[nick];
		} else {
			logger.debug(`userLeft: uid didn't match (${ch}, ${nick}, ${uid})`);
		}
	}
}

function userQuit(nick, uid) { // KILL 'EM ALL
	// avoids a race condition with the quit timer when people nickchange before it's removed the stale entry
	if (users[nick].uid === uid) { // (nickchange removes entries too.)
		delete users[nick];
		for (let i = 0, chans = Object.keys(channels); i < chans.length; i++)
			channels[chans[i]].removeNick(nick);
	} else {
		logger.debug(`userQuit: uid didn't match (${nick}, ${uid})`);
	}
}

function Active(ch, seconds) {
	let now, active,
		nicks = Object.keys(channels[ch].active);
	if (!nicks.length)
		return [];
	active = [];
	now = Date.now();
	seconds = seconds || 600; // 10 minutes
	for (let i = 0; i < nicks.length; i++) {
		if (((now - channels[ch].active[nicks[i]])/1000) <= seconds)
			active.push(nicks[i]);
	}
	return active;
}

function getUser(nick) {
	let nickname;
	if ((nickname = findNickCase(nick)) !== undefined)
		return users[nickname];
}

function getChannel(ch) {
	let chan;
	if ((chan = findChannelCase(ch)) !== undefined)
		return channels[chan];
}

function getChannels() {
	return Object.keys(channels);
}

function getNicks() {
	return Object.keys(users);
}

function maskMatch(user, mask) {
	return new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i").test(user);
}

function maskSearch(mask, channel) {
	// returns a list of nicks that match the mask
	// only for channel if provided
	let i, nicks, ch, matches = [],
		regMask = new RegExp("^"+mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)")+"$", "i");
	if (channel)
		ch = findChannelCase(channel);
	for (i = 0, nicks = Object.keys(users); i < nicks.length; i++) {
		if (regMask.test(users[nicks[i]].fulluser)) {
			if (!ch) {
				matches.push(nicks[i]);
			} else if (users[nicks[i]].ison(ch)) {
				matches.push(nicks[i]);
			}
		}
	}
	return matches;
}

function regexSearch(reg, channel) { // TODO condense these two
	let i, nicks, ch, matches = [];
	if (channel)
		ch = findChannelCase(channel);
	for (i = 0, nicks = Object.keys(users); i < nicks.length; i++) {
		if (reg.test(users[nicks[i]].fulluser)) {
			if (!ch)
				matches.push(nicks[i]);
			else if (users[nicks[i]].ison(ch)) {
				matches.push(nicks[i]);
			}
		}
	}
	return matches;
}
ial = {
	addChannel: addChannel,
	addUser: addUser,
	userJoined: userJoined,
	userLeft: userLeft,
	userQuit: userQuit,
	nickChange: nickChange,
	Active: Active,
	User: getUser,
	Nicks: getNicks,
	Channel: getChannel,
	Channels: getChannels,
	maskMatch: maskMatch,
	maskSearch: maskSearch,
	regexSearch: regexSearch
};

plugin.declareGlobal("ial", "ial", ial);
