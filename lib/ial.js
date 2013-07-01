// internal address list helpers/managers.
ial = {
	Add: function (channel, nick, address) { 
		if (!globals.channels[channel]) globals.channels[channel] = {};
		if (!globals.channels[channel].users) globals.channels[channel].users = {};
		globals.channels[channel].users[nick] = { nick: nick, address: address };
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
			if (nick) {
				keys.forEach(function (item) {
					if (globals.channels[item].users[nick]) channels.push(item);
				});
			} else {
				keys.forEach(function (item) { channels.push(item); });
			}
		}
		if (channels.length > 0) return channels;
		return [];
	},
	Nicks: function (channel) {
		// shorthand for Object.keys(globals.channels[channel].users);
		if (channel && globals.channels[channel]) {
			return Object.keys(globals.channels[channel].users);
		}
		return [];
	},
	Channel: function (channel) {
		// shorthand for globals.channels[channel]
		if (globals.channels[channel]) {
			return globals.channels[channel];
		}
		return {};
	},
	ison: function (channel, nick) {
		if (channel && nick && globals.channels && globals.channels[channel].users[nick]) return true;
		return false;
	}
};

