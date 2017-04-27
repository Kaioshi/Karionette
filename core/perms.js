// permissions mark 2.1!
"use strict";

const [DB, logins, ial] = plugin.importMany("DB", "logins", "ial"),
	permissionDB = DB.Json({filename: "perms"});

function alterEntry(username, act, action, type, item) {
	const perm = permissionDB.getOne(type);
	if (action === "delete") {
		if (act === "all") {
			delete perm[item];
			permissionDB.saveOne(type, perm);
		} else {
			if (perm[item][act]) {
				delete perm[item][act];
				permissionDB.saveOne(type, perm);
			}
		}
		return;
	}
	perm[item] = perm[item] || Object.create(null);
	perm[item][action] = perm[item][action] || Object.create(null);
	if (act === "add") {
		perm[item][action][username] = true;
		permissionDB.saveOne(type, perm);
	} else {
		if (perm[item][action[username]]) {
			delete perm[item][action][username];
			if (!Object.keys(perm[item][action]).length)
				delete perm[item][action];
			permissionDB.saveOne(type, perm);
		}
	}
}

function hasPermission(from, nick, user, type, item) {
	if (logins.isAdmin(nick) || !permissionDB.hasOne(type))
		return true;
	const perm = permissionDB.getOne(type);
	if (!perm[item] || (perm[item].owner && perm[item].owner[user]))
		return true;
	if (perm[item].deny) {
		if (perm[item].deny[user])
			return false;
		const keys = Object.keys(perm[item].deny);
		for (let i = 0; i < keys.length; i++) {
			if (keys[i].includes("!") || keys[i].includes("*")) {
				if (ial.maskMatch(from, keys[i]))
					return false;
			}
		}
	}
	return false;
}

function Action(from, action, type, item, username, item) {
	const nick = from.split("!")[0],
		user = logins.getUsername(nick);
	if (user === undefined)
		return false;
	if (hasPermission(from, nick, user, type, item)) {
		const act = action.split(" ");
		alterEntry((username ? username : user), act[1], act[0], type, item);
		return true;
	}
	return false;
}

function Info(from, type, item) {
	if (type === "command" && !logins.isAdmin(from.split("!")[0]))
		return -2;
	const perm = permissionDB.getOne(type), ret = [];
	if (!perm || !perm[item])
		return -1; // no such item
	if (perm[item].owner && Object.keys(perm[item].owner).length)
		ret.push("Owners: "+Object.keys(perm[item].owner).join(", "));
	if (perm[item].deny && Object.keys(perm[item].deny).length)
		ret.push("Denies: "+Object.keys(perm[item].deny).join(", "));
	if (perm[item].allow && Object.keys(perm[item].allow).length)
		ret.push("Allows: "+Object.keys(perm[item].allow).join(", "));
	if (ret.length)
		return ret;
	return -1; // this is awful
}

function isOwner(from, type, item) {
	if (!permissionDB.hasOne(type))
		return true;
	const nick = from.split("!")[0];
	if (logins.isAdmin(nick))
		return true;
	const user = logins.getUsername(nick);
	if (!user)
		return false;
	const perm = permissionDB.getOne(type);
	if (!perm[item])
		return true;
	if (perm[item].owner) {
		if (perm[item].owner[user])
			return true;
		return false;
	}
	return true; // unclaimed
}

function hasOwner(type, item) {
	const perm = permissionDB.getOne(type);
	if (perm && perm[item] && Object.keys(perm[item]).length)
		if (perm[item].owner !== undefined)
			return true;
	return false;
}

function hasPerms(type, item) {
	const perm = permissionDB.getOne(type);
	if (perm && perm[item] && Object.keys(perm[item]).length)
		return true;
	return false;
}

function Check(from, type, item) {
	const nick = from.split("!")[0];
	if (logins.isAdmin(nick))
		return true; // plebs below!
	const perm = permissionDB.getOne(type);
	if (!perm || !perm[item])
		return true;
	const user = logins.getUsername(nick);
	if (perm[item].owner && user && perm[item].owner[user])
		return true;
	// check allow list - if there is an allow list, we consider it a whitelist. if they aren't on this, deny
	if (perm[item].allow) {
		if (user && perm[item].allow[user])
			return true;
		return false;
	} // check deny list - if there is a deny list but no allow, we consider it a black list.
	if (perm[item].deny) {
		if (user && perm[item].deny[user])
			return false;
		const keys = Object.keys(perm[item].deny);
		for (let i = 0; i < keys.length; i++) {
			if (ial.maskMatch(from, keys[i]))
				return false;
		}
	}
	return true;
}

const perms = {
	DB: permissionDB,
	Action: Action,
	Info: Info,
	isOwner: isOwner,
	hasPerms: hasPerms,
	hasOwner: hasOwner,
	Check: Check
};

plugin.export("perms", perms);
