// users :(
"use strict";

module.exports = function (lib, irc_config, logger, FragDB, ial) {
	var usersLoggedIn = {},
		userLoginCache = {},
		loginstateDB = new FragDB("loginstate", "data/loginstate.json"),
		loginDB = new FragDB("logins", "data/logins.json");

	restoreLoginState();
	lib.events.on("autojoinFinished", validateLoginState);

	function checkUser(opts) {
		var user = loginDB.getOne(opts.user);
		if (!user)
			return -1; // implies no user found
		if (opts.admin)
			return user;
		if (user.password === opts.password || irc_config.secret === opts.password)
			return user;
	}

	function restoreLoginState() {
		var loggedIn, loginCache;
		loggedIn = loginstateDB.getOne("loggedIn");
		loginCache = loginstateDB.getOne("loginCache");
		if (loggedIn) {
			usersLoggedIn = loggedIn;
			loggedIn = null;
		}
		if (loginCache) {
			userLoginCache = loginCache;
			loginCache = null;
		}
	}

	function validateLoginState() {
		var altered = false;
		logger.info("Validating restored Login state ...");
		Object.keys(usersLoggedIn).forEach(function (username) {
			if (ial.maskSearch(usersLoggedIn[username].user).length === 0) {
				// no one matches this on any channel we're in, remove.
				logger.info(username+"'s last recorded Nick!user@host.org doesn't match any we see, removing.");
				delete userLoginCache[usersLoggedIn[username].user];
				delete usersLoggedIn[username];
				altered = true;
			} else {
				logger.info(username+"'s restored login was validated.");
			}
		});
		if (altered)
			saveState();
	}
	function saveState() {
		logger.info("Storing Login state ...");
		loginstateDB.saveOne("loggedIn", usersLoggedIn);
		if (userLoginCache)
			loginstateDB.saveOne("loginCache", userLoginCache);
	}

	return {
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
				if (usersLoggedIn[username])
					delete usersLoggedIn[username];
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
				if (!userLoginCache)
					userLoginCache = {};
				userLoginCache[from] = username;
				usersLoggedIn[username] = { user: from };
				if (user.admin)
					usersLoggedIn[username].admin = true;
				if (user.attr)
					usersLoggedIn[username].attr = user.attr;
				logger.debug("[users.Login] "+from+" logged in as "+username);
				saveState();
				return true;
			}
		},
		Check: function (from) { // returns username if they're logged in with their nick!user@host
			return userLoginCache[from];
		},
		getNick: function (username) { // returns active nick of the logged in username
			if (usersLoggedIn[username] === undefined)
				return;
			return usersLoggedIn[username].user.split("!")[0];
		},
		isAdmin: function (from) {
			if (userLoginCache[from] && usersLoggedIn[userLoginCache[from]].admin)
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
			delete usersLoggedIn[username].attr[attrname];
			if (Object.keys(user.attr).length === 0) {
				delete user.attr;
				delete usersLoggedIn[username].attr;
			}
			loginDB.saveOne(username, user);
			saveState();
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
			if (!usersLoggedIn[username].attr)
				usersLoggedIn[username].attr = {};
			usersLoggedIn[username].attr[attrname] = attribute;
			user.attr[attrname] = attribute;
			loginDB.saveOne(username, user);
			saveState();
		},
		getAttribute: function (username, attrname) {
			var keys, ret;
			if (!(username)) {
				logger.warn("[userLogin.getAttribute] invalid call: ("+username+", "+attrname+") - need at least the username.");
				return;
			}
			if (!usersLoggedIn[username] || !usersLoggedIn[username].attr)
				return;
			if (!attrname) {
				keys = Object.keys(usersLoggedIn[username].attr);
				if (keys.length === 0) {
					logger.debug("[userLogin.getAttribute] "+username+" has an empty attributes field, deleting.");
					delete usersLoggedIn[username].attr;
					return;
				}
				ret = [];
				keys.forEach(function (key) {
					ret.push(key+": \""+usersLoggedIn[username].attr[key]+"\"");
				});
				return ret.join(", ");
			}
			return usersLoggedIn[username].attr[attrname];
		},
		List: function (active) {
			if (active)
				return Object.keys(usersLoggedIn);
			return Object.keys(loginDB.getAll()).join(", ");
		}
	};
};
