// http://unicodeemoticons.com/
// http://rishida.net/tools/conversion/

listen({
	handle: 'mad',
	regex: regexFactory.only("get mad"),
	callback: function (input) {
		irc.say(input.context, "(\u256F\u00B0\u25A1\u00B0\uFF09\u256F\uFE35 \u253B\u2501\u253B", false);
	}
});

listen({
	handle: 'dis',
	regex: regexFactory.only("dis"),
	callback: function (input) {
		irc.say(input.context, "\u0CA0_\u0CA0", false);
	}
});

listen({
	handle: 'soviet russia',
	regex: regexFactory.only("soviet russia"),
	callback: function (input) {
		irc.say(input.context, "\u252C\u2500\u252C\uFEFF \uFE35 /(.\u25A1. \\\uFF09", false);
	}
});

listen({
	handle: 'calm',
	regex: regexFactory.only("calm down"),
	callback: function (input) {
		irc.say(input.context, "\u252C\u2500\u2500\u252C \u30CE( \u309C-\u309C\u30CE)", false);
	}
});

listen({
	handle: 'cool',
	regex: regexFactory.only("be cool"),
	callback: function (input) {
		irc.say(input.context, "\u2022_\u2022)", false);
		setTimeout(function () {
			irc.say(input.context, "( \u2022_\u2022)>\u2310\u25A0-\u25A0", false);
		}, 750);
		setTimeout(function () {
			irc.say(input.context, "(\u2310\u25A0_\u25A0)", false);
		}, 1500);
	}
});

// flips dudes
listen({
	handle: "flip",
	regex: regexFactory.startsWith("flip"),
	command: {
		root: "flip",
		options: "{What to flip}",
		help: "Flips a motherflipper"
	},
	callback: function (input, match) {
		var i, c, r, last, result,
			target = match[1].toLowerCase(),
			flipTable = {
				a : '\u0250',
				b : 'q',
				c : '\u0254',
				d : 'p',
				e : '\u01DD',
				f : '\u025F',
				g : '\u0183',
				h : '\u0265',
				i : '\u0131',
				j : '\u027E',
				k : '\u029E',
				//l : '\u0283',
				m : '\u026F',
				n : 'u',
				p : 'd',
				r : '\u0279',
				t : '\u0287',
				u : 'n',
				v : '\u028C',
				w : '\u028D',
				y : '\u028E',
				'.' : '\u02D9',
				'[' : ']',
				'(' : ')',
				'{' : '}',
				'?' : '\u00BF',
				'!' : '\u00A1',
				"\'" : ',',
				'<' : '>',
				'_' : '\u203E',
				'\u203F' : '\u2040',
				'\u2045' : '\u2046',
				'\u2234' : '\u2235'
			};
		if (!target) { target = input.context.toLowerCase(); }
		last = target.length - 1;
		result = [target.length];

		for (i = last; i >= 0; i -= 1) {
			c = target.charAt(i);
			r = flipTable[c];
			result[last - i] = r || c;
		}
		result = result.join("");
		irc.say(input.context, "(\u256F\u00B0\u25A1\u00B0\uFF09\u256F\uFE35 " + result, false);
	}
});