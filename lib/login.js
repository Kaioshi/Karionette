// users :(
"use strict";
var validated, restored,
	fragDB = require("./fragDB.js"),
	loginstateDB = new fragDB("loginstate", "data/loginstate.json"),
	loginDB = new fragDB("logins", "data/logins.json");

function checkUser(opts) {
	var user = loginDB.getOne(opts.user);
	if (!user)
		return -1; // implies no user found
	if (opts.admin)
		return user;
	if (user.password === opts.password || irc_config.secret === opts.password)
		return user;
}

global.userLogin = {
	Add: function (from, username, password, secretcode) {
		var user;
		if (!from || !username || !password) {
			logger.debug("Invalid call to users.Add, need username and password, got: "+[from, username, password, secretcode].join(", "));
			return;
		}
		if (loginDB.hasOne(username)) {
			logger.debug("[users.Add] "+username+" user already exists.");
			return -2; // implies username conflict
		}
		user = { from: from, password: password };
		if (secretcode) {
			if (secretcode !== irc_config.secret)
				return -3; // implies incorrect secret code
			user.admin = true;
		}
		loginDB.saveOne(username, user);
		logger.debug("[users.Add] added user "+username+" with password "+password+" admin: "+(user.admin ? user.admin : "false"));
		return true;
	},
	Remove: function (from, username, password) {
		var user, admin = false, proceed = false;
		if (!from || !username) {
			logger.debug("[users.Remove] invalid call - need from, username and password - from: "+from);
			return;
		}
		user = this.Check(from);
		admin = this.isAdmin(from);
		if (user !== username) {
			// proceed if it's a logged in admin
			if (admin) {
				if (checkUser({ user: username, admin: true }) === -1) {
					logger.warn("[userLogin.Remove] Admin tried to remove a user that doesn't exist.");
					return -1;
				}
				proceed = true;
			} else {
				return;
			}
		} else {
			if (!password)
				return;
			if (!checkUser({ user: username, password: password }))
				logger.debug("[users.Remove] "+from+" tried to remove user "+username+" with an incorrect password.");
			else
				proceed = true;
		}
		if (proceed) {
			if (userLogin.loggedIn[username])
				delete userLogin.loggedIn[username];
			loginDB.removeOne(username);
			logger.debug("[users.Remove] "+from+" removed user "+username+(admin ? " (admin)." : "."));
			return true;
		}
	},
	Login: function (from, username, password) {
		var user;
		if (!from || !username || !password) {
			logger.debug("[users.Login] invalid call, need from, username and password, got: "+
				[from, username, password].join(", "));
			return;
		}
		user = checkUser({ user: username, password: password});
		if (user === -1)
			return -1; // implies no user found
		if (user) {
			if (!userLogin.loginCache)
				userLogin.loginCache = {};
			userLogin.loginCache[from] = username;
			userLogin.loggedIn[username] = { user: from };
			if (user.admin)
				userLogin.loggedIn[username].admin = true;
			if (user.attr)
				userLogin.loggedIn[username].attr = user.attr;
			logger.debug("[users.Login] "+from+" logged in as "+username);
			userLogin.saveState();
			return true;
		}
	},
	Check: function (from) { // returns username if they're logged in with their nick!user@host
		return userLogin.loginCache[from];
	},
	getNick: function (username) { // returns active nick of the logged in username
		if (userLogin.loggedIn[username] === undefined)
			return;
		return userLogin.loggedIn[username].user.split("!")[0];
	},
	saveState: function () {
		logger.info("Storing Login state ...");
		loginstateDB.saveOne("loggedIn", userLogin.loggedIn);
		if (userLogin.loginCache)
			loginstateDB.saveOne("loginCache", userLogin.loginCache);
	},
	isAdmin: function (from) {
		if (userLogin.loginCache[from] && userLogin.loggedIn[userLogin.loginCache[from]].admin)
			return true;
	},
	isUser: function (username) {  // returns true if it's a user
		return loginDB.hasOne(username);
	},
	unsetAttribute: function (username, attrname) {
		var user;
		if (!(username && attrname)) {
			logger.warn("[userLogin.unsetAttribute] invalid call: ("+username+", "+attrname+")");
			return;
		}
		user = loginDB.getOne(username);
		if (!user) {
			logger.error("[userLogin.unsetAttribute] an invalid username was passed: "+username);
			return;
		}
		if (!user.attr || !user.attr[attrname])
			return;
		delete user.attr[attrname];
		delete userLogin.loggedIn[username].attr[attrname];
		if (Object.keys(user.attr).length === 0) {
			delete user.attr;
			delete userLogin.loggedIn[username].attr;
		}
		loginDB.saveOne(username, user);
		userLogin.saveState();
		return true;
	},
	setAttribute: function (username, attrname, attribute) {
		var user;
		if (!(username !== undefined && attrname !== undefined && attribute !== undefined)) {
			logger.warn("[userLogin.setAttribute] invalid call: ("+username+", "+attrname+", "+attribute+")");
			return;
		}
		user = loginDB.getOne(username);
		if (!user) {
			logger.error("[userLogin.setAttribute] an invalid username was passed: "+username);
			return;
		}
		if (!user.attr)
			user.attr = {};
		if (!userLogin.loggedIn[username].attr)
			userLogin.loggedIn[username].attr = {};
		userLogin.loggedIn[username].attr[attrname] = attribute;
		user.attr[attrname] = attribute;
		loginDB.saveOne(username, user);
		userLogin.saveState();
	},
	getAttribute: function (username, attrname) {
		var keys, ret;
		if (!(username)) {
			logger.warn("[userLogin.getAttribute] invalid call: ("+username+", "+attrname+") - need at least the username.");
			return;
		}
		if (!userLogin.loggedIn[username] || !userLogin.loggedIn[username].attr)
			return;
		if (!attrname) {
			keys = Object.keys(userLogin.loggedIn[username].attr);
			if (keys.length === 0) {
				logger.debug("[userLogin.getAttribute] "+username+" has an empty attributes field, deleting.");
				delete userLogin.loggedIn[username].attr;
				return;
			}
			ret = [];
			keys.forEach(function (key) {
				ret.push(key+": \""+userLogin.loggedIn[username].attr[key]+"\"");
			});
			return ret.join(", ");
		}
		return userLogin.loggedIn[username].attr[attrname];
	},
	List: function (active) {
		if (active)
			return Object.keys(this.loggedIn);
		return Object.keys(loginDB.getAll()).join(", ");
	}
};

if (!userLogin.loggedIn)
	userLogin.loggedIn = {};
if (!restored) {
	restored = true;
	restoreLoginState();
}

if (!validated) {
	validated = true;
	lib.events.on("autojoinFinished", validateLoginState);
}

function restoreLoginState() {
	var loggedIn, loginCache;
	loggedIn = loginstateDB.getOne("loggedIn");
	loginCache = loginstateDB.getOne("loginCache");
	if (loggedIn) {
		userLogin.loggedIn = loggedIn;
		loggedIn = null;
	}
	if (loginCache) {
		userLogin.loginCache = loginCache;
		loginCache = null;
	}
}

function validateLoginState() {
	var altered = false;
	logger.info("Validating restored Login state ...");
	Object.keys(userLogin.loggedIn).forEach(function (username) {
		if (ial.maskSearch(userLogin.loggedIn[username].user).length === 0) {
			// no one matches this on any channel we're in, remove.
			logger.info(username+"'s last recorded Nick!user@host.org doesn't match any we see, removing.");
			delete userLogin.loginCache[userLogin.loggedIn[username].user];
			delete userLogin.loggedIn[username];
			altered = true;
		} else {
			logger.info(username+"'s restored login was validated.");
		}
	});
	if (altered)
		userLogin.saveState();
}
