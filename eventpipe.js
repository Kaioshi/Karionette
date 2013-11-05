/*
 * EVENTPIPE: This module binds events to the listeners collection,
 *			  and fires the appropriate event(s) for received data.
 */
module.exports = (function () {
	"use strict";
	var transformAlias, keyCache,
		listeners = {};

	// Re-populate the keyCache
	function setHandles() {
		keyCache = Object.keys(listeners);
	}
	// Evaluates alias strings
	function evaluateAlias(aliasString, aliasVars) {
		return lib.supplant(aliasString, aliasVars);
	}

	// Check if the data contains an aliased command
	transformAlias = (function () {
		var makeVars,
			DB = require('./lib/fileDB.js'),
			aliasDB = new DB.Json({filename: "alias/alias", queue: true}),
			regexFactory = require('./lib/regexFactory.js');

		// Create the supplant object for alias vars
		makeVars = (function () {
			var varDB = new DB.Json({filename: "alias/vars", queue: true}),
				randThings = new DB.List({filename: "randomThings"}).getAll();

			return function makeVars(match, context, from, data) {
				var reg, variable, nicks, newMatch, args, i,
					ret = {};
				while ((reg = /(\{[^\|\(\)\[\] ]+\})/.exec(data))) {
					switch (reg[1]) {
						case "{me}": ret[reg[1]] = irc_config.nick; break;
						case "{from}": ret[reg[1]] = from; break;
						case "{whippingBoy}": ret[reg[1]] = lib.randSelect(irc_config.local_whippingboys); break;
						case "{channel}": ret[reg[1]] = context; break;
						case "{randThing}": ret[reg[1]] = lib.randSelect(randThings); break;
						case "{randNick}":
							nicks = (context[0] === "#" ? ial.Active(context) : []);
							nicks = nicks.filter(function (nick) { return (nick !== from); });
							nicks = (nicks.length > 0 ? nicks : [ "someone", "The Lawd Jesus", "your dad", "Santa" ]);
							ret[reg[1]] = lib.randSelect(nicks);
							nicks = null;
							break;
						case "{verb}": ret[reg[1]] = words.verb.random().base; break;
						case "{verbs}": ret[reg[1]] = words.verb.random().s; break;
						case "{verbed}": ret[reg[1]] = words.verb.random().ed; break;
						case "{verbing}": ret[reg[1]] = words.verb.random().ing; break;
						case "{adverb}": ret[reg[1]] = words.adverb.random(); break;
						case "{adjective}": ret[reg[1]] = words.adjective.random(); break;
						case "{noun}": ret[reg[1]] = words.noun.random(); break;
						case "{pronoun}": ret[reg[1]] = words.pronoun.random(); break;
						case "{personalPronoun}": ret[reg[1]] = words.personalPronoun.random(); break;
						case "{possessivePronoun}": ret[reg[1]] = words.possessivePronoun.random(); break;
						case "{preposition}": ret[reg[1]] = words.preposition.random(); break;
						case "{args*}": ret[reg[1]] = ""; break;
						case "{args1}": ret[reg[1]] = ""; break;
						case "{args2}": ret[reg[1]] = ""; break;
						case "{args3}": ret[reg[1]] = ""; break;
						case "{args4}": ret[reg[1]] = ""; break;
						case "{args1*}": ret[reg[1]] = ""; break; // Apparently
						case "{args2*}": ret[reg[1]] = ""; break; // these are
						case "{args3*}": ret[reg[1]] = ""; break; // used by
						case "{args4*}": ret[reg[1]] = ""; break; // one thing.
						//case "{args-1}": ret[reg[1]] = ""; break; // but not this one.
						default:
							// must be a variable name, or jibberish.
							variable = varDB.getOne(reg[1]);
							if (variable) {
								ret[reg[1]] = variable;
							}
							variable = null;
							break;
					}
					data = data.slice(data.indexOf(reg[1])+reg[1].length);
				}
				if (match[1]) {
					newMatch = lib.supplant(match[1], ret);
					args = newMatch.split(" ");
					ret["{args*}"] = newMatch;
					//ret["{args-1}"] = args[args.length-1]; I'll uncomment these if anyone ever wants them.
					for (i = 0; i < args.length; i++) {
						ret["{args"+(i+1)+"*}"] = args.slice(i).join(" ");
						ret["{args"+(i+1)+"}"] = args[i];
					}
				}
				reg = null; newMatch = null; args = null;
				return ret;
			}
		}());


		return function transformAlias(input) {
			var i, toTransform, aliasMatch, aliasVars, alias,
				aliasKeys = aliasDB.getKeys();
			for (i = 0; i < aliasKeys.length; i += 1) {
				aliasMatch = regexFactory.startsWith(aliasKeys[i]).exec(input.raw);
				if (aliasMatch) {
					alias = aliasDB.getOne(aliasKeys[i]);
					aliasVars = makeVars(aliasMatch, input.context, input.from, alias+" "+input.data);
					toTransform = evaluateAlias(alias, aliasVars);
					if (aliasMatch[1]) {
						input.raw = input.raw.slice(0, -(aliasMatch[1].length) - 1);
					}
					input.raw = input.raw.replace(
						new RegExp("(" + irc_config.command_prefix + "|"
							+ irc_config.nickname.join("[:,-]? |") + "[:,-]? )" + aliasKeys[i], "i"),
						irc_config.command_prefix + toTransform
					);
					aliasMatch = null; toTransform = null; aliasVars = null; aliasKeys = null;
					caveman.emitEvent(input.raw);
					return input.raw;
				}
			}
			return input.raw;
		};
	}());

	// Check if the data fires a plugin, and then do so
	function fireEvent(input) {
		var permission;
		if (input.from) {
			if (input.data.search(RegExp("("
					+ irc_config.command_prefix
					+ "|"
					+ irc_config.nick
					+ "[,:-])", "i")) === 0) {
				transformAlias(input);
			}
		}
		keyCache.forEach(function (element) {
			var match = listeners[element].regex.exec(input.raw);
			if (match) {
				permission = true;
				if (listeners[element].plugin && input.user) {
					permission = permissions.Check("plugin", listeners[element].plugin, input.user);
				}
				if (permission) {
					try {
						listeners[element].callback(input, match);
					} catch (err) {
						logger.error("Caught error in listener " + element + ": " + err, err);
					}
					if (listeners[element].once) {
						delete listeners[element];
						setHandles();
					}
				} else {
					logger.info("Denied " + input.from + " access to " + listeners[element].plugin + " plugin.");
				}
			}
		});
		permission = null;
	}

	return {
		bind: function (evParams) {
			// Error handling
			if (!(evParams.handle && evParams.regex && evParams.callback) || toString.call(evParams.regex) !== '[object RegExp]') {
				logger.error("Script handle " + evParams.handle + ": listen method requires an object with handle, (valid!) regex and callback properties.");
				return;
			}
			// Default values
			evParams.once = evParams.once || false;
			evParams.prefixed = evParams.prefixed || true;
			evParams.command = evParams.command || null;
			evParams.alias = evParams.alias || null;

			// Fill listener object
			listeners[evParams.handle] = {
				plugin: evParams.plugin,
				regex: evParams.regex,
				callback: evParams.callback,
				once: evParams.once,
				cmdPrefix: evParams.prefixed,
				command: evParams.command
			};
		},
		fire: fireEvent,
		purge: function (key) {
			delete listeners[key];
			setHandles();
		},
		purgeOne: function (plugin) {
			// delete any listeners belonging to plugin
			plugin = plugin.toLowerCase();
			Object.keys(listeners).forEach(function (listener) {
				if (listeners[listener].plugin.toLowerCase() === plugin) {
					delete listeners[listener];
				}
			});
		},
		purgeAll: function () {
			listeners = {};
			keyCache = [];
		},
		getCommand: function (key) {
			return listeners[key].command;
		},
		getCommands: function () {
			var i, commands = [];
			for (i = 0; i < keyCache.length; i += 1) {
				if (listeners[keyCache[i]].command) {
					commands.push(listeners[keyCache[i]].command);
				}
			}
			return commands;
		},
		setHandles: setHandles
	};
}());
