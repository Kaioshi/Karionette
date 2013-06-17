// Keeps the bot connected
listen({
	handle: 'ping',
	regex: /^PING :(.+)$/i,
	callback: function(input) {
		irc.pong(input.match[1]);
	}
});