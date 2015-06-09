// permissions mark 2!
"use strict";
var DB = require("./fileDB.js"),
	permissionDB = new DB.Json({filename: "perms", queue: true});

function alterEntry(username, act, action, type, item) {
	if (!username) {
		logger.debug("Incorrect call to alterEntry("+[username, act, action, type, item].join(", ")+")");
		return;
	}
	if (action === "delete") {
		if (act === "all") {
			if (perms.DB[type][item]) {
				delete perms.DB[type][item];
				perms.Save();
			}
		} else {
			if (perms.DB[type] && perms.DB[type][item] && perms.DB[type][item][act]) {
				delete perms.DB[type][item][act];
				perms.Save();
			}
		}
		return;
	}
	if (act === "add") {
		ensureObj(type, item, action);
		perms.DB[type][item][action][username] = true;
		perms.Save();
	} else {
		ensureObj(type, item, action);
		if (perms.DB[type][item][action][username]) {
			delete perms.DB[type][item][action][username];
			if (Object.keys(perms.DB[type][item][action]).length === 0) {
				delete perms.DB[type][item][action];
			}
			perms.Save();
		}
	}
}

function ensureObj(type, item, entry) {
	if (!perms.DB[type]) perms.DB[type] = {};
	if (!perms.DB[type][item]) perms.DB[type][item] = {};
	if (!perms.DB[type][item][entry]) perms.DB[type][item][entry] = {};
}

global.perms = {
	Save: function () {
		permissionDB.saveAll(perms.DB);
	},
	Action: function (from, action, type, item, username) {
		var user, i, keys,
			permission = false;
		// perms.Add(nick!user@pants.org, username, allow/deny/owner, variable/alias/function, var/alias/func-name);
		if (!(from && action && type && item)) {
			logger.warn("Incorrect call to perms.Action("+[from, action, type, item, username].join(", ")+")");
			return;
		}
		user = userLogin.Check(from);
		// all of these actions require ownership - or no owner set, (or admin).
		permission = userLogin.Check(from, true); // check admin first.
		if (!permission) {
			if (!perms.DB[type] || !perms.DB[type][item]) {
				permission = true;
			} else {
				// there are entries for this.
				if (perms.DB[type][item].owner) {
					if (perms.DB[type][item].owner[user]) {
						permission = true;
					}
				}
			}
			if (perms.DB[type] && perms.DB[type][item] && perms.DB[type][item].deny) {
				if (perms.DB[type][item].deny[user]) {
					logger.debug("Denied based on user");
					return false; // blacklist
				}
				keys = Object.keys(perms.DB[type][item].deny);
				if (keys.length > 0) {
					for (i = 0; i < keys.length; i++) {
						if (keys[i].indexOf("!") > -1 || keys[i].indexOf("*") > -1) {
							if (ial.maskMatch(from, keys[i])) {
								logger.debug("Denied based on mask");
								return false; // also blacklist
							}
						}
					}
				}
			}
		}
		if (permission) {
			action = action.split(" ");
			alterEntry((username ? username : user), action[1], action[0], type, item);
			return true;
		}
		return false;
	},
	Info: function (from, type, item) {
		var admin, ret = [];
		if (!(from && type && item)) {
			logger.warn("Incorrect call to perms.Info("+[from, type, item].join(", ")+")");
			return;
		}
		admin = userLogin.Check(from, true);
		if (type === "command" && !admin) return -2; // not an admin
		if (perms.DB[type] && perms.DB[type][item]) {
			if (perms.DB[type][item].owner && Object.keys(perms.DB[type][item].owner).length > 0) {
				ret.push("Owners: "+Object.keys(perms.DB[type][item].owner).join(", "));
			}
			if (perms.DB[type][item].deny && Object.keys(perms.DB[type][item].deny).length > 0) {
				ret.push("Denies: "+Object.keys(perms.DB[type][item].deny).join(", "));
			}
			if (perms.DB[type][item].allow && Object.keys(perms.DB[type][item].allow).length > 0) {
				ret.push("Allows: "+Object.keys(perms.DB[type][item].allow).join(", "));
			}
		} else {
			return -1; // no such item
		}
		if (ret.length > 0) return ret;
		return -1; // no such item, but it has an empty permissions section. bugs!
	},
	isOwner: function (from, type, item) {
		var user;
		if (!(from && type && item)) {
			logger.warn("Incorrect call to perms.isOwner("+[from, type, item].join(", ")+")");
			return;
		}
		// if the item has no permissions, true
		if (!perms.DB[type] || !perms.DB[type][item]) {
			logger.debug("isOwner: returned no permissions");
			return true;
		}
		// if admin, always yes
		if (userLogin.Check(from, true)) return true;
		// plebs below!
		user = userLogin.Check(from);
		if (!user) return; // not logged in
		if (perms.DB[type][item].owner && Object.keys(perms.DB[type][item].owner).length > 0) {
			if (perms.DB[type][item].owner[user]) return true;
			return;
		}
		// unclaimed, let em at it
		logger.warn("Unclaimed "+type+" "+item+" being edited by "+from);
		return true;
	},
	hasPerms: function (type, item) {
		if (perms.DB[type] && perms.DB[type][item] && Object.keys(perms.DB[type][item]).length > 0) {
			return true;
		}
	},
	Check: function (from, type, item) {
		// return true if they have permission to edit this item
		var user, i, keys;
		if (!(from && type && item)) {
			logger.warn("Incorrect call to perms.Check("+[from, type, item].join(", ")+")");
			return;
		}
		// if admin, always yes
		if (userLogin.Check(from, true)) {
			//logger.debug("Check: ["+type+" - "+item+"] allowed based on admin");
			return true;
		}
		// plebs below!
		user = userLogin.Check(from);
		//if (!user) return; // not logged in
		if (!perms.DB[type] || !perms.DB[type][item]) {
			//logger.debug("Check: ["+type+" - "+item+"] no permissions set, allow");
			return true; // no permissions are set, free for all
		}
		if (perms.DB[type][item].owner && Object.keys(perms.DB[type][item].owner).length > 0) {
			if (user && perms.DB[type][item].owner[user]) {
				//logger.debug("Check: ["+type+" - "+item+"] owner, allow");
				return true;
			}
		}
		// check allow list - if there is an allow list, we consider it a whitelist. if they aren't on this, deny
		if (perms.DB[type][item].allow && Object.keys(perms.DB[type][item].allow).length > 0) {
			if (user && perms.DB[type][item].allow[user]) {
				//logger.debug("Check: ["+type+" - "+item+"] whitelist allow");
				return true;
			}
			//logger.debug("Check: ["+type+" - "+item+"] whitelist deny");
			return;
		}
		// check deny list - if there is a deny list but no allow, we consider it a black list.
		if (perms.DB[type][item].deny && Object.keys(perms.DB[type][item].deny).length > 0) {
			if (user && perms.DB[type][item].deny[user]) {
				//logger.debug("Check: ["+type+" - "+item+"] denied - blacklist user");
				return;
			} else {
				keys = Object.keys(perms.DB[type][item].deny);
				for (i = 0; i < keys.length; i++) {
					if (ial.maskMatch(from, keys[i])) {
						//logger.debug("Check: ["+type+" - "+item+"] denied - blacklist mask");
						return;
					}
				}
			}
		}
		// yay. if you got this far you weren't the owner, but there was no allow list and you weren't on the deny list,
		// if it existed. Huzzah. You get the cookie. Monkey. You get the Cookie Monkey. It poops delicious cookies.
		//logger.debug("Check: ["+type+" - "+item+"] not the owner, but no allow or deny hits - allow");
		return true;
	}
};

if (!perms.DB) perms.DB = permissionDB.getAll();
