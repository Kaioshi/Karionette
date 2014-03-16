"use strict";
// internal address list helpers/managers.

function expired(then, now) {
	if (((now - then)/1000) >= 600) return true;
}

global.ial = {
	Add: function (channel, nick, address) { 
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].users) globals.channels[channel].users = {};
		globals.channels[channel].users[nick] = {
			nick: nick,
			address: address,
			user: nick+"!"+address
		};
	},
	Remove: function (channel, nick) {
		if (!nick) delete globals.channels[channel];
		else {
			if (globals.channels[channel].users[nick]) {
				delete globals.channels[channel].users[nick];
			}
			this.removeActive(channel, nick);
		}
	},
	updateUser: function (channel, oldnick, newnick, address) {
		// manual delete rather than this.Remove(), since we don't want to run removeActive.
		if (globals.channels[channel].users[oldnick]) delete globals.channels[channel].users[oldnick];
		this.Add(channel, newnick, address);
		if (!globals.channels[channel].active) return;
		if (globals.channels[channel].active.length === 0) return;
		globals.channels[channel].active = globals.channels[channel].active.map(function (user) {
			if (user === oldnick) {
				return newnick;
			}
			return user;
		});
	},
	Channels: function (nick) {
		// if nick is supplied, returns a list of channels we share with them
		// otherwise returns a list of all channels we're in.
		var keys = Object.keys(globals.channels),
			channels = [];
		if (keys.length > 0) {
			if (!nick) return keys;
			keys.forEach(function (item) {
				if (globals.channels[item].users[nick]) channels.push(item);
			});
		}
		return channels;
	},
	Nicks: function (channel) {
		// shorthand for Object.keys(globals.channels[channel].users);
		if (channel && globals.channels[channel]) {
			return Object.keys(globals.channels[channel].users);
		}
	},
	Channel: function (channel) {
		// shorthand for globals.channels[channel]
		if (channel && globals.channels[channel]) {
			return globals.channels[channel];
		}
	},
	User: function (nick, channel) {
		// shorthand for globals.channels[channel].users[nick]
		var keys, i;
		if (globals.channels[channel].users) {
			keys = Object.keys(globals.channels[channel].users);
			for (i = 0; i < keys.length; i++) {
				if (keys[i].toLowerCase() === nick.toLowerCase()) {
					return globals.channels[channel].users[keys[i]];
				}
			}
		}
	},
	Active: function (channel) {
		// returns a list of people who have spoken in the last 10 minutes
		// remove actives if they're over 10 minutes old - only if we haven't checked in the last 10 minutes
		// if noone has spoken for 10 minutes (and thus triggered the check), noone is active anyway.
		var now;
		if (channel[0] !== "#") return [];
		
		now = new Date().getTime();
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].lastActiveCheck) globals.channels[channel].lastActiveCheck = now;
		if (expired(globals.channels[channel].lastActiveCheck, now) || !globals.channels[channel].active) {
			globals.channels[channel].lastActiveCheck = now;
			this.updateActive(channel);
		}
		return globals.channels[channel].active || [];
	},
	addActive: function (channel, from, time) {
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].active) globals.channels[channel].active = [];
		if (!globals.channels[channel].users) globals.channels[channel].users = {};
		if (!globals.channels[channel].users[from]) globals.channels[channel].users[from] = {};
		if (!globals.channels[channel].active.some(function (entry) { return (entry === from); })) {
			globals.channels[channel].active.push(from);
		}
		globals.channels[channel].users[from].active = time;
	},
	removeActive: function (channel, nick) {
		if (globals.channels[channel].active && globals.channels[channel].active.length > 0) {
			globals.channels[channel].active = globals.channels[channel].active.filter(function (item) {
				return (item !== nick);
			});
			if (globals.channels[channel].active.length === 0) delete globals.channels[channel].active;
		}
	},
	updateActive: function (channel) {
		var time = new Date().getTime();
		globals.channels[channel].active = [];
		Object.keys(globals.channels[channel].users).forEach(function (user) {
			if (globals.channels[channel].users[user].active) {
				if (expired(globals.channels[channel].users[user].active, time)) {
					delete globals.channels[channel].users[user].active;
				} else {
					globals.channels[channel].active.push(user);
				}
			}
		});
	},
	maskSearch: function (mask, channel) {
		// returns a list of nicks that match the mask
		// only for channel if provided
		var chans, i, k, done, matches = [];
		if (mask) {
			mask = mask.replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)");
			if (channel && globals.channels[channel].users) {
				Object.keys(globals.channels[channel].users).forEach(function (nick) { 
					if (globals.channels[channel].users[nick].user.match(mask)) matches.push(nick);
				});
			} else {
				chans = Object.keys(globals.channels);
				for (i = 0; i < chans.length; i++) {
					Object.keys(globals.channels[chans[i]].users).forEach(function (nick) {
						if (globals.channels[chans[i]].users[nick].user.match(mask)) {
							// make sure it's not in the list already
							for (k = 0; k <= matches.length; k++) {
								if (matches[k] === nick) done = true;
							}
							if (!done) matches.push(nick);
						}
					});
				}
			}
			return matches;
		}
	},
	ison: function (channel, nick) {
		var ret = false;
		if (channel && nick && globals.channels && globals.channels[channel] && globals.channels[channel].users) {
			nick = nick.toLowerCase();
			Object.keys(globals.channels[channel].users).forEach(function (user) {
				if (user.toLowerCase() === nick) ret = true;
			});
		}
		return ret;
	},
	maskMatch: function (user, mask) {
		var reg;
		if (user && mask) {
			reg = new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i");
			if (user.match(reg)) {
				return true;
			}
		}
		return false;
	},
	toMask: function (user) {
		// thanks deide~
		var matches, mask, isIPv6, isHost, host;
		if (user && user.indexOf('@') > -1) {
			matches = /([^ ]+)!~?([^ ]+)@([^ ]+)/.exec(user);
			mask = matches[1]+"!*"+matches[2].slice(1);
			isIPv6 = (matches[3].indexOf(':') > -1);
			isHost = /[a-zA-Z]+/.exec(matches[3]);
			// IPv6 is scary.
			if (isIPv6) {
				return mask+"@"+matches[3];
			}
			// 89735.host.org or host.org
			if (isHost) {
				host = matches[3].split('.');
				if (host.length === 2) return mask+"@"+matches[3];
				return mask+"@*."+host[host.length-2]+"."+host[host.length-1];
			}
			// 203.0.178.191
			return mask+"@"+matches[3].slice(0, matches[3].lastIndexOf("."))+".*";
		} else {
			logger.warn("ial.toMask("+user+") called improperly.");
			return "Your!Dad@really.likes.pancakes.com";
		}
	}
};

