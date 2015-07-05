"use strict";
// internal address list helpers/managers.
module.exports = function (lib) {
	var ial = {};

	function expired(then, now) {
		if (((now - then)/1000) >= 600) return true;
	}

	return {
		Add: function (channel, nick, address) {
			if (!ial[channel]) ial[channel] = {};
			if (!ial[channel].users) ial[channel].users = {};
			ial[channel].users[nick] = {
				nick: nick,
				address: address,
				user: nick+"!"+address
			};
		},
		Remove: function (channel, nick) {
			if (!nick) delete ial[channel];
			else {
				if (ial[channel].users[nick]) {
					delete ial[channel].users[nick];
				}
				this.removeActive(channel, nick);
			}
		},
		updateUser: function (channel, oldnick, newnick, address) {
			// manual delete rather than this.Remove(), since we don't want to run removeActive.
			if (ial[channel].users[oldnick])
				delete ial[channel].users[oldnick];
			this.Add(channel, newnick, address);
			if (!ial[channel].active)
				return;
			if (ial[channel].active.length === 0)
				return;
			ial[channel].active = ial[channel].active.map(function (user) {
				if (user === oldnick) {
					return newnick;
				}
				return user;
			});
		},
		Channels: function (nick) {
			// if nick is supplied, returns a list of channels we share with them
			// otherwise returns a list of all channels we're in.
			var keys = Object.keys(ial), channels, i;
			if (keys.length) {
				if (!nick)
					return keys;
				for (i = 0, channels = []; i < keys.length; i++) {
					if (lib.hasElement(Object.keys(ial[keys[i]].users), nick))
						channels.push(keys[i]);
				}
			}
			return channels;
		},
		Nicks: function (channel) {
			// shorthand for Object.keys(ial[channel].users);
			if (!channel)
				return;
			channel = channel.toLowerCase();
			if (ial[channel]) {
				return Object.keys(ial[channel].users);
			}
		},
		Channel: function (channel) {
			// shorthand for ial[channel]
			if (!channel)
				return;
			channel = channel.toLowerCase();
			if (ial[channel]) {
				return ial[channel];
			}
		},
		User: function (nick, channel) {
			// shorthand for ial[channel].users[nick]
			var lnick, keys, i;
			if (!nick || !channel)
				return;
			channel = channel.toLowerCase(); lnick = nick.toLowerCase();
			if (ial[channel] && ial[channel].users) {
				keys = Object.keys(ial[channel].users);
				for (i = 0; i < keys.length; i++) {
					if (keys[i].toLowerCase() === lnick)
						return ial[channel].users[keys[i]];
				}
			}
		},
		Active: function Active(channel) {
			// returns a list of people who have spoken in the last 10 minutes
			// remove actives if they're over 10 minutes old - only if we haven't checked in the last 10 minutes
			// if noone has spoken for 10 minutes (and thus triggered the check), noone is active anyway.
			var now;
			if (channel[0] !== "#")
				return [];

			now = Date.now();
			ial[channel] = ial[channel] || {};
			ial[channel].lastActiveCheck = ial[channel].lastActiveCheck || now;
			if (expired(ial[channel].lastActiveCheck, now) || !ial[channel].active) {
				ial[channel].lastActiveCheck = now;
				this.updateActive(channel);
			}
			return ial[channel].active || [];
		},
		addActive: function addActive(channel, from, time) {
			ial[channel] = ial[channel] || {};
			ial[channel].active = ial[channel].active || [];
			ial[channel].users = ial[channel].users || {};
			ial[channel].users[from] = ial[channel].users[from] || {};
			if (!lib.hasElement(ial[channel].active, from))
				ial[channel].active.push(from);
			ial[channel].users[from].active = time;
		},
		removeActive: function removeActive(channel, nick) {
			if (ial[channel].active && ial[channel].active.length) {
				ial[channel].active = ial[channel].active.filter(function (item) {
					return (item !== nick);
				});
				if (ial[channel].active.length === 0) delete ial[channel].active;
			}
		},
		updateActive: function updateActive(channel) {
			ial[channel].active = [];
			Object.keys(ial[channel].users).forEach(function (user) {
				if (ial[channel].users[user].active) {
					if (expired(ial[channel].users[user].active, Date.now())) {
						delete ial[channel].users[user].active;
					} else {
						ial[channel].active.push(user);
					}
				}
			});
		},
		maskSearch: function maskSearch(mask, channel) {
			// returns a list of nicks that match the mask
			// only for channel if provided
			var matches;
			matches = [];
			mask = new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i");
			if (channel) {
				channel = channel.toLowerCase();
				if (ial[channel] && ial[channel].users) {
					Object.keys(ial[channel].users).forEach(function (nick) {
						if (mask.test(ial[channel].users[nick].user))
							matches.push(nick);
					});
				}
			} else {
				Object.keys(ial).forEach(function (chan) {
					Object.keys(ial[chan].users).forEach(function (nick) {
						if (mask.test(ial[chan].users[nick].user) && !lib.hasElement(matches, nick))
							matches.push(nick);
					});
				});
			}
			return matches;
		},
		ison: function (channel, nick) {
			if (!channel || !nick)
				return false;
			return lib.hasElement(Object.keys(ial[channel].users), nick);
		},
		maskMatch: function (user, mask) {
			if (!user || !mask)
				return false;
			return new RegExp(mask.trim().replace(/\./g, "\\.").replace(/\?/g, ".").replace(/\*/g, "([^ ]+|)"), "i").test(user);
		},
		toMask: function (user) {
			// thanks deide~
			var matches, mask, isIPv6, isHost, host;
			if (user && user.indexOf("@") > -1) {
				matches = /([^ ]+)!~?([^ ]+)@([^ ]+)/.exec(user);
				mask = matches[1]+"!*"+matches[2].slice(1);
				isIPv6 = (matches[3].indexOf(":") > -1);
				isHost = /[a-zA-Z]+/.exec(matches[3]);
				// IPv6 is scary.
				if (isIPv6) {
					return mask+"@"+matches[3];
				}
				// 89735.host.org or host.org
				if (isHost) {
					host = matches[3].split(".");
					if (host.length === 2) return mask+"@"+matches[3];
					return mask+"@*."+host[host.length-2]+"."+host[host.length-1];
				}
				// 203.0.178.191
				return mask+"@"+matches[3].slice(0, matches[3].lastIndexOf("."))+".*";
			} else {
				return "Your!Dad@really.likes.pancakes.com";
			}
		}
	};
};
