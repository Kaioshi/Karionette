// permissions mark 2.1!
"use strict";

let perms,
	permissionDB = new DB.Json({filename: "perms"}),
	permsDB = permissionDB.getAll();

function ensureObj(type, item, entry) {
	if (!permsDB[type]) permsDB[type] = {};
	if (!permsDB[type][item]) permsDB[type][item] = {};
	if (!permsDB[type][item][entry]) permsDB[type][item][entry] = {};
}

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
			if (Object.keys(permsDB[type][item][action]).length === 0)
				delete permsDB[type][item][action];
			permissionDB.saveAll(permsDB);
		}
	}
}

function Save() {
	permissionDB.saveAll(permsDB);
}

function Action(from, action, type, item, username) {
	let user, nick,
		permission = false;
	if (!(from && action && type && item)) {
		logger.warn("Incorrect call to perms.Action("+[from, action, type, item, username].join(", ")+")");
		return;
	}
	nick = from.split("!")[0];
	user = logins.getUsername(nick);
	// all of these actions require ownership - or no owner set, (or admin).
	permission = logins.isAdmin(nick); // check admin first.
	if (!permission) {
		if (!permsDB[type] || !permsDB[type][item]) {
			permission = true;
		} else { // there are entries for this.
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
			let keys = Object.keys(permsDB[type][item].deny);
			for (let i = 0; i < keys.length; i++) {
				if (keys[i].indexOf("!") > -1 || keys[i].indexOf("*") > -1) {
					if (ial.maskMatch(from, keys[i])) {
						logger.debug("Denied based on mask");
						return false; // also blacklist
					}
				}
			}
		}
	} else {
		action = action.split(" ");
		alterEntry((username ? username : user), action[1], action[0], type, item);
		return true;
	}
	return false;
}

function Info(from, type, item) { // this is awful
	let ret = [];
	if (!(from && type && item)) {
		logger.warn("Incorrect call to perms.Info("+[from, type, item].join(", ")+")");
		return;
	}
	if (type === "command" && !logins.isAdmin(from.split("!")[0]))
		return -2; // only admins can set command permissions
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
	if (ret.length > 0)
		return ret;
	return -1; // no such item, but it has an empty permissions section. bugs!
}

function isOwner(from, type, item) {
	let user, nick;
	if (!(from && type && item)) {
		logger.warn("Incorrect call to perms.isOwner("+[from, type, item].join(", ")+")");
		return;
	} // if the item has no permissions, true
	if (!permsDB[type] || !permsDB[type][item]) {
		logger.debug("isOwner: returned no permissions");
		return true;
	}
	nick = from.split("!")[0];
	if (logins.isAdmin(nick))
		return true; // if admin, always yes
	// plebs below!
	user = logins.getUsername(nick);
	if (!user)
		return; // not logged in
	if (permsDB[type][item].owner && Object.keys(permsDB[type][item].owner).length > 0) {
		if (permsDB[type][item].owner[user])
			return true;
		return;
	} // unclaimed, let em at it
	logger.warn("Unclaimed "+type+" "+item+" being edited by "+from);
	return true;
}

function hasPerms(type, item) {
	if (permsDB[type] && permsDB[type][item] && Object.keys(permsDB[type][item]).length > 0)
		return true;
}

function Check(from, type, item) {
	// return true if they have permission to edit this item
	let user, nick;
	if (!(from && type && item)) {
		logger.warn("Incorrect call to perms.Check("+[from, type, item].join(", ")+")");
		return;
	}
	nick = from.split("!")[0];
	// if admin, always yes
	if (logins.isAdmin(nick))
		return true;
	// plebs below!
	user = logins.getUsername(nick);
	if (!permsDB[type] || !permsDB[type][item])
		return true; // no permissions are set, free for all
	if (permsDB[type][item].owner && Object.keys(permsDB[type][item].owner).length > 0) {
		if (user && permsDB[type][item].owner[user])
			return true;
	} // check allow list - if there is an allow list, we consider it a whitelist. if they aren't on this, deny
	if (permsDB[type][item].allow && Object.keys(permsDB[type][item].allow).length > 0) {
		if (user && permsDB[type][item].allow[user])
			return true;
		return;
	} // check deny list - if there is a deny list but no allow, we consider it a black list.
	if (permsDB[type][item].deny && Object.keys(permsDB[type][item].deny).length > 0) {
		if (user && permsDB[type][item].deny[user])
			return;
		else {
			let keys = Object.keys(permsDB[type][item].deny);
			for (let i = 0; i < keys.length; i++) {
				if (ial.maskMatch(from, keys[i]))
					return; // denied based on mask
			}
		} // yay. if you got this far you weren't the owner, but there was no allow list and you weren't on the deny list,
	} // if it existed. Huzzah. You get the cookie. Monkey. You get the Cookie Monkey. It poops delicious cookies.
	return true;
}

perms = {
	DB: permsDB,
	Save: Save,
	Action: Action,
	Info: Info,
	isOwner: isOwner,
	hasPerms: hasPerms,
	Check: Check
};

plugin.declareGlobal("perms", "perms", perms);
