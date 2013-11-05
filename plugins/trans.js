// translates!
cmdListen({
	command: "trans",
	help: "attempts to translate from language to language. Example: "+config.command_prefix+
		"trans -d enfr pants - see http://www.wordreference.com/docs/api.aspx for a list of dictionaries.",
	syntax: config.command_prefix+"trans [-d dictionary] <word> - Example: "+config.command_prefix+
		"trans -d enfr pants; the default dictionary is \"enja\" - english to japanese.",
	callback: function (input) {
		var dict, term, uri, result, res, tr, compound, comp;
		if (!config.api.wordreference) {
			irc.say(input.context, "Sorry, the wordreference API key is missing from config.");
			return;
		}
		if (!input.args || !input.args[0]) {
			irc.say(input.context, cmdHelp("trans", "syntax"));
			return;
		}
		if (input.args[0] === "-d" && input.args[1] && input.args[2]) {
			dict = input.args[1];
			term = input.args.slice(2).join(" ");
		} else {
			dict = "enja";
			term = input.data;
		}
		uri = "http://api.wordreference.com/0.8/"+config.api.wordreference+"/json/"+dict+"/"+term;
		web.get(uri, function (error, response, body) {
			result = JSON.parse(body);
			//globals.lastRes = result;
			if (result.Error) {
				irc.say(input.context, result.Note.split('\n')[0], false);
			} else {
				if (result.term0) res = result.term0;
				else if (result.term1) res = result.term1;
				if (res) {
					if (res.OtherSideEntries) {
						tr = res.OtherSideEntries[0].OriginalTerm.term;
						if (res.OtherSideEntries[0].OriginalTerm.sense) {
							tr = tr + " ~~ " + res.OtherSideEntries[0].OriginalTerm.sense;
						}
						irc.say(input.context, "("+dict.slice(0,2)+") "+term+" -> ("+dict.slice(2)+") "+tr, false);
					} else {
						if (res.Entries) tr = res.Entries["0"].FirstTranslation["term"];
						else if (res.PrincipalTranslations) tr = res.PrincipalTranslations["0"].FirstTranslation["term"];
						if (result.original && result.original.Compounds) {
							compound = lib.randSelect(Object.keys(result.original.Compounds));
							comp = result.original.Compounds[compound].OriginalTerm["term"]+
								" -> "+result.original.Compounds[compound].FirstTranslation["term"];
							tr = tr + " ~~ " + comp;
						}
						if (tr) irc.say(input.context, "("+dict.slice(0,2)+") "+term+" -> ("+dict.slice(2)+") "+tr, false);
						else irc.say(input.context, "Something has gone awry.");
					}
				} else {
					irc.say(input.context, "No translation was found for "+term, false);
				}
			}
			result = null; tr = null;
		});
	}
});

