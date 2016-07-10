# Karionette

Node.js IRC bot

Originally forked from: https://github.com/Deide/Marionette (since removed)

## Features
* alias and variable support - see ```;help alias``` / ```;help var```
* silly responses to questions ("actback")
* url title snarfer
* url shortener
* seen
* reminders
* on-seen messages - ;tell Nick <message>
* subreddit announcer
* searches: google, youtube, urbandictionary, regular dictionary, myanimelist, tv guide
* gfycat frontend
* plugins can be reloaded on the fly
* ```;learn``` thing = description of thing -> !thing will then tell the user the description
* other.

### Alias and variable notes
The aliases support quite a few built-in variables, and can also use user defined variables.
Built in alias variables:

* ```{me}``` - bot's nick
* ```{from}``` - nick of the person who used the alias
* ```{whippingBoy}``` - randomly chooses from a list of names provided in config
* ```{channel}``` - channel the alias was used in
* ```{randThing}```- pulls a random "thing" from a DB - which can be added to via ;thing add thing here
* ```{randNick}``` - randomly chooses a nick from the users who have spoken in the last 10 minutes
  * if none have spoken in 10 minutes it uses other random names
* ```{#N-N}``` - random number generator - for example, ```{#1-10}``` would return a number between 1 and 10
* ```{args*}``` - any arguments supplied to the alias - for example it would capture ```;aliasName arguments here```
* ```{args1}``` - the first argument supplied to the alias
* ```{args1*}``` - the first, and the rest of the arguments after that
* ```{args2}``` - the second argument..
  * this stops at ```{args4*}```, because no use case has wanted more. In fact, ```{args*}``` is almost always used.
* The bot also has a basic dictionary and can do:
  * ```{verb}``` ```{verbs}``` ```{verbed}``` ```{verbing}```
  * ```{adverb}``` ```{adjective}``` ```{preposition}```
  * ```{noun}``` ```{nouns}``` ```{pronoun}``` ```{personalPronoun}``` ```{posessivePronoun}```

There is also a random selection syntax:

  * ```{(thing or|other thing)}``` - you can nest variables too, built in or user defined. variables can hold the random selector too - ```;var add randthingy {(button|shoe|banana|your dad)}``` - then in an alias reference ```{randthingy}``` and you will get one of the random elements - for example: ```;alias add thing say {randthing}``` which is called by ```;thing``` will return button, shoe, banana, or your dad.

User variables can be defined with ```;var add varName variable contents```

* ```;var add cookie`chocolate chip cookie```

## Dependencies & Install

* You will need [curl](https://github.com/curl/curl) installed for web fetches.
* Copy "config.example" to "config" and edit appropriately.
* Copy the "DEFAULT_data" directory to "data"; there are things you can edit in here, too.
  * This is quite important. Certain things wont work without the word lists for example.
* Once the bot is up and running, add a new user as admin by doing ```;adduser [username] [password] [secret code from your config file]```
  * for example: ```;adduser SuperCoolGuy SuperCoolPassword SuperCoolSecret```
* You then identify if the bot has forgotten you with ```;identify SuperCoolGuy SuperCoolPassword```
* You should launch the bot with --expose-gc and gc: true in the config.
  * $ node --expose-gc boot.js
* I use a simple bash script:

### If you have any problems or questions, feel free to drop by #pyoshi on irc.esper.net and ask - watch out for ranma though. He's bitey.
