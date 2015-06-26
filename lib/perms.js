// permissions mark 2!
"use strict";
module.exports = function (DB, logger, ial, userLogin) {
	var permissionDB = new DB.Json({filename: "perms"}),
		permsDB = permissionDB.getAll();

	function alterEntry(username, act, action, type, item) {
		if (!username) {
			logger.debug("Incorrect call to alterEntry("+[username, act, action, type, item].join(", ")+")");
			return;
		}
		if (action === "delete") {
			if (act === "all") {
				if (permsDB[type][item]) {
					delete permsDB[type][item];
					permissionDB.saveAll(permsDB);
				}
			} else {
				if (permsDB[type] && permsDB[type][item] && permsDB[type][item][act]) {
					delete permsDB[type][item][act];
					permissionDB.saveAll(permsDB);
				}
			}
			return;
		}
		if (act === "add") {
			ensureObj(type, item, action);
			permsDB[type][item][action][username] = true;
			permissionDB.saveAll(permsDB);
		} else {
			ensureObj(type, item, action);
			if (permsDB[type][item][action][username]) {
				delete permsDB[type][item][action][username];
				if (Object.keys(permsDB[type][item][action]).length === 0) {
					delete permsDB[type][item][action];
				}
				permissionDB.saveAll(permsDB);
			}
		}
	}

	function ensureObj(type, item, entry) {
		if (!permsDB[type]) permsDB[type] = {};
		if (!permsDB[type][item]) permsDB[type][item] = {};
		if (!permsDB[type][item][entry]) permsDB[type][item][entry] = {};
	}

	return {
		Save: function () {
			permissionDB.saveAll(permsDB);
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
				if (!permsDB[type] || !permsDB[type][item]) {
					permission = true;
				} else {
					// there are entries for this.
					if (permsDB[type][item].owner) {
						if (permsDB[type][item].owner[user]) {
							permission = true;
						}
					}
				}
				if (permsDB[type] && permsDB[type][item] && permsDB[type][item].deny) {
					if (permsDB[type][item].deny[user]) {
						logger.debug("Denied based on user");
						return false; // blacklist
					}
					keys = Object.keys(permsDB[type][item].deny);
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
			if (permsDB[type] && permsDB[type][item]) {
				if (permsDB[type][item].owner && Object.keys(permsDB[type][item].owner).length > 0) {
					ret.push("Owners: "+Object.keys(permsDB[type][item].owner).join(", "));
				}
				if (permsDB[type][item].deny && Object.keys(permsDB[type][item].deny).length > 0) {
					ret.push("Denies: "+Object.keys(permsDB[type][item].deny).join(", "));
				}
				if (permsDB[type][item].allow && Object.keys(permsDB[type][item].allow).length > 0) {
					ret.push("Allows: "+Object.keys(permsDB[type][item].allow).join(", "));
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
			if (!permsDB[type] || !permsDB[type][item]) {
				logger.debug("isOwner: returned no permissions");
				return true;
			}
			// if admin, always yes
			if (userLogin.Check(from, true)) return true;
			// plebs below!
			user = userLogin.Check(from);
			if (!user) return; // not logged in
			if (permsDB[type][item].owner && Object.keys(permsDB[type][item].owner).length > 0) {
				if (permsDB[type][item].owner[user]) return true;
				return;
			}
			// unclaimed, let em at it
			logger.warn("Unclaimed "+type+" "+item+" being edited by "+from);
			return true;
		},
		hasPerms: function (type, item) {
			if (permsDB[type] && permsDB[type][item] && Object.keys(permsDB[type][item]).length > 0) {
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
			if (!permsDB[type] || !permsDB[type][item]) {
				//logger.debug("Check: ["+type+" - "+item+"] no permissions set, allow");
				return true; // no permissions are set, free for all
			}
			if (permsDB[type][item].owner && Object.keys(permsDB[type][item].owner).length > 0) {
				if (user && permsDB[type][item].owner[user]) {
					//logger.debug("Check: ["+type+" - "+item+"] owner, allow");
					return true;
				}
			}
			// check allow list - if there is an allow list, we consider it a whitelist. if they aren't on this, deny
			if (permsDB[type][item].allow && Object.keys(permsDB[type][item].allow).length > 0) {
				if (user && permsDB[type][item].allow[user]) {
					//logger.debug("Check: ["+type+" - "+item+"] whitelist allow");
					return true;
				}
				//logger.debug("Check: ["+type+" - "+item+"] whitelist deny");
				return;
			}
			// check deny list - if there is a deny list but no allow, we consider it a black list.
			if (permsDB[type][item].deny && Object.keys(permsDB[type][item].deny).length > 0) {
				if (user && permsDB[type][item].deny[user]) {
					//logger.debug("Check: ["+type+" - "+item+"] denied - blacklist user");
					return;
				} else {
					keys = Object.keys(permsDB[type][item].deny);
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
};
