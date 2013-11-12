// users :(
var validated, restored,
	DB = require("./fileDB.js"),
	loginstateDB = new DB.Json({filename: "loginstate", quque: true}),
	loginDB = new DB.Json({filename: "logins", queue: true});

function checkUser(opts) {
	var user = loginDB.getOne(opts.user);
	if (!user) return -1; // implies no user found
	if (opts.admin) return user;
	if (user.password === opts.password || irc_config.secret === opts.password) {
		return user;
	}
	user = null;
}

userLogin = {
	Add: function (from, username, password, secretcode) {
		var user;
		if (!from || !username || !password) {
			logger.debug("Invalid call to users.Add, need username and password, got: "+[from, username, password, secretcode].join(", "));
			return;
		}
		if (loginDB.getOne(username)) {
			logger.debug("[users.Add] "+username+" user already exists.");
			return -2; // implies username conflict
		}
		user = { from: from, password: password };
		if (secretcode) {
			if (secretcode !== irc_config.secret) return -3; // implies incorrect secret code
			user.admin = true;
		}
		loginDB.saveOne(username, user);
		logger.debug("[users.Add] added user "+username+" with password "+password+" admin: "+(user.admin ? user.admin : "false"));
		user = null;
		return true;
	},
	Remove: function (from, username, password) {
		var user, target,
			admin = false,
			proceed = false;
		if (!from || !username) {
			logger.debug("[users.Remove] invalid call - need from, username and password - from: "+from);
			return;
		}
		user = this.Check(from);
		admin = this.Check(from, true);
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
			if (!password) {
				return;
			}
			if (!checkUser({ user: username, password: password })) {
				logger.debug("[users.Remove] "+from+" tried to remove user "+username+" with an incorrect password.");
			} else {
				proceed = true;
			}
		}
		user = null;
		if (proceed) {
			if (userLogin.loggedIn[username]) delete userLogin.loggedIn[username];
			loginDB.removeOne(username);
			logger.debug("[users.Remove] "+from+" removed user "+username+(admin ? " (admin)." : "."));
			return true;
		}
	},
	Login: function (from, username, password) {
		var user;
		if (!from || !username || !password) {
			logger.debug("[users.Login] invalid call, need from, username and password, got: \
				"+[from, username, password].join(", "));
			return;
		}
		user = checkUser({ user: username, password: password});
		if (user === -1) return -1; // implies no user found
		if (user) {
			if (!userLogin.loginCache) userLogin.loginCache = {};
			userLogin.loginCache[from] = username;
			userLogin.loggedIn[username] = { user: from };
			if (user.admin) userLogin.loggedIn[username].admin = true;
			if (user.attr) userLogin.loggedIn[username].attr = user.attr;
			logger.debug("[users.Login] "+from+" logged in as "+username);
			user = null;
			userLogin.saveState();
			return true;
		}
	},
	Check: function (from, admin) { // returns username if they're logged in with their nick!user@host
		if (userLogin.loginCache && userLogin.loginCache[from]) { // if admin, returns true if they are one
			if (admin && !userLogin.loggedIn[userLogin.loginCache[from]].admin) {
				return;
			}
			return userLogin.loginCache[from];
		}
		return;
	},
	saveState: function () {
		logger.info("Storing Login state ...");
		loginstateDB.saveOne("loggedIn", userLogin.loggedIn);
		if (userLogin.loginCache) {
			loginstateDB.saveOne("loginCache", userLogin.loginCache);
		}
	},
	isAdmin: function (user) {
		return this.Check(user, true);
	},
	isUser: function (username) {  // returns true if it's a user
		var entry = loginDB.getOne(username);
		if (entry) {
			entry = null
			return true;
		}
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
		if (!user.attr) return;
		if (!user.attr[attrname]) return;
		delete user.attr[attrname];
		delete userLogin.loggedIn[username].attr[attrname];
		if (Object.keys(user.attr).length === 0) {
			delete user.attr;
			delete userLogin.loggedIn[username].attr;
		}
		loginDB.saveOne(username, user);
		return true;
	},
	setAttribute: function (username, attrname, attribute) {
		var user;
		if (!(username && attrname, attribute)) {
			logger.warn("[userLogin.setAttribute] invalid call: ("+username+", "+attrname+", "+attribute+")");
			return;
		}
		user = loginDB.getOne(username);
		if (!user) {
			logger.error("[userLogin.setAttribute] an invalid username was passed: "+username);
			return;
		}
		if (!user.attr) user.attr = {};
		if (!userLogin.loggedIn[username].attr) userLogin.loggedIn[username].attr = {};
		userLogin.loggedIn[username].attr[attrname] = attribute;
		user.attr[attrname] = attribute;
		loginDB.saveOne(username, user);
	},
	getAttribute: function (username, attrname) {
		var keys, ret;
		if (!(username)) {
			logger.warn("[userLogin.getAttribute] invalid call: ("+username+", "+attrname+") - need at least the username.");
			return;
		}
		if (!userLogin.loggedIn[username].attr) return;
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
	List: function () {
		return Object.keys(loginDB.getAll()).join(", ");
	}
}

if (!userLogin.loggedIn) userLogin.loggedIn = {};
if (!restored) {
	restored = true;
	restoreLoginState();
}
if (!validated) {
	validated = true;
	setTimeout(function () {
		validateLoginState(); // TODO: figure out how to make the timing smart.
	}, 30000); // hopefully 30 seconds is long enough to have joined and updated IAL.
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
	if (altered) userLogin.saveState();
}

