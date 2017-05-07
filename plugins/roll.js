// dice roller!
const lib = plugin.import("lib");

"use strict";
bot.command({
	command: "roll",
	help: "Roll for initiative sucka!~",
	syntax: `${config.command_prefix}roll NdN+N - Example: ${config.command_prefix}roll 1d20+5 "1 dice, 20 sides, bonus 5 modifier (optional)"`,
	callback: function (input) {
		if (!input.args)
			input.args = [ "1d20" ];
		const reg = /(\d+)d(\d+)\+?(\d+)?/i.exec(input.args[0].trim());
		if (!reg) {
			irc.say(input.context, bot.cmdHelp("roll", "syntax"));
			return;
		}
		const rollCount = parseInt(reg[1], 10);
		const dieSize = parseInt(reg[2], 10);
		if (rollCount > 100 || rollCount < 1 || dieSize > 100 || dieSize < 1) {
			irc.say(input.context, "No.");
			return;
		}
		const rolls = [];
		let total = 0;
		for (let i = 0; i < rollCount; i++) {
			const roll = lib.randNum(1, dieSize);
			total += roll;
			rolls.push(roll);
		}
		if (reg[3]) {
			const bonus = parseInt(reg[3], 10);
			irc.say(input.context, `${input.nick} rolled: ${(total+bonus)} [${total}+${bonus}] (${rolls.join(", ")})`);
		} else {
			irc.say(input.context, `${input.nick} rolled: ${total} (${rolls.join(", ")})`);
		}
	}
});
