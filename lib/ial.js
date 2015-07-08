// internal address list take 2. maintains both user/channel lists as "first class"
"use strict";

module.exports = function (config) {
	var Channel = require("./ial/channel.js"),
		User = require("./ial/user.js"),
		channels = {}, users = {};

	// for fixing user input.
	function findNickCase(nick) {
		var i, lnick, nicks;
		if (users[nick])
			return nick;
		nicks = Object.keys(users);
		for (i = 0, lnick = nick.toLowerCase(); i < nicks.length; i++)
			if (lnick === nicks[i].toLowerCase())
				return nicks[i];
	}

	function findChannelCase(ch) {
		var i, lch, chans;
		if (channels[ch])
			return ch;
		chans = Object.keys(channels);
		for (i = 0, lch = ch.toLowerCase(); i < chans.length; i++)
			if (lch === chans[i].toLowerCase())
				return chans[i];
	}

	function addChannel(chan) {
		channels[chan] = channels[chan] || new Channel(chan);
	}

	function addUser(nick, userhost) {
		users[nick] = users[nick] || new User(nick, userhost);
		globals.lastUsers = users;
		globals.lastChans = channels;
	}

	function nickChange(oldnick, newnick) {
		var i, chans;
		// update channel entries
		for (i = 0, chans = Object.keys(channels); i < chans.length; i++)
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

	function userLeft(ch, nick) {
		var i, nicks;
		if (nick === config.nick) { // purge it from users as well since we can't track them now.
			delete channels[ch];
			for (i = 0, nicks = Object.keys(users); i < nicks.length; i++)
				users[nicks[i]].removeChannel(ch);
		} else {
			channels[ch].removeNick(nick);
			users[nick].removeChannel(ch);
			if (!users[nick].channels.length) // kill it, can't see them anymore
				delete users[nick];
		}
	}

	function userQuit(nick) { // KILL 'EM ALL
		var i, chans = Object.keys(channels);
		delete users[nick];
		for (i = 0; i < chans.length; i++)
			channels[chans[i]].removeNick(nick);
	}

	function Active(ch, seconds) {
		var i, now = Date.now(), active = [],
			nicks = Object.keys(channels[ch].active);
		if (!nicks.length)
			return [];
		seconds = seconds || 600; // 10 minutes
		for (i = 0; i < nicks.length; i++) {
			if (((now - channels[ch].active[nicks[i]])/1000) <= seconds)
				active.push(nicks[i]);
		}
		return active;
	}

	function getUser(nick) {
		var nickname;
		if ((nickname = findNickCase(nick)) !== undefined)
			return users[nickname];
	}

	function getChannel(ch) {
		var chan;
		if ((chan = findChannelCase(ch)) !== undefined)
			return channels[chan];
	}

	function getChannels() {
		return Object.keys(channels);
	}

	function maskMatch(user, mask) {
		return new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i").test(user);
	}

	function maskSearch(mask, channel) {
		// returns a list of nicks that match the mask
		// only for channel if provided
		var i, nicks, ch, matches = [],
			regMask = new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i");
		if (channel)
			ch = findChannelCase(channel);
		for (i = 0, nicks = Object.keys(users); i < nicks.length; i++)
			if (regMask.test(users[nicks[i]].fulluser)) {
				if (!ch) {
					matches.push(nicks[i]);
				} else if (users[nicks[i]].ison(ch)) {
					matches.push(nicks[i]);
				}
			}
		return matches;
	}

	return {
		addChannel: addChannel,
		addUser: addUser,
		userJoined: userJoined,
		userLeft: userLeft,
		userQuit: userQuit,
		nickChange: nickChange,
		Active: Active,
		User: getUser,
		Channel: getChannel,
		Channels: getChannels,
		maskMatch: maskMatch,
		maskSearch: maskSearch
	};
};
