// remembers things
var memDB = new DB.Json({filename: "remember"}),
	dunno = [
		"I dunno.",
		"no idea",
		"should I know?",
		"you tell me!",
		"no clue",
		"it's a mystery to all",
		"I *really* like pancakes...",
		"?!",
		"wat",
		"I don't know",
		"I'm not aware of such a thing"
	];

listen({
	plugin: "remember",
	handle: "remember",
	regex: regexFactory.startsWith("remember"),
	command: {
		root: "remember",
		help: "remembers things so you don't have to. See also: memories, forget, wtf",
		syntax: "[Help] Syntax: "
			+config.command_prefix+"remember <memory handle> <as/are/is/were> <thing to remember> - Example: "
			+config.command_prefix+"remember Uni's pantsu as being striped blue and white"
	},
	callback: function (input, match) {
		var old,
			reg = /(.*) (as|is|are|were) (.*)/.exec(match[1]);
		if (!reg) {
			irc.say(input.context, this.command.syntax);
			return;
		}
		old = memDB.getOne(reg[1]);
		memDB.saveOne(reg[1], [ reg[2], reg[3] ]);
		if (old) irc.say(input.context, "Updated - "+reg[1]+" "+reg[2]+" \""+reg[3]+"\"", false);
		else irc.say(input.context, "Added - "+reg[1]+" "+reg[2]+" \""+reg[3]+"\"", false);
	}
});

listen({
	plugin: "remember",
	handle: "memories",
	regex: regexFactory.startsWith("memories"),
	command: {
		root: "memories",
		help: "lists memory handles. See also: remember, forget, wtf",
		options: "-find",
		syntax: "[Help] Syntax: "+config.command_prefix+"memories -f <string> - Example: "
			+config.command_prefix+"memories -f pantsu"
	},
	callback: function (input, match) {
		var args = match[1].split(" "),
			memories, term,
			handles = [],
			ret = [];
		switch (args[0]) {
			case "-f":
			case "-find":
				if (!args[1]) {
					irc.say(input.context, this.command.syntax);
					return;
				}
				term = args.slice(1).join(" ");
				memories = memDB.getAll();
				Object.keys(memories).forEach(function (memory) {
					if (memory.indexOf(term) > -1) handles.push(memory);
					else if (memories[memory][1].indexOf(term) > -1) ret.push(memory);
				});
				if (handles.length === 0 && ret.length === 0) {
					irc.say(input.context, "No matches. :<");
				} else {
					if (handles.length > 0) {
						irc.say(input.context, "Memory handles matching \""+term+"\": "+handles.join(", "), false);
					}
					if (ret.length > 0) {
						irc.say(input.context, "Memories matching \""+term+"\": "+ret.join(", "), false);
					}
				}
				break;
			default:
				memories = Object.keys(memDB.getAll());
				if (memories.length === 0) irc.say(input.context, "I..I don't remember anything. ;~;");
				else {
					irc.say(input.context, "I remember "+memories.join(", "), false);
				}
				break;
		}
	}
});

listen({
	plugin: "remember",
	handle: "forget",
	regex: regexFactory.startsWith("forget"),
	command: {
		root: "forget",
		help: "forgets .. what was I doing? See also: remember, memories, wtf",
		syntax: "[Help] Syntax: "+config.command_prefix+"forget <memory handle>"
	},
	callback: function (input, match) {
		if (memDB.getOne(match[1])) {
			memDB.removeOne(match[1]);
			irc.say(input.context, "I've forgotten all about "+match[1], false);
		} else {
			irc.say(input.context, "I don't remember "+match[1]+" in the first place.. :\\ - try "
				+config.command_prefix+"memories", false);
		}
	}
});

listen({
	plugin: "remember",
	handle: "wtf",
	regex: regexFactory.startsWith("wtf"),
	command: {
		root: "wtf",
		help: "wtf is wtf? See also: remember, memories, forget",
		syntax: "[Help] Syntax: "
			+config.command_prefix+"wtf is <memory handle> - Example: "
			+config.command_prefix+"wtf is the colour of ranma's pantsu"
	},
	callback: function (input, match) {
		var reg = /(were|are|was|is) (.*)/.exec(match[1]),
			memory = memDB.getOne(reg[2]);
		if (!memory) {
			irc.say(input.context, lib.randSelect(dunno));
			return;
		}
		irc.say(input.context, [ reg[2], memory[0], memory[1] ].join(" "), false);
	}
});

