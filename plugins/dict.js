var net = require('net');

function cleanWhitespace(line) {
	var ret = [];
	line.split(" ").forEach(function (word) {
		if (word.length > 0) ret.push(word);
	});
	return ret.join(" ");
}

function showSuggestions(context, word) {
	var result = [], i, tmp,
		client = new net.Socket();
	client.connect(2628, 'localhost');
	client.on('connect', function () {
		client.write("M * . "+word+"\r\n");
	});
	client.on('data', function (data) {
		data = data.toString().replace(/\r|\t/g, "").split("\n");
		data.forEach(function(line) {
			tmp = line.slice(0,3);
			if (tmp !== "152" && tmp !== "250" &&
				tmp !== "220" && line.length > 0 && line !== ".") {
					result.push(line);
			}
		});
	});
	
	client.on('close', function () {
		//globals.lastData = result;
		logger.debug("Closed dictd connection. "+word);
		if (result[0].slice(0,3) === "552") {
			irc.say(context, "I couldn't find \""+word+"\", nor any suggestions. "+
				lib.randSelect([
					"Don't hate me! :<",
					"English sminglish.",
					"Was it jibberish? I bet it was jibberish.",
					"Sorry :<",
					"I'm not even sorry.",
					"D:",
					">:(",
					"Flippin' engrish."
			]));
			return;
		}
		irc.say(context, "Couldn't find \""+word+"\", perhaps you meant one of these: "+
			cleanWhitespace(result.join(" ").replace(/\n/g, " ").slice(3).replace(/wn /g, "")));
	});
	
	setTimeout(function () {
		logger.debug("Trying to close dictd connection. "+word);
		client.end();
		client.destroy();
		client = null;
	}, 200);
}

cmdListen({
	command: "dict",
	help: "It's a dictionary. What?",
	syntax: config.command_prefix+"dict <word> - Example: "+config.command_prefix+
		"dict obvious",
	callback: function (input) {
		var result = [], tmp, i,
			client = new net.Socket();
		
		if (!input.args || !input.args[0] || input.args[1]) {
			irc.say(input.context, cmdHelp("dict", "syntax"));
			return;
		}
		client.connect(2628, 'localhost');
		client.on('connect', function () {
			client.write("D wn "+input.data+"\r\n");
		});
		
		client.on('data', function (data) {
			data = data.toString();
			if (data.slice(0,3) === "552") {
				showSuggestions(input.context, input.data);
				return;
			} else {
				if (data.slice(0,3) === "220") {
					data = null;
					return;
				}
				result = [];
				data = data.replace(/\r|\t/g, "").split("\n");
				for (i = 0; i < data.length; i++) {
					tmp = data[i].slice(0,3);
					if (tmp !== "151" && tmp !== "250" && tmp !== "150") {
						if (data[i].length > 0 && data[i].toLowerCase() !== input.data.toLowerCase()) {
							result.push(cleanWhitespace(data[i]));
						}
					}
				}
				irc.say(input.context, result.join(" ").slice(0, -2));
			}
		});
		
		setTimeout(function () {
			client.end();
			client.destroy();
			client = null;
		}, 200);
	}
});

