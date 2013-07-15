// internal address list helpers/managers.
ial = {
	Add: function (channel, nick, address) { 
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].users) globals.channels[channel].users = {};
		globals.channels[channel].users[nick] = { nick: nick, address: address, user: nick+"!"+address };
	},
	Remove: function (channel, nick) {
		if (!nick) delete globals.channels[channel];
		else {
			if (globals.channels[channel].users[nick]) {
				delete globals.channels[channel].users[nick];
			}
		}
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
		if (channel && globals.channels && globals.channels[channel]) {
			return Object.keys(globals.channels[channel].users);
		}
	},
	Channel: function (channel) {
		// shorthand for globals.channels[channel]
		if (channel && globals.channels && globals.channels[channel]) {
			return globals.channels[channel];
		}
	},
	User: function (nick, channel) {
		// shorthand for globals.channels[channel].users[nick]
		if (globals.channels[channel].users) {
			var keys = Object.keys(globals.channels[channel].users);
			for (var i = 0; i < keys.length; i++) {
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
		var active = [],
			now = new Date().getTime();
		if (!globals.channels) globals.channels = {};
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].lastActiveCheck) globals.channels[channel].lastActiveCheck = now;
		if (expired(globals.channels[channel].lastActiveCheck, now)) {
			globals.channels[channel].lastActiveCheck = now;
			Object.keys(globals.channels[channel].users).forEach(function (user) {
				if (globals.channels[channel].users[user].active) {
					if (expired(globals.channels[channel].users[user].active[1], now)) {
						delete globals.channels[channel].users[user].active;
					}
				}
			});
		}
		Object.keys(globals.channels[channel].users).forEach(function (user) {
			if (globals.channels[channel].users[user].active) {
				active.push(user);
			}
		});
		return active;
		
		function expired(then, now) {
			if (((now - then)/1000) > 600) return true;
		}
	},
	addActive: function (channel, from, message, time) {
		if (!globals.channels) globals.channels = {};
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].users) globals.channels[channel].users = {};
		if (!globals.channels[channel].users[from]) globals.channels[channel].users[from] = {};
		globals.channels[channel].users[from].active = [ message, time ];
	},
	maskSearch: function (mask, channel) {
		// returns a list of nicks that match the mask
		// only for channel if provided
		var matches = [];
		if (mask) {
			var mask = mask.replace(/\?/g, ".").replace(/\*/g, "[^ ]+");
			if (channel && globals.channels[channel].users) {
				Object.keys(globals.channels[channel].users).forEach(function (nick) { 
					if (globals.channels[channel].users[nick].user.match(mask)) matches.push(nick);
				});
			} else {
				var chans = Object.keys(globals.channels);
				for (var i = 0; i < chans.length; i++) {
					Object.keys(globals.channels[chans[i]].users).forEach(function (nick) {
						if (globals.channels[chans[i]].users[nick].user.match(mask)) {
							// make sure it's not in the list already
							for (var k = 0; k <= matches.length; k++) {
								if (matches[k] === nick) var done = 1;
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
		if (user && mask) {
			var reg = new RegExp(mask.trim().replace(/\?/g, ".").replace(/\*/g, "[^ ]+"), "i");
			if (user.match(reg)) {
				return true;
			}
		}
		return false;
	},
	toMask: function (user) {
		// thanks deide~
		if (user && user.indexOf('@') > -1) {
			var match = /([^ ]+)!~?([^ ]+)@([^ ]+)/.exec(user),
				mask = match[1]+"!*"+match[2].slice(1),
				isIPv6 = (match[3].indexOf(':') > -1),
				isHost = /[a-zA-Z]+/.exec(match[3]);
			// IPv6 is scary.
			if (isIPv6) {
				return mask+"@"+match[3];
			}
			// 89735.host.org or host.org
			if (isHost) {
				var host = match[3].split('.');
				if (host.length === 2) return mask+"@"+match[3];
				return mask+"@*."+host[host.length-2]+"."+host[host.length-1];
			}
			// 203.0.178.191
			return mask+"@"+match[3].slice(0, match[3].lastIndexOf("."))+".*";
		} else {
			logger.warn("ial.toMask("+user+") called improperly.");
			return "Your!Dad@really.likes.pancakes.com";
		}
	}
};

