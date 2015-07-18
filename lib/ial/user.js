"use strict";

module.exports = (function () {
	var uidCounter = 0;

	function User(nick, userhost) {
		this.nick = nick;
		this.userhost = userhost;
		this.fulluser = nick+"!"+userhost;
		this.username = userhost.slice(0, userhost.indexOf("@"));
		this.hostname = userhost.slice(userhost.indexOf("@")+1);
		this.channels = [];
		this.uid = ++uidCounter;
	}

	User.prototype.nickChange = function nickChange(newnick) {
		this.nick = newnick;
		this.fulluser = newnick+"!"+this.userhost;
	};

	User.prototype.ison = function ison(channel) {
		var lch = channel.toLowerCase, i;
		for (i = 0; i < this.channels.length; i++)
			if (this.channels[i].toLowerCase() === lch)
				return true;
		return false;
	};

	User.prototype.removeChannel = function removeChannel(ch) {
		var index;
		if ((index = this.channels.indexOf(ch)) > -1)
			this.channels.splice(index, 1);
	};

	User.prototype.addChannel = function addChannel(ch) {
		if (this.channels.indexOf(ch) === -1)
			this.channels.push(ch);
	};

	return User;
})();
