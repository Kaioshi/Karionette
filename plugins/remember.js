// remembers things
"use strict";
const [DB, lib] = plugin.importMany("DB", "lib"),
	memDB = DB.Json({filename: "remember"}),
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

bot.command({
	command: "remember",
	help: "remembers things so you don't have to. See also: memories, forget, wtf",
	syntax: config.command_prefix+"remember <memory handle> <as/are/is/were> <thing to remember> - Example: "+
			config.command_prefix+"remember Uni's pantsu as being striped white and blue.",
	callback: function (input) {
		let old,
			reg = /(.*) (as|is|are|were) (.*)/.exec(input.data);
		if (!reg) {
			irc.say(input.context, bot.cmdHelp("remember", "syntax"));
			return;
		}
		old = memDB.getOne(reg[1]);
		memDB.saveOne(reg[1], [ reg[2], reg[3] ]);
		if (old)
			irc.say(input.context, "Updated - "+reg[1]+" "+reg[2]+" \""+reg[3]+"\"");
		else
			irc.say(input.context, "Added - "+reg[1]+" "+reg[2]+" \""+reg[3]+"\"");
	}
});

bot.command({
	command: "memories",
	help: "lists memory handles. See also: remember, forget, wtf",
	syntax: config.command_prefix+"memories [-find <string>] - no arg to list memories"+
		" - Example: "+config.command_prefix+"memories -f pantsu",
	callback: function (input) {
		if (!input.args || !input.args[0]) {
			const memories = memDB.data.keys;
			if (memories.length)
				irc.say(input.context, "I have "+memories.length+" memories: "+lib.sort(memories).join(", "));
			else
				irc.say(input.context, "I..I don't remember anything. ;~;");
			return;
		}
		switch (input.args[0]) {
		case "-f":
		case "-find": { // oh god kill me
			if (!input.args[1]) {
				irc.say(input.context, bot.cmdHelp("memories", "syntax"));
				return;
			}
			const term = input.args.slice(1).join(" "),
				handles = [], ret = [];
			memDB.forEach((memory, handle) => {
				if (handle.includes(term))
					handles.push(handle);
				else if (memory[1].includes(term))
					ret.push(handle);
			});
			if (handles.length === 0 && ret.length === 0)
				irc.say(input.context, "No matches. :<");
			else {
				if (handles.length)
					irc.say(input.context, "Memory handles matching \""+term+"\": "+lib.sort(handles).join(", "));
				if (ret.length)
					irc.say(input.context, "Memories matching \""+term+"\": "+lib.sort(ret).join(", "));
			}
			break; // I'm sorry
		}
		default:
			irc.say(input.context, bot.cmdHelp("memories", "syntax"));
			break;
		}
	}
});

bot.command({
	command: "forget",
	help: "forgets .. what was I doing? See also: remember, memories, wtf",
	syntax: config.command_prefix+"forget <memory handle>",
	arglen: 1,
	callback: function (input) {
		if (memDB.getOne(input.data)) {
			memDB.removeOne(input.data);
			irc.say(input.context, "I've forgotten all about "+input.data);
		} else {
			irc.say(input.context, "I don't remember "+input.data+" in the first place.. :\\ - try \""+
				config.command_prefix+"memories\" for a list.");
		}
	}
});

bot.command({
	command: "wtf",
	help: "wtf is wtf? See also: remember, memories, forget",
	syntax: config.command_prefix+"wtf <is/are/was/were> <memory handle> - Example: "+
			config.command_prefix+"wtf is the colour of ranma's pantsu",
	arglen: 2,
	callback: function (input) {
		let reg, memory;
		reg = /(were|are|was|is) (.*)/.exec(input.data);
		memory = memDB.getOne(reg[2]);
		if (!memory) {
			irc.say(input.context, lib.randSelect(dunno));
			return;
		}
		irc.say(input.context, [ reg[2], memory[0], memory[1] ].join(" "));
	}
});
