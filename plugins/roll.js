// dice roller!

function rollReaction(result, resultMax) {
	var critFail = 1,
		superbad = resultMax/4,
		prettybad = resultMax/3,
		average = resultMax/2,
		good = resultMax/1.5;
	
	if (result === resultMax) {
		return "whips their dick out and critically rolls";
	}
	if (result >= good) {
		return lib.randSelect([
			"smirks and rolls",
			"has a smug look on their face after rolling",
			"high rolls", "casually rolls", "smugly rolls",
			"looks down on everyone after rolling",
			"knows you jelly after rolling",
			"maintains eye contact with you while confidently rolling"
		]);
	}
	if (result >= average) {
		return lib.randSelect([
			"shrugs and rolls",
			"stares blankly and rolls",
			"slips under the radar and rolls",
			"goes \":\\\" after rolling"
		]);
	}
	if (result >= prettybad) {
		return lib.randSelect([
			"offers their Cheetos as compensation after rolling",
			"mehs and rolls",
			"holds onto their "+lib.randSelect([
				"butts","butt", "buttocks", "buttockses",
				"pantsu", "shimapan",
				"teddy bear", "pengu"
				])+" and rolls..",
			"pathetically rolls"
		]);
	}
	if (result === critFail) {
		return lib.randSelect([
			"falls down a flight of stairs mid-roll and gets",
			"commits sudoku, slumps to the ground, the dice slipping from their grasp and rolls",
			"weeps quietly and rolls",
			"holds their breath and rolls",
			"shakes uncontrollably while rolling"
		]);
	}
	if (result <= superbad) {
		return lib.randSelect([
			"narrowly avoids a critical fail with",
			"prays to a false god before rolling",
			"must have some bad karma, they rolled",
			"didn't need a high roll anyway. Right? They rolled"
		]);
	}
	return "calmly";
}

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
		if (reg[1] > 10) {
			irc.say(input.context, "No.");
			return;
		}
		rolls = [];
		total = 0;
		reg[1] = parseInt(reg[1], 10);
		reg[2] = parseInt(reg[2], 10);
		for (i = 0; i < reg[1]; i++) {
			roll = Math.floor(Math.random()*reg[2])+1;
			total += roll;
			rolls.push(roll);
		}
		if (reg[3]) {
			reg[3] = parseInt(reg[3], 10);
			rollDesc = rollReaction((total+reg[3]), (reg[1]*reg[2])+reg[3]);
			summary = (total+reg[3])+" ["+total+"+"+reg[3]+"] ("+rolls.join(", ")+")";
		} else {
			rollDesc = rollReaction(total, (reg[1]*reg[2]));
			summary = total+" ("+rolls.join(", ")+")";
		}
		irc.say(input.context, input.nick+" "+rollDesc+" "+summary);
	}
});

