// This plugin handles stuff that goes into data/users
listen({
	handle: "privmsgListen",
	regex: /^:[^!]+!.*@.* PRIVMSG [^ ]+ :.*/i,
	callback: function (input) {
	    if (input.context[0] === '#') {
		    var userDB = new jsonDB("users/" + input.context),
			    date = new Date();
	    } else { return; }
		if (userDB.exists) {
		    var from = input.from;
            userDB.store(input.from.toLowerCase(), { last: input.data, seen: date });
		} else {
			setTimeout(function () {
                userDB.store(input.from.toLowerCase(), { last: input.data, seen: date });
			}, 2000);
		}
	}
});
