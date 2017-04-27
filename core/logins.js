"use strict";
const ial = plugin.import("ial");

class UserLogin {
	constructor(nick, fulluser, username, password, secret) {
		this.nick = nick;
		this.fulluser = fulluser;
		this.registered = new Date();
		this.loginTime = this.registered.valueOf();
		this.username = username;
		this.password = password;
		this.admin = secret === config.secret ? true : false;
	}
}

class Logins {
	constructor() {
		this.users = Object.create(null);
		this.loggedIn = Object.create(null);
		this.db = plugin.import("DB").Json({filename: "logins"});
	}
	getNick(username) { return this.loggedIn[username]; }
	getUsername(nick) {
		if (this.users[nick])
			return this.users[nick].username;
	}
	nickList(adminsOnly) {
		if (adminsOnly)
			return Object.keys(this.users).filter(nick => this.users[nick].admin);
		return Object.keys(this.users);
	}
	userList() {
		let ret = [];
		for (const nick in this.users)
			ret.push(this.users[nick].username+(this.users[nick].admin ? " (Admin)" : "")+" -> "+this.users[nick].fulluser);
		return ret;
	}
	addLogin(nick, username, password, secret) {
		if (this.db.hasOne(username))
			return "Username "+username+" is taken.";
		if (this.users[nick])
			return "You're already logged in. Unidentify to add a new user.";
		const user = new UserLogin(nick, ial.User(nick).fulluser, username, password, secret);
		this.db.saveOne(username, user);
		this.users[nick] = user;
		this.loggedIn[username] = nick;
		return "Added "+username+(user.admin ? " as an Admin" : "")+
			"! Don't forget to identify if you reconnect. You're now identified as \""+username+"\".";
	}
	remLogin(nick, username, password) {
		let user;
		if (!this.users[nick])
			return "You need to identify first.";
		const caller = this.users[nick];
		if (caller.admin)// LIKE A BOSS
			this.db.removeOne(username);
		else {
			if (caller.username !== username)
				return "Only admins can remove other users.";
			if (password === undefined)
				return "Only admins can remove logins without supplying the password.";
			user = this.db.getOne(username);
			if (!user)
				return "There is no such user.";
			if (user.password !== password)
				return "Wrong password.";
			this.db.removeOne(username);
		}
		if (this.loggedIn[username]) {
			delete this.users[this.loggedIn[username]];
			delete this.loggedIn[username];
		}
		return "Removed. o7";
	}
	passwd(nick, newpass, username) {
		if (!this.users[nick])
			return "You haven't identified yet.";
		const caller = this.users[nick];
		if (username) {
			if (!caller.admin)
				return "Only admins can set passwords for other users.";
			if (!this.db.hasOne(username))
				return "There is no such user.";
			const user = this.db.getOne(username);
			user.password = newpass;
			this.db.saveOne(username, user);
			return username+"'s password has been updated.";
		}
		caller.password = newpass;
		this.db.saveOne(caller.username, caller);
		return "Your password has been updated.";
	}
	identify(nick, username, password) {
		if (this.users[nick])
			return "You are already identified as \""+this.users[nick].username+"\", unidentify first.";
		if (this.loggedIn[username])
			return username+" is already logged in.";
		const user = this.db.getOne(username);
		if (!user)
			return "There is no such user.";
		if (user.password !== password)
			return "Wrong password.";
		user.nick = nick;
		user.fulluser = ial.User(nick).fulluser;
		user.loginTime = Date.now();
		this.users[nick] = user;
		this.loggedIn[username] = nick;
		this.db.saveOne(user.username, user);
		return "You are now identified as "+username+".";
	}
	unidentify(nick) {
		if (!this.users[nick])
			return "You haven't identified yet.";
		const user = this.users[nick];
		delete this.loggedIn[user.username];
		delete user.nick;
		delete user.fulluser;
		this.db.saveOne(user.username, user);
		delete this.users[nick];
		return "I no longer recognise you.";
	}
	isAdmin(nick) {
		if (this.users[nick])
			return this.users[nick].admin;
		return false;
	}
	isLoggedIn(nick) { return this.users[nick] !== undefined; }
	nickChange(oldnick, newnick) {
		if (this.users[oldnick]) {
			this.users[newnick] = this.users[oldnick];
			delete this.users[oldnick];
			this.users[newnick].nick = newnick;
			this.users[newnick].fulluser = newnick+"!"+this.users[newnick].fulluser.split("!")[1];
			this.loggedIn[this.users[newnick].username] = newnick;
			this.db.saveOne(this.users[newnick].username, this.users[newnick]);
		}
	}
	setAttribute(nick, attr, value) {
		if (!this.users[nick])
			return "You need to identify first.";
		const user = this.users[nick];
		user.attr = user.attr || {};
		user.attr[attr] = value;
		this.db.saveOne(user.username, user);
		return "Added. o7";
	}
	getAttribute(nick, attr) {
		if (!this.users[nick])
			return "You need to identify first.";
		const user = this.users[nick];
		user.attr = user.attr || {};
		if (!user.attr[attr])
			return "You have no '"+attr+"' attribute set.";
		return user.attr[attr];
	}
	unsetAttribute(nick, attr) {
		if (!this.users[nick])
			return "You need to identify first.";
		const user = this.users[nick];
		user.attr = user.attr || {};
		if (!user.attr[attr])
			return "You have no '"+attr+"' attribute set.";
		delete user.attr[attr];
		this.db.saveOne(user.username, user);
		return "Removed. o7";
	}
}

plugin.export("logins", new Logins());
