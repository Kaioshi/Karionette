// dice roller!

cmdListen({
	command: "roll",
	help: "Roll for initiative sucka!~",
	syntax: config.command_prefix+"roll NdN+N - Example: "+config.command_prefix+"roll 1d20+5 \"1 dice, 20 sides, bonus 5 modifier (optional)\"",
	callback: function (input) {
		var reg, i, k, rolls, roll, total, summary, rollDesc;
		if (!input.args) input.args = [ "1d20" ];
		reg = /(\d+)d(\d+)\+?(\d+)?/i.exec(input.args[0].trim());
		if (!reg) {
			irc.say(input.context, cmdHelp("roll", "syntax"));
			return;
		}
		if (reg[1] > 100) {
			irc.say(input.context, "No.");
			return;
		}
		rolls = [];
		total = 0;
		reg[1] = parseInt(reg[1], 10);
		reg[2] = parseInt(reg[2], 10);
		for (i = 0; i < reg[1]; i++) {
			roll = Math.round((Math.random()*reg[2])+1);
			if (roll > reg[2]) roll = reg[2];
			total += roll;
			rolls.push(roll);
		}
		if (reg[3]) {
			reg[3] = parseInt(reg[3], 10);
			summary = (total+reg[3])+" ["+total+"+"+reg[3]+"] ("+rolls.join(", ")+")";
		} else {
			summary = total+" ("+rolls.join(", ")+")";
		}
		irc.say(input.context, input.nick+" rolled: "+summary);
	}
});

