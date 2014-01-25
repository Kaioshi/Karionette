// Choose your own adventure~
/*
 * ;adventure start <scenario name>
 */
var fs = require('fs'),
	adventure = {};

function prep(text) {
	return text.replace(/\n|\r|\t/g, " ").trim();
}

function loadScenario(channel, scenario) {
	var reg, opts, body, section, sections, i;
	adventure[channel] = {};
	try {
		body = fs.readFileSync("data/cyoa/"+scenario+".cyoa").toString().replace(/\t/g, " ").split("---");
	} catch (error) {
		logger.error("Couldn't read data/cyoa/"+scenario+".cyoa - "+error, error);
		irc.say(channel, "Something has gone awry. Couldn't load the scenario.");
		delete adventure[channel];
		return;
	}
	adventure[channel].title = prep(body[0]);
	body.splice(0,1); // lop off the title.
	sections = {};
	body.forEach(function (entry) { // cleanup
		entry = entry.split("\n");
		section = "";
		for (i = 0; i < entry.length; i++) {
			if (entry[i].length === 0) entry.splice(i,1);
		}
		for (i = 0; i < entry.length; i++) {
			switch (entry[i][0]) {
				case "{":
					section = entry[i][1];
					sections[section] = {};
					sections[section].description = entry[i].slice(4);
					// section marker and description
					break;
				case "[":
					reg = /\[([0-9]+),? ?([0-9]+)?\]/.exec(entry[i]);
					if (!reg) {
						irc.say(channel, "Format error in the scenario: "+entry[i]);
						break;
					}
					sections[section].delay = (parseInt(reg[1], 10)*1000);
					if (reg[2]) sections[section].voteTime = (parseInt(reg[2], 10)*1000);
					// section timer
					break;
				case "<":
					//reg = /\<(\w), (\d)\> ?(.*)?/.exec(entry[i]);
					reg = /\<(\d+)(\*)?\> ?(.*)?/.exec(entry[i]);
					if (!reg) {
						irc.say(channel, "Format error in the scenario: "+entry[i]);
						break;
					}
					if (!sections[section].options) sections[section].options = [];
					sections[section].options.push({
						default: (reg[2] ? true : false),
						goto: reg[1],
						desc: (reg[3] ? reg[3].trim() : "")
					});
					// section option marker
					break;
				case "$":
					if (entry[i].slice(0,4) === "$END") {
						sections[section].end = true;
					}
					break;
				default:
					// no idea.
					logger.debug("Found a weird section in scenario: "+entry[i]);
					break;
			}
		}
	});
	adventure[channel].sections = sections;
	globals.lastAdv = adventure[channel];
	irc.say(channel, "When the options appear, register your vote with "+config.command_prefix+"choose N - Example: "
		+config.command_prefix+"choose 2");
	setTimeout(function () {
		irc.say(channel, adventure[channel].title);
		doSection(channel, 0);
	}, 2000);
}

function tallyVotes(channel) {
	var i,
		tally = {},
		highest = [ 0, 0 ];
	for (i = 0; i < adventure[channel].voting.votes.length; i++) {
		if (tally[adventure[channel].voting.votes[i]]) tally[adventure[channel].voting.votes[i]] += 1;
		else tally[adventure[channel].voting.votes[i]] = 1;
	}
	Object.keys(tally).forEach(function (vote) {
		if (tally[vote] > highest[1]) highest =  [ vote, tally[vote] ];
	});
	return highest[0];
}

function takeVotes(channel, position) {
	var i, def, options = [], valid = [], newpos;
	for (i = 0; i < adventure[channel].sections[position].options.length; i++) {
		valid.push([(i+1), adventure[channel].sections[position].options[i].goto]);
		if (adventure[channel].sections[position].options[i].desc.length > 0) {
			options.push((i+1)+") "+adventure[channel].sections[position].options[i].desc);
		}
		if (adventure[channel].sections[position].options[i].default) {
			def = adventure[channel].sections[position].options[i].goto;
		}
	}
	irc.say(channel, options.join(", "));
	adventure[channel].voting = {
		valid: valid,
		voters: [],
		votes: []
	};
	setTimeout(function () {
		newpos = tallyVotes(channel);
		delete adventure[channel].voting;
		if (!newpos && !def) {
			irc.say(channel, "There was no default option and no votes were recorded. Game ends.");
			delete adventure[channel];
			return;
		}
		if (newpos) {
			for (i = 0; i < valid.length; i++) {
				if (parseInt(newpos,10) === valid[i][0]) {
					newpos = valid[i][1];
					break;
				}
			}
		}
		doSection(channel, (newpos ? newpos : def));
	}, adventure[channel].sections[position].voteTime);
}

function doSection(channel, position) {
	irc.say(channel, adventure[channel].sections[position].description, false);
	if (adventure[channel].sections[position].end) {
		irc.say(channel, "The End.");
		delete adventure[channel];
		return;
	}
	setTimeout(function () {
		takeVotes(channel, position);
	}, adventure[channel].sections[position].delay);
}

cmdListen({
	command: "adventure",
	help: "Starts a Choose your own adventure scenario.",
	syntax: config.command_prefix+"adventure <start/list> [<scenario name>] - Example: "
		+config.command_prefix+"adventure start Pound Escape",
	callback: function (input) {
		var scenario;
		if (!input.args) {
			irc.say(input.context, cmdHelp("adventure", "syntax"));
			return;
		}
		switch (input.args[0]) {
			case "start":
				if (!input.args[1]) {
					irc.say(input.context, "[Help] "+config.command_prefix+"adventure start <scenario> - Example: "
						+config.command_prefix+"adventure start cowfun");
					return;
				}
				scenario = input.args[1];
				if (!fs.existsSync("data/cyoa")) {
					irc.say(input.context, "The data/cyoa directory doesn't exist, so there are no scenarios to load.");
					return;
				}
				if (!fs.existsSync("data/cyoa/"+scenario+".cyoa")) {
					irc.say(input.context, "There's no \""+scenario+"\" scenario. Try "+config.command_prefix+"adventure list");
					return;
				}
				if (adventure[input.context]) {
					irc.say(input.context, "A scenario is already in progress here.");
					return;
				}
				loadScenario(input.context, scenario);
				break;
			case "list":
				break;
			default:
				irc.say(input.context, cmdHelp("adventure", "syntax"));
				break;
		}
	}
});

cmdListen({
	command: "choose",
	help: "Registers your preference on what path to take in Choose your own adventure games.",
	syntax: config.command_prefix+"choose a/b/c/d/e - Example: "
		+config.command_prefix+"choose a",
	callback: function (input) {
		var reg, vote, valid;
		if (!input.args) {
			irc.say(input.context, cmdHelp("choose", "syntax"));
			return;
		}
		if (!adventure[input.context]) {
			irc.say(input.context, "There's no game running in here, so you have nothing to vote on.");
			return;
		}
		if (!adventure[input.context].voting) {
			irc.say(input.context, "Voting is not in progress.");
			return;
		}
		valid = [];
		adventure[input.context].voting.valid.forEach(function (vote) {
			valid.push(vote[0]);
		});
		reg = new RegExp("("+valid.join("|")+")", "i").exec(input.args.join(" "));
		if (!reg) {
			irc.say(input.context, "Invalid choice. Valid options: "+valid.join(", "));
			return;
		}
		if (adventure[input.context].voting.voters.some(function (entry) { return (entry === input.nick); })) {
			irc.say(input.context, input.nick+", you've already voted.");
			return;
		}
		adventure[input.context].voting.votes.push(reg[1]);
		adventure[input.context].voting.voters.push(input.nick);
	}
});



