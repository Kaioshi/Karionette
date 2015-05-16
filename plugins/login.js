// user logins :<
"use strict";
cmdListen({
	command: "identify",
	help: "Identifies you with "+config.nick+". See also: unidentify, whoami, adduser, deluser",
	syntax: config.command_prefix+"identify <username> <password> - via query. \
		You can supply the bot's secret code as the password, if need be.",
	arglen: 2,
	callback: function (input) {
		var result, user;
		if (input.channel) {
			irc.say(input.context, "You need to identify via query. -.-");
			return;
		}
		user = userLogin.Check(input.user);
		if (user) {
			irc.say(input.nick, "You're already logged in as "+user+".");
			return;
		}
		result = userLogin.Login(input.user, input.args[0], input.args[1]);
		if (result === -1) {
			irc.say(input.nick, "Couldn't find user "+input.args[0]+".");
			return;
		}
		if (result) {
			irc.say(input.nick, "You are now identified as "+input.args[0]+".");
		} else {
			irc.say(input.nick, "Identification failed, incorrect password.");
		}
		result = null;
	}
});

cmdListen({
	command: "unidentify",
	help: "Unidentifies you with "+config.nick+". See also: identify, whoami, adduser, deluser",
	callback: function (input) {
		var user = userLogin.Check(input.user);
		if (user) {
			delete userLogin.loggedIn[user];
			delete userLogin.loginCache[input.user];
			userLogin.saveState();
			irc.say(input.nick, "I no longer recognize you as "+user+".");
			return;
		}
		irc.say(input.nick, "Eh? What's that? Someone's talking? I don't recognize you in the first place. You wish you could unidentify..");
	}
});

cmdListen({
	command: "whoami",
	help: "Tells you who you're identified as, if you are. See also: identify, unidentify, adduser, deluser",
	callback: function (input) {
		var user = userLogin.Check(input.user);
		if (user) irc.say(input.context, "I recognize you as \""+user+"\".");
		else {
			irc.say(input.context, "I don't recognize you. Try identifying! "
				+config.command_prefix+"identify <username> <password> - if not, add a user: "
				+config.command_prefix+"adduser <username> <password>");
		}
	}
});

cmdListen({
	command: "set",
	help: "Sets or shows per-user attributes. See also: unset",
	syntax: config.command_prefix+"set [<attribute>] [<value>] - Supply a value to set it, none to show it, \
		or no args to see all attributes.",
	callback: function (input) {
		var username, entry;
		username = userLogin.Check(input.user);
		if (!username) {
			irc.say(input.context, "Unsurprisingly, you need to be logged in to set your attributes.");
			return;
		}
		if (!input.args) {
			entry = userLogin.getAttribute(username);
			irc.say(input.context, (entry ? "You have the following attributes set, "+entry : 
				"You have no attributes set."));
			return;
		}
		if (!input.args[1]) {
			entry = userLogin.getAttribute(username, input.args[0]);
			irc.say(input.context, (entry ? "Your "+input.args[0]+" attribute is set to: \""+entry+"\"" : 
				"No such thing is set."));
			return;
		}
		userLogin.setAttribute(username, input.args[0], input.args.slice(1).join(" "));
		irc.say(input.context, "Ok.");
	}
});

cmdListen({
	command: "unset",
	help: "Unsets per-user attributes. See also: set",
	syntax: config.command_prefix+"unset <attribute> - Supply no args to see your current attributes.",
	callback: function (input) {
		var username, entry;
		username = userLogin.Check(input.user);
		if (!username) {
			irc.say(input.context, "You need to log in first.");
			return;
		}
		if (!input.args) {
			entry = userLogin.getAttribute(username);
			irc.say(input.context, (entry ? "You have the following attributes set, "+entry :
				"You have no attributes set."));
			return;
		}
		entry = userLogin.getAttribute(username, input.args[0]);
		if (!entry) {
			irc.say(input.context, "No such thing is set.");
		} else {
			userLogin.unsetAttribute(username, input.args[0]);
			irc.say(input.context, "\""+input.args[0]+"\" "+lib.randSelect([
				"is no more.",
				"has gone quietly into the night.",
				"has entered its eternal slumber.",
				"has perished.",
				"has been slain.",
				"met its end at the hands of a dainty squirrel.",
				"has been unset.",
				"crossed into the nether.",
				"faded into the mist.",
				"has collapsed on your doorstep, gasping its final breaths before succumbing to the eternal sleep..."
			]));
		}
	}
});

cmdListen({
	command: "adduser",
	help: "Adds a user to the bot. See also: deluser, whoami, identify, unidentify",
	syntax: config.command_prefix+"adduser <username> <password> [<secret>] - \
		via query. Supply the bot's secret code to be recognised as an admin.",
	arglen: 2,
	callback: function (input) {
		var result;
		if (input.channel) {
			irc.say(input.context, "Why would you do this here? Try again via query. \
				Hopefully with a different password!");
			return;
		}
		if (input.args[2]) {
			result = userLogin.Add(input.user, input.args[0], input.args[1], input.args[2]);
			if (result === -3) {
				irc.say(input.nick, "The secret code you supplied is incorrect. Not adding!");
				return;
			}
		} else {
			result = userLogin.Add(input.user, input.args[0], input.args[1]);
		}
		if (result === -2) {
			irc.say(input.nick, "That username is already taken. Choose another or login with it. If you can.");
			return;
		}
		irc.say(input.nick, "Added! Don't forget your password!");
		setTimeout(function () {
			userLogin.Login(input.user, input.args[0], input.args[1]);
		}, 200); // make sure the DB has the entry
	}
});

cmdListen({
	command: "deluser",
	help: "Removes a user from the bot. See also: adduser, whoami, identify, unidentify",
	syntax: config.command_prefix+"deluser <username> [<password>] - via query. \
		Admins don't need the password if it's another user.",
	arglen: 1,
	callback: function (input) {
		var result;
		result = userLogin.Remove(input.user, input.args[0], input.args[1]);
		if (result === -1) {
			irc.say(input.context, "There is no "+input.data+".");
			return;
		}
		if (result) {
			irc.say(input.context, "Removed "+input.args[0]+".");
		} else {
			irc.say(input.context, "Nope.");
		}
	}
});

evListen({
	handle: "loginNick",
	event: "NICK",
	callback: function (input) {
		var user = userLogin.Check(input.user),
			newuser;
		if (user) {
			newuser = input.newnick+"!"+input.address;
			delete userLogin.loginCache[input.user];
			userLogin.loginCache[newuser] = user;
			userLogin.loggedIn[user].user = newuser;
			userLogin.saveState();
		}
	}
});

evListen({
	handle: "loginQuit",
	event: "QUIT",
	callback: function (input) {
		var user = userLogin.Check(input.user);
		if (user) {
			delete userLogin.loginCache[input.user];
			delete userLogin.loggedIn[user];
			userLogin.saveState();
		}
	}
});

