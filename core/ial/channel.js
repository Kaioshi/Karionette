"use strict";

module.exports = (function () {
	function Channel(ch) {
		this.channel = ch;
		this.nicks = [];
		this.opped = [];
		this.voiced = [];
		this.halfopped = [];
		this.active = {};
	}

	Channel.prototype.isop = function isop(nick) {
		return this.opped.indexOf(nick) > -1;
	};

	Channel.prototype.isvoice = function isvoice(nick) {
		return this.voiced.indexOf(nick) > -1;
	};

	Channel.prototype.ishalfop = function ishalfop(nick) {
		return this.halfopped.indexOf(nick) > -1;
	};

	Channel.prototype.giveStatus = function giveStatus(status, nick) {
		if (this[status].indexOf(nick) === -1)
			this[status].push(nick);
	};

	Channel.prototype.removeStatus = function removeStatus(status, nick) {
		var index;
		if ((index = this[status].indexOf(nick)) > -1)
			this[status].splice(index, 1);
	};

	Channel.prototype.addNick = function addNick(nick) {
		if (this.nicks.indexOf(nick) === -1)
			this.nicks.push(nick);
	};

	Channel.prototype.removeNick = function removeNick(nick) {
		var index, i, listTypes = [ "nicks", "opped", "halfopped", "voiced" ];
		for (i = 0; i < listTypes.length; i++) {
			index = -1;
			if ((index = this[listTypes[i]].indexOf(nick)) > -1)
				this[listTypes[i]].splice(index, 1);
		}
		if (this.active[nick])
			delete this.active[nick];
	};

	Channel.prototype.updateNick = function updateNick(oldnick, newnick) {
		var index, i, listTypes = [ "nicks", "opped", "halfopped", "voiced" ];
		for (i = 0; i < listTypes.length; i++) {
			index = -1;
			if ((index = this[listTypes[i]].indexOf(oldnick)) > -1)
				this[listTypes[i]][index] = newnick;
		}
		if (this.active[oldnick]) {
			this.active[newnick] = this.active[oldnick];
			delete this.active[oldnick];
		}
	};

	Channel.prototype.setActive = function setActive(nick) {
		this.active[nick] = Date.now();
	};

	return Channel;
})();
