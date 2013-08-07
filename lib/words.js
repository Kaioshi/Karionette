var fs = require('fs');

words = {
	verb: { // this needs to be redone from scratch - too simple and too hard to verify syntax
		add: function (line) {
			var i;
			line = line.toLowerCase().split(" ");
			for (i = 0; i < line.length; i++) {
				if (words.verb.get(line[i])) { // this is quite expensive, but add doesn't happen often.
					return "I'm already familiar with "+line[i]+" - "+line.join(", "); // it'll be ok.
				} // DON'T PANIC
			}
			if (line.length < 3 || line[3].slice(-3) !== "ing") {
				return "Nope.";
			}
			line = line.join(" ");
			fs.appendFileSync("data/actback/verbs.txt", line+"\n");
			words.verb.list.push(line);
			return "Added o7";
		},
		remove: function (word) {
			var removed, index;
			if (!word) return "Nope.";
			index = words.verb.get(word, true);
			if (!index) return "Couldn't find "+word;
			removed = words.verb.list.splice(index, 1);
			fs.writeFileSync("data/actback/verbs.txt", words.verb.list.join("\n"));
			return "Removed "+removed+".";
		},
		get: function (word, index) {
			var line, i, k;
			word = word.toLowerCase();
			for (i = 0; i < words.verb.list.length; i++) {
				if (words.verb.list[i].indexOf(word) > -1) {
					line = words.verb.list[i].split(" ");
					for (k = 0; k < line.length; k++) {
						if (line[k] === word) {
							if (index) return i;
							return { base: line[0], s: line[1], ed: line[2], ing: line[3] };
						}
					}
				}
			}
		},
		refresh: function (debug) {
			words.verb.list = [];
			words.verb.list = fs.readFileSync("data/actback/verbs.txt").toString().split("\n");
		},
		random: function () {
			var line = words.verb.list[Math.floor(Math.random()*words.verb.list.length)].split(" ");
			return { base: line[0], s: line[1], ed: line[2], ing: line[3] };
		}
	}
};

words.verb.refresh();
