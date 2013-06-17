// This plugin handles stuff that goes into data/users
listen({
	handle: "privmsgListen",
	regex: /^:[^!]+!.*@.* PRIVMSG [^ ]+ :.*/i,
	callback: function (input) {
		var userDB = new jsonDB("users/" + input.from),
			date = new Date();
		if (userDB.exists) {
			userDB.store("last", { message: input.data, seen: date });
		} else {
			setTimeout(function () {
				userDB.store("last", { message: input.data, seen: date });
			}, 2000);
		}
	}
});