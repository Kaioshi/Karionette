// Memory usage report
listen({
    handle: "memstats",
    regex: regexFactory.startsWith("memstats"),
    command: {
        root: "memstats",
        options: "No options",
        help: "Shows memory usage."
    },
    callback: function (input) {
        irc.say(input.context, input.from + ": I'm currently using " + Funcs.memUse() + " MiB of memory.");
    }
});
