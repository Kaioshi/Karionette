var DB = require("./fileDB.js"),
	permsDB = new DB.Json({ filename: "permissions" }),
	adminDB = new DB.Json({ filename: "admins" }),
	admins = adminDB.getAll(),
	perms = permsDB.getAll();

function getOne(db, type) {
	if (!db[type]) return;
	return db[type];
}

function clearAdminCache() {
	delete globals.admins;
	globals.admins = { lastCheck: new Date().getTime() };
}

permissions = {
	Syntax: "[Help] Syntax: permissions <allow/deny/owner> <add/remove/list> <function/variable/alias> <name> [<mask>]",
	Example: "Example: permissions deny add variable anime_list mitch*!*@*",
	Check: function (type, item, user) {
		if (type.match(/plugin|function|alias|variable/i) && item && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
			//logger.debug("permissions.Check(" + [ type, item, user ].join(", ") + ") called.");
			if (this.isAdmin(user)) return true; // jebus
			type = type.toLowerCase();
			item = item.toLowerCase();
			var entry = getOne(perms, type);
			if (entry && entry[item]) {
				if (entry[item]["owner"] && entry[item]["owner"].length > 0) {
					var owner = false;
					entry[item]["owner"].some(function (element) {
						if (ial.maskMatch(user, element)) owner = true;
					});
					if (owner) return owner;
				}
				if (entry[item]["deny"] && entry[item]["deny"].length > 0) {
					var blacklist = true;
					entry[item]["deny"].some(function (element) { 
						if (ial.maskMatch(user, element)) blacklist = false;
					});
					return blacklist;
				}
				if (entry[item]["allow"] && entry[item]["allow"].length > 0) {
					var whitelist = false;
					entry[item]["allow"].some(function (element) {
						if (ial.maskMatch(user, element)) whitelist = true;
					});
					return whitelist;
				} // need to adapt this to allow having a deny with exceptions (which are in the allow list)
			}
			return true;
		}
		logger.warn("permissions.Check(" + [ type, item, user ].join(", ") + ") called improperly.");
		return false;
	},
	Search: function (item) {
		// returns a list of matching entries
		var ret = [];
		if (perms) {
			Object.keys(perms).forEach(function (type) {
				Object.keys(perms[type]).forEach(function (entry) {
					if (entry == item) {
						ret.push([ type, entry ]);
					}
				});
			});
		}
		return ret;
	},
	isAdmin: function (user) {
		if (globals.admins[user] !== undefined) {
			return globals.admins[user];
		}
		var ret = false;
		Object.keys(admins).forEach(function (entry) {
			admins[entry].forEach(function (mask) {
				if (ial.maskMatch(user, mask)) ret = true;
			});
		});
		globals.admins[user] = ret;
		return ret;
	},
	isOwner: function (type, item, user) {
		if (type.match(/alias|variable/i) && item && user.match(/[^ ]+![^ ]+@[^ ]+/)) {
			if (this.isAdmin(user)) return true; // jebus
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				entry = getOne(perms, type),
				owner = false;
			if (!entry || !entry[item] || !entry[item]["owner"] && type.match(/alias|variable/i)) {
				return true; // unclaimed non-function, let 'em at it.
			}
			entry[item]["owner"].some(function (element) {
				if (ial.maskMatch(user, element)) owner = true;
			});
			return owner;
		} else {
			logger.warn("permissions.isOwner() called improperly.");
			return false;
		}
	},
	Delete: function (from, type, item) {
		// removes all permissions
		if (type.match(/alias|variable/i) && item && from.match(/[^ ]+![^ ]+@[^ ]+/)) {
			var type = type.toLowerCase(),
				item = item.toLowerCase();
			if (perms[type][item]) {
				delete perms[type][item];
				permsDB.saveAll(perms);
				logger.debug("permissions.Delete("+[from, type, item].join(", ")+") deleted permissions.");			
			} else {
				logger.warn("permissions.Delete("+[from, type, item].join(", ")+") tried to delete non-existent permissions.");
			}
		} else {
			logger.warn("permissions.Delete() called improperly.");
		}
	},
	Modify: function (from, type, item, permission, action, mask) {
		if (type.match(/plugin|function|alias|variable/i) && item && permission.match(/allow|deny|owner/i) && action.match(/add|remove/i) && mask.match(/\?|\*/)) {
			logger.debug("permissions.Modify(" + [ from, type, item, permission, action, mask ].join(", ") + ") called");
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				permission = permission.toLowerCase(),
				action = action.toLowerCase(),
				entry = getOne(perms, type) || {},
				other = (permission === "deny") ? "allow" : "deny";
			// need to be an admin to change permissions on functions and plugins.
			if (type.match(/plugin|function/) && !this.isAdmin(from)) {
				return "You need to be an admin to change permissions for plugins or functions.";
			}
			if ((!entry || !entry[item] || !entry[item][permission] || entry[item][permission].length === 0) && action === "remove") {
				return "The "+item+" "+type+" has no permissions set.";
			}
			if (!entry[item]) entry[item] = {};
			if (!entry[item][permission]) entry[item][permission] = [];
			if (entry[item][permission].some(function (item) { return (item === mask); })) {
				if (action === "remove") {
					entry[item][permission] = entry[item][permission].filter(function (elem) { return (elem !== mask); });
					perms[type] = entry;
					permsDB.saveAll(perms);
					return mask+" has been removed from the "+permission+" list for the "+item+" "+type+".";
				} else {
					return mask+" is already in the "+permission+" list for the "+item+" "+type+".";
				}
			} else if (action === "remove") {
				return mask+" is not in the "+permission+" list for the "+item+" "+type+".";
			}
			// remove from the opposite list if they're in it and we're adding an allow/deny
			if (permission !== "owner" && action === "add" && (entry[item][other] && entry[item][other].length > 0)) {
				entry[item][other] = entry[item][other].filter(function (elem) { return (elem !== mask); });
			}
			entry[item][permission].push(mask);
			perms[type] = entry;
			permsDB.saveAll(perms);
			return mask+" has been added to the "+permission+" list for the "+item+" "+type+".";
		} else {
			logger.warn("permissions.Modify("+ [ type, item, permission, action, mask ].join(", ") +") called incorrectly.");
			return this.Syntax + " - " + this.Example;
		}
	},
	List: function (type, item, permission) {
		if (type.match(/plugin|function|alias|variable/i) && item && permission.match(/allow|deny|owner/i)) {
			var type = type.toLowerCase(),
				item = item.toLowerCase(),
				entry = getOne(perms, type);
			if (!entry || !entry[item] || !entry[item][permission] || entry[item][permission].length === 0) return;
			return entry[item][permission];
		} else {
			logger.warn("permissions.List() called improperly.");
			return;
		}
	},
	Allow: {
		Add: function (from, type, item, mask) {
			return permissions.Modify(from, type, item, "allow", "add", mask);
		},
		Remove: function (from, type, item, mask) {
			return permissions.Modify(from, type, item, "allow", "remove", mask);
		},
		List: function (type, item) {
			if (!type || !item) return permissions.Syntax + " - " + permissions.Example;
			if (type.match(/plugin|function|alias|variable/i) && item) {
				var list = permissions.List(type, item, "allow");
				if (list) return item+" "+type+" -> Allow: "+list.join(", ");
				return "The "+item+" "+type+" has no allow permissions set, if it exists.";
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		}
	},
	Deny: {
		Add: function (from, type, item, mask) {
			return permissions.Modify(from, type, item, "deny", "add", mask);
		},
		Remove: function (from, type, item, mask) {
			return permissions.Modify(from, type, item, "deny", "remove", mask);
		},
		List: function (type, item) {
			if (!type || !item) return permissions.Syntax + " - " + permissions.Example;
			if (type.match(/plugin|function|alias|variable/i) && item) {
				var list = permissions.List(type, item, "deny");
				if (list) return item+" "+type+" -> Deny: "+list.join(", ");
				return "The "+item+" "+type+" has no deny permissions set, if it exists.";
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		}
	},
	Owner: {
		Add: function (from, type, item, mask) {
			if (type.match(/alias|variable/i) && item && mask.match(/\?|\*/) && from.match(/[^ ]+![^ ]+@[^ ]+/)) {
				if (permissions.isOwner(type, item, from)) {
					return permissions.Modify(from, type, item, "owner", "add", mask);
				} else {
					return "You need to be an owner to add others.";
				}
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		},
		Remove: function (from, type, item, mask) {
			if (type.match(/alias|variable/i) && item && mask.match(/\?|\*/) && from.match(/[^ ]+![^ ]+@[^ ]+/)) {
				if (permissions.isOwner(type, item, from)) {
					return permissions.Modify(from, type, item, "owner", "remove", mask);
				} else {
					return "You need to be an owner to remove others.";
				}
			} else {
				return permissions.Syntax + " - " + permissions.Example;
			}
		},
		List: function (from, type, item) {
			if (!type || !item) return persmissions.Syntax + " - " + permissions.Example;
			if (type.match(/alias|variable/i) && item && from.match(/[^ ]+![^ ]+@[^ ]+/)) {
				if (permissions.isOwner(type, item, from)) {
					var list = permissions.List(type, item, "owner");
					if (list) return item+" "+type+" -> Owner: "+list.join(", ");
					return "The "+item+" "+type+" has no owners set, if it exists.";
				} else {
					return "You need to be an owner to list others.";
				}
			}
		}
	},
	Admin: {
		Add: function (from, user, mask) {
			if (from && user && mask) {
				if (permissions.isAdmin(from)) {
					if (admins[user]) {
						admins[user].push(mask);
						adminDB.saveAll(admins);
						clearAdminCache();
						return "Added "+mask+" to "+user+"'s masks.";
					}
					adminDB.saveOne(user, mask);
					admins[user] = [ mask ];
					clearAdminCache();
					return user + " is now an admin.";
				} else {
					return "You need to be an admin to add one. >:(";
				}
			} else {
				return "[Help] Syntax: admin add Nick Nick!*user@*.host.mask.org";
			}
		},
		Remove: function (from, user, mask) {
			if (from && user) {
				if (permissions.isAdmin(from)) {
					if (admins[user]) {
						if (mask) {
							var len = admins[user].length;
							admins[user] = admins[user].filter(function (entry) {
								return (entry.toLowerCase() !== mask.toLowerCase());
							});
							if (len === admins[user].length) return mask + " wasn't found in "+user+"'s mask list.";
							adminDB.saveAll(admins);
							clearAdminCache();
							return "Removed "+mask+" from "+user+"'s masks.";
						}
						delete admins[user];
						adminDB.saveAll(admins);
						clearAdminCache();
						return user + " is no longer an admin. :<";
					} else {
						return user + " is not an admin.";
					}
				} else {
					return "You need to be an admin to remove one. >:(";
				}
			} else {
				return "[Help] Syntax: admin remove Nick [*!*user@*mask] - if mask is supplied, removes the mask - otherwise the entire user.";
			}
		},
		List: function (from, user) {
			if (from && permissions.isAdmin(from)) {
				if (!user) return Object.keys(admins).join(", ");
				if (!admins[user]) return "There is no such admin.";
				return admins[user].join(", ");
			} else {
				return "You need to be an admin to list them. :<";
			}
		},
		Secret: function (from, secret, mask) {
			logger.debug("permissions.Admin.Secret("+[from, secret, mask].join(", ")+") called.");
			if (from.match(/[^ ]+![^ ]+@[^ ]+/) && secret === irc_config.secret) {
				var mask = (mask ? mask : ial.toMask(from)),
					user = from.split("!")[0];
				if (!mask.match(/\*|\?/)) return mask + " is not a valid mask, sorry.";
				admins[user] = [ mask ];
				adminDB.saveAll(admins);
				clearAdminCache();
				return user + " is now an admin with the mask "+mask+", use permissions admin add "+user+" *!*mask@*youwant.org to add more.";
			} else {
				logger.debug("permissions.Admin.Secret("+[from, secret, mask].join(", ")+") called incorrectly.");
				return "[Help] Syntax: secret <secret> [mask]";
			}
		}
	}
};

