"use strict";

let users = {},
	loggedIn = {}, // username -> nick for quick lookups via username
	loginDB = new DB.Json({filename: "logins"});

function UserLogin(nick, fulluser, username, password, secret) {
	this.nick = nick;
	this.fulluser = fulluser;
	this.registered = new Date();
	this.loginTime = this.registered.valueOf();
	this.username = username;
	this.password = password;
	if (secret === config.secret)
		this.admin = true;
	else
		this.admin = false;
}

bot.event({
	handle: "onStartLoginValidation",
	event: "autojoinFinished",
	callback: function validateLastLogins() {
		let index, nicks = ial.Nicks(),
			loginusers = loginDB.getAll(), keys = Object.keys(loginusers);
		for (let i = 0; i < keys.length; i++) {
			if ((index = nicks.indexOf(loginusers[keys[i]].nick)) > -1) {
				if (ial.User(nicks[index]).fulluser === loginusers[keys[i]].fulluser)
					identify(nicks[index], loginusers[keys[i]].username, loginusers[keys[i]].password);
			}
		}
	}
});

function getUsername(nick) {
	if (users[nick])
		return users[nick].username;
}

function getNick(username) {
	return loggedIn[username];
}

function nickList(adminsOnly) {
	if (adminsOnly) {
		return Object.keys(users).filter(function (nick) {
			return users[nick].admin;
		});
	}
	return Object.keys(users);
}

function userList() {
	let ret = [];
	Object.keys(users).forEach(function (nick) {
		ret.push(users[nick].username+(users[nick].admin ? " (Admin)" : "")+" -> "+users[nick].fulluser);
	});
	return ret;
}

function addLogin(nick, username, password, secret) {
	let user;
	if (loginDB.hasOne(username))
		return "Username "+username+" is taken.";
	if (users[nick])
		return "You're already logged in. Unidentify to add a new user.";
	user = new UserLogin(nick, ial.User(nick).fulluser, username, password, secret);
	loginDB.saveOne(username, user);
	users[nick] = user;
	loggedIn[username] = nick;
	return "Added "+username+(user.admin ? " as an Admin" : "")+"! Don't forget to identify if you reconnect. You're now identified as \""+username+"\".";
}

function remLogin(nick, username, password) {
	let user, caller;
	if (!users[nick])
		return "You need to identify first.";
	caller = users[nick];
	if (caller.admin) { // LIKE A BOSS
		loginDB.removeOne(username);
	} else {
		if (caller.username !== username)
			return "Only admins can remove other users.";
		if (password === undefined)
			return "Only admins can remove logins without supplying the password.";
		user = loginDB.getOne(username);
		if (!user)
			return "There is no such user.";
		if (user.password !== password)
			return "Wrong password.";
		loginDB.removeOne(username);
	}
	if (loggedIn[username]) {
		delete users[loggedIn[username]];
		delete loggedIn[username];
	}
	return "Removed. o7";
}

function passwd(nick, newpass, username) {
	let caller, user;
	if (!users[nick])
		return "You haven't identified yet.";
	caller = users[nick];
	if (username) {
		if (!caller.admin)
			return "Only admins can set passwords for other users.";
		if (!loginDB.hasOne(username))
			return "There is no such user.";
		user = loginDB.getOne(username);
		user.password = newpass;
		loginDB.saveOne(username, user);
		return username+"'s password has been updated.";
	}
	caller.password = newpass;
	loginDB.saveOne(caller.username, caller);
	return "Your password has been updated.";
}

function identify(nick, username, password) {
	let user;
	if (users[nick])
		return "You are already identified as \""+users[nick].username+"\", unidentify first.";
	if (loggedIn[username])
		return username+" is already logged in.";
	user = loginDB.getOne(username);
	if (!user)
		return "There is no such user.";
	if (user.password !== password)
		return "Wrong password.";
	user.nick = nick;
	user.fulluser = ial.User(nick).fulluser;
	user.loginTime = Date.now();
	users[nick] = user;
	loggedIn[username] = nick;
	loginDB.saveOne(user.username, user);
	return "You are now identified as "+username+".";
}

function unidentify(nick) {
	let user;
	if (!users[nick])
		return "You haven't identified yet.";
	user = users[nick];
	delete loggedIn[user.username];
	delete user.nick;
	delete user.fulluser;
	loginDB.saveOne(user.username, user);
	delete users[nick];
	return "I no longer recognise you.";
}

function isAdmin(nick) {
	if (users[nick])
		return users[nick].admin;
	return false;
}

function isLoggedIn(nick) {
	return users[nick] !== undefined;
}

function nickChange(oldnick, newnick) {
	if (users[oldnick]) {
		users[newnick] = users[oldnick];
		delete users[oldnick];
		users[newnick].nick = newnick;
		users[newnick].fulluser = newnick+"!"+users[newnick].fulluser.split("!")[1];
		loggedIn[users[newnick].username] = newnick;
		loginDB.saveOne(users[newnick].username, users[newnick]);
	}
}

function setAttribute(nick, attr, value) {
	let user;
	if (!users[nick])
		return "You need to identify first.";
	user = users[nick];
	user.attr = user.attr || {};
	user.attr[attr] = value;
	loginDB.saveOne(user.username, user);
	return "Added. o7";
}

function getAttribute(nick, attr) {
	let user;
	if (!users[nick])
		return "You need to identify first.";
	user = users[nick];
	user.attr = user.attr || {};
	if (!user.attr[attr])
		return "You have no '"+attr+"' attribute set.";
	return user.attr[attr];
}

function unsetAttribute(nick, attr) {
	let user;
	if (!users[nick])
		return "You need to identify first.";
	user = users[nick];
	user.attr = user.attr || {};
	if (!user.attr[attr])
		return "You have no '"+attr+"' attribute set.";
	delete user.attr[attr];
	loginDB.saveOne(user.username, user);
	return "Removed. o7";
}

plugin.declareGlobal("logins", "logins", {
	addLogin: addLogin,
	remLogin: remLogin,
	identify: identify,
	unidentify: unidentify,
	passwd: passwd,
	nickChange: nickChange,
	isAdmin: isAdmin,
	isLoggedIn: isLoggedIn,
	getUsername: getUsername,
	getNick: getNick,
	nickList: nickList,
	userList: userList,
	setAttribute: setAttribute,
	getAttribute: getAttribute,
	unsetAttribute: unsetAttribute
});
