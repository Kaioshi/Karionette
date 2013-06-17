// This plugin handles stuff that goes into data/users
listen({
	handle: "privmsgListen",
	regex: /^:[^!]+!.*@.* PRIVMSG [^ ]+ :.*/i,
	callback: function (input) {
	    if (input.context[0] === '#') {
		    var userDB = new jsonDB("users/" + input.context),
			    date = new Date();
            
            if (input.data.substring(0,7) === "\u0001ACTION") {
	            var msg = "* "+input.from+input.data.slice(7,-1);
            } else {
                var msg = "<"+input.from+"> "+input.data;
            }
            
            if (userDB.exists) {
                userDB.store(input.from.toLowerCase(), { last: msg, seen: date });
            } else {
                setTimeout(function () {
                    userDB.store(input.from.toLowerCase(), { last: msg, seen: date });
                }, 2000);
            }
        }
    }
});
