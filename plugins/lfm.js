var lfmBindingsDB = new jsonDB("lfm");

// Last.fm
listen({
    handle: "lfm",
    regex: regexFactory.startsWith("lfm"),
    command: {
        root: "lfm",
        options: "-bind -prev",
        help: "Syntax: lfm [<account if not bound>] - lfm -bind <account> - lfm -prev [<account>]"
    },
    callback: function (input) {
        var result, uri, boundName, target, args = input.match[1].split(" ");

        target = lfmBindingsDB.getOne(input.from);
        if (!target) target = input.from;

        if (args[0]) {
            switch (args[0]) {
                case "-bind":
                    if (args[1]) {
                        lfmBindingsDB.store(input.from, args[1]);
                        irc.say(input.context, "At your service :)");
                    } else {
                        irc.say(input.context, "What am I binding?");
                    }
                    break;
                case "-prev":
                    if (args[1]) target = args[1];
                    var prev = 1;
                    break;
                default:
                    target = input.match[1];
                    break;
            }
        }
		
        if (target) {
            uri = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + target + "&api_key=f3544338f77b206c89b4bc9aab1e2a60&format=json";
            web.get(uri, function (error, response, body) {
                result = JSON.parse(body).recenttracks;
                if (prev) var tn = 1;
                else var tn = 0;
                try {
                    var artist = result.track[tn].artist["#text"];
                    var song = result.track[tn].name;
                    irc.say(input.context, target + ": " + artist + " ~ " + song,false);
                } catch (err) {
                    irc.say(input.context, "Pantsu~",false);
                }
            });
        }
    }
});
