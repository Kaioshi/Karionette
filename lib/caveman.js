require("./funcs.js");

function getType(line) {
	if (line[0] !== ":") {
		return line.slice(0, line.indexOf(" "));
	}
	line = line.slice(line.indexOf(" ") + 1);
	return line.slice(0, line.indexOf(" "));
}

function getNick(line) {
	return line.slice((line[0] === ":" ? 1 : 0), line.indexOf("!"));
}

function getAddress(line) {
	return line.slice(line.indexOf("!") + 1);
}

caveman = {
	emitEvent: function (input) {
		var params = { raw: input },
			type = getType(input);
		//logger.debug("["+type+"] "+input);
		input = input.split(" ");
		if (input[0].indexOf("!") > -1) {
			params.nick = getNick(input[0]);
			params.address = getAddress(input[0]);
		}
		if (input[2] && input[2].indexOf("#") > -1) {
			params.channel = (input[2][0] !== ":" ? input[2] : input[2].slice(1));
		}
		switch (type) {
		case "PRIVMSG":
			params.message = input.slice(3).join(" ").slice(1);
			break;
		case "PING":
			params.challenge = input[1].slice(1);
			break;
		case "MODE":
			params.mode = input[3];
			params.affected = input.slice(4).join(" ");
			break;
		case "TOPIC":
			params.topic = input.slice(3).join(" ").slice(1);
			break;
		case "PART":
			params.reason = (input[3] ? input.slice(3).join(" ").slice(1) : "");
			break;
		case "NICK":
			params.newnick = input[2].slice(1);
			break;
		case "QUIT":
			params.reason = input.slice(2).join(" ").slice(1);
			break;
		case "KICK":
			params.kicked = input[3];
			params.reason = input.slice(4).join(" ").slice(1);
			break;
		}

		lib.events.emit("Event: " + type, params);
	},
	eventListen: function (event) {
		var i, events, k,
			funcStr = event.callback.toString();
		if (!(event.handle && event.event && event.callback)) {
			logger.error("Incorrect caveman.eventListen format - need at least an event and a callback.");
			return;
		}
		// check for dupes
		for (i = 0; i < caveman.eventList.length; i += 1) {
			if (caveman.eventList[i].id === event.handle) {
				// remove stale listener
				events = lib.events.listeners("Event: " + event.event);
				for (k = 0; k < events.length; k += 1) {
					if (events[k].toString() === caveman.eventList[i].func) {
						lib.events.removeListener("Event: " + event.event, events[k]);
					}
				}
				caveman.eventList.splice(i, 1);
			}
		}
		caveman.eventList.push({ id: event.handle, func: funcStr });
		lib.events.on("Event: " + event.event, event.callback);
	}
};

if (!caveman.eventList) {
	caveman.eventList = [];
}

