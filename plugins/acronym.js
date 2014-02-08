function upperFirst(word) {
	return word[0].toUpperCase()+word.slice(1);
}

function getWord(letter, type) {
	var word, i,
		max = 5000;
	for (i = 0; i < max; i++) {
		word = words[type].random();
		if (word[0] === letter) return word;
	}
	// if we don't have anything, try a noun.
	type = "noun";
	for (i = 0; i < max; i++) {
		word = words[type].random();
		if (word[0] === letter) return word;
	}
	return "???";
}

cmdListen({
	command: "acronym",
	help: "Tries to guess your acronym.",
	syntax: config.command_prefix+"acronym <ACRONYM> - Example: "
		+config.command_prefix+"acronym ENB",
	callback: function (input) {
		var i, line, type, types, letters;
		if (!input.args) {
			irc.say(input.context, cmdHelp("acronym", "syntax"));
			return;
		}
		if (input.args[0].length > 10) {
			irc.say(input.context, "Nope. Too long.");
			return;
		}
		line = "";
		types = [ "verb", "noun", "adjective" ];
		letters = input.args[0].toLowerCase();
		for (i = 0; i < letters.length; i++) {
			type = lib.randSelect(types);
			line += upperFirst(getWord(letters[i], type))+" ";
		}
		irc.say(input.context, line.trim());
	}
});
