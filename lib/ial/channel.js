"use strict";

module.exports = (function () {
	function Channel(ch) {
		this.channel = ch;
		this.nicks = [];
		this.active = {};
	}

	Channel.prototype.addNick = function addNick(nick) {
		if (this.nicks.indexOf(nick) === -1)
			this.nicks.push(nick);
	};

	Channel.prototype.removeNick = function removeNick(nick) {
		var index;
		if ((index = this.nicks.indexOf(nick)) > -1) {
			this.nicks.splice(index, 1);
			if (this.active[nick])
				delete this.active[nick];
		}
	};

	Channel.prototype.updateNick = function updateNick(oldnick, newnick) {
		var index;
		if ((index = this.nicks.indexOf(oldnick)) > -1) {
			this.nicks[index] = newnick;
			if (this.active[oldnick]) {
				this.active[newnick] = this.active[oldnick];
				delete this.active[oldnick];
			}
		}
	};

	Channel.prototype.setActive = function setActive(nick) {
		this.active[nick] = Date.now();
	};

	return Channel;
})();
