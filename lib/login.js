"use strict";
module.exports = function (config, ial, DB, eventListen) {
	var users = new WeakMap(),
		loggedIn = {}, // username -> nick
		usernames = {}, // nick -> username // fast lookups. don't need ial.User for many things.
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

	eventListen({
		handle: "onStartLoginValidation",
		event: "autojoinFinished",
		callback: function validateLastLogins() {
			var i, index, nicks = ial.Nicks(),
				users = loginDB.getAll(), keys = Object.keys(users);
			for (i = 0; i < keys.length; i++) {
				if ((index = nicks.indexOf(users[keys[i]].nick)) > -1) {
					if (ial.User(nicks[index]).fulluser === users[keys[i]].fulluser)
						identify(nicks[index], users[keys[i]].username, users[keys[i]].password);
				}
			}
		}
	});

	function getUsername(nick) {
		return usernames[nick];
	}

	function getNick(username) {
		return loggedIn[username];
	}

	function nickList(adminsOnly) {
		if (adminsOnly) {
			return Object.keys(usernames).filter(function (user) {
				return users.get(ial.User(usernames[user])).admin;
			});
		}
		return Object.keys(usernames);
	}

	function addLogin(nick, username, password, secret) {
		var user;
		if (loginDB.hasOne(username))
			return "Username "+username+" is taken.";
		user = new UserLogin(nick, ial.User(nick).fulluser, username, password, secret);
		loginDB.saveOne(username, user);
		users.set(ial.User(nick), user);
		loggedIn[username] = nick;
		usernames[nick] = username;
		return "Added "+username+(user.admin ? " as an Admin" : "")+"! Don't forget to identify if you reconnect.";
	}

	function remLogin(nick, username, password) {
		var user, caller;
		if (!usernames[nick])
			return "You need to identify first.";
		caller = users.get(ial.User(nick));
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
			users.delete(ial.User(loggedIn[username]));
			delete usernames[loggedIn[username]];
			delete loggedIn[username];
		}
		return "Removed. o7";
	}

	function passwd(nick, newpass, username) {
		var caller, user;
		if (!usernames[nick])
			return "You haven't identified yet.";
		caller = users.get(ial.User(nick));
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
		var user;
		if (usernames[nick])
			return "You are already identified as "+username+", unidentify first.";
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
		users.set(ial.User(nick), user);
		loggedIn[username] = nick;
		usernames[nick] = username;
		loginDB.saveOne(user.username, user);
		return "You are now identified as "+username+".";
	}

	function unidentify(nick) {
		var user;
		if (!usernames[nick])
			return "You haven't identified yet.";
		user = users.get(ial.User(nick));
		delete loggedIn[user.username];
		delete usernames[nick];
		delete user.nick;
		delete user.fulluser;
		users.delete(ial.User(nick));
		loginDB.saveOne(user.username, user);
		return "I no longer recognise you.";
	}

	function isAdmin(nick) {
		if (usernames[nick])
			return users.get(ial.User(nick)).admin;
		return false;
	}

	function isLoggedIn(nick) {
		return usernames[nick] !== undefined;
	}

	function nickChange(oldnick, newnick) {
		var user;
		if (usernames[oldnick]) {
			user = users.get(ial.User(newnick));
			loggedIn[user.username] = newnick;
			usernames[newnick] = usernames[oldnick];
			delete usernames[oldnick];
			user.nick = newnick;
			user.fulluser = newnick+"!"+user.fulluser.split("!")[1];
			loginDB.saveOne(user.username, user);
		}
	}

	function setAttribute(nick, attr, value) {
		var user;
		if (!usernames[nick])
			return "You need to identify first.";
		user = users.get(ial.User(nick));
		user.attr = user.attr || {};
		user.attr[attr] = value;
		loginDB.saveOne(user.username, user);
		return "Added. o7";
	}

	function getAttribute(nick, attr) {
		var user;
		if (!usernames[nick])
			return "You need to identify first.";
		user = users.get(ial.User(nick));
		user.attr = user.attr || {};
		if (!user.attr[attr])
			return "You have no '"+attr+"' attribute set.";
		return user.attr[attr];
	}

	function unsetAttribute(nick, attr) {
		var user;
		if (!usernames[nick])
			return "You need to identify first.";
		user = users.get(ial.User(nick));
		user.attr = user.attr || {};
		if (!user.attr[attr])
			return "You have no '"+attr+"' attribute set.";
		delete user.attr[attr];
		loginDB.saveOne(user.username, user);
		return "Removed. o7";
	}

	return {
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
		setAttribute: setAttribute,
		getAttribute: getAttribute,
		unsetAttribute: unsetAttribute
	};
};
