/**
 *  @file fileDB.js
 *  @exports Json(), List()
 *  @brief Basic List and Json DB functions with access to a write queue
 */
var FileDB = require('./fileDBGeneric.js');

/**
 *  @brief Json extends FileDB
 *  
 *  @param options  {OBJECT}
 *  {
 *    filename {STRING}  Path to the DB file. REQUIRED.
 *    data {STRING}      Default data to write
 *    queue {BOOL}       Whether to use cache
 *    noCreate {BOOL}    Whether to create if not found
 *  }
 *  @return {JSONDB} Instance of Json DB object
 *  
 *  @details Create a new DB object to access and manipulate JSON files
 */
var Json = function Json(options) {
	var cachedDB;
	options.data = options.data || "{}";
	options.filename = "data/" + options.filename + ".json";
	cachedDB = FileDB.call(this, options);
	if (cachedDB) {
		return cachedDB;
	}
	this.type = "Json";
};
Json.prototype = Object.create(FileDB.prototype);


Json.prototype._parse = function parseJson(str) {
	return JSON.parse(str);
}

Json.prototype._stringify = function stringifyJson(obj) {
	return JSON.stringify(obj, null, 3);
}

/**
 *  @brief getAllJson
 *  
 *  @return {OBJECT} Parsed JSON
 *  
 *  @details Gets the entire JSON data object
 */
Json.prototype.getAll = function getAllJson() {
	return this._readFile();
};

/**
 *  @brief getOneJson
 *  
 *  @param key  {STRING} The specific key to access
 *  @return {OBJECT} Parsed JSON of specific key
 *  
 *  @details Gets one key from the JSON data object
 */
Json.prototype.getOne = function getOneJson(key) {
	return (this.getAll())[key];
};

/**
 *  @brief getKeysJson
 *  
 *  @return {ARRAY} Object's keys
 *  
 *  @details Gets a list of keys from the JSON data object
 */
Json.prototype.getKeys = function getKeysJson() {
	return Object.keys(this.getAll());
};

/**
 *  @brief saveAllJson
 *  
 *  @param obj  {OBJECT} Object to stringify to JSON data
 *  @return void
 *  
 *  @details Overwrites the JSON data object with the object supplied
 */
Json.prototype.saveAll = function saveAllJson(obj) {
	this._writeFile(obj);
};

/**
 *  @brief saveOneJson
 *  
 *  @param key   {STRING} Key to (over)write
 *  @param data  {STRING} data to store
 *  @return void
 *  
 *  @details Store data in a certain key of the JSON data obect
 */
Json.prototype.saveOne = function saveOneJson(key, data) {
	var all = this.getAll();
	all[key] = data;
	this.saveAll(all);
	all = null;
	data = null;
};

/**
 *  @brief removeOneJson
 *  
 *  @param key  {STRING} Key to remove
 *  @return void
 *  
 *  @details Deletes the specified key from the JSON data object
 */
Json.prototype.removeOne = function removeOneJson(key) {
	var all = this.getAll();
	delete all[key];
	this.saveAll(all);
	all = null;
};

/**
 *  @brief List extends FileDB
 *  
 *  @param options  {OBJECT}
 *  {
 *    filename {STRING}  Path to the DB file. REQUIRED.
 *    data {STRING}      Default data to write
 *    queue {BOOL}       Whether to use cache
 *    noCreate {BOOL}    Whether to create if not found
 *  }
 *  @return {LISTDB} Instance of List DB object
 *  
 *  @details Create a new DB object to access and manipulate List (.txt) files
 */
var List = function List(options) {
	var cachedDB;
	options.data = options.data || "";
	options.filename = "data/" + options.filename + ".txt";
	cachedDB = FileDB.call(this, options);
	if (cachedDB) {
		return cachedDB;
	}
	this.type = "List";
};
List.prototype = Object.create(FileDB.prototype);

/**
 *  @brief parseArrayList
 *  
 *  @param all  {STRING} List data
 *  @return {ARRAY} Parsed List data
 *  
 *  @details Parse List data argument into an array
 */
List.prototype._parse = function parseArrayList(all) {
	if (all && all.length > 0) {
		all = all.split("\n");
	} else {
		all = [];
	}
	return all;
};

/**
 *  @brief stringifyArrayList
 *  
 *  @param arr   {ARRAY} Array to stringify for file write
 *  @return ~ {STRING} Stringified array
 *  
 *  @details Converts an array to a string
 */
List.prototype._stringify = function stringifyArrayList(arr) {
	return arr.join("\n");
};

/**
 *  @brief getAllList
 *  
 *  @return {ARRAY} Parsed List array
 *  
 *  @details Gets the entire List data array
 */
List.prototype.getAll = function getAllList() {
	return this._readFile();
};

/**
 *  @brief getOneList
 *  
 *  @param data        {STRING|INT} List item you want
 *  @param ignoreCase  {BOOL} Whether to ignore case
 *  @return {STRING|BOOL} The data in question, or false if it doesn't exist
 *  
 *  @details Ensures data argument is in the List, or gets the data index supplied
 */
List.prototype.getOne = function getOneList(data, ignoreCase) {
	var has, all = this.getAll();
	if (typeof data === "string") {
		has = all.some(function (element) {
			if (ignoreCase) {
				return (element.toUpperCase() === data.toUpperCase());
			}
			return (element === data);
		});
		return (has ? data : false);
	}
	data = all[data];
	return data || false;
};

/**
 *  @brief saveAllList
 *  
 *  @param arr  {ARRAY} Data to (over)write to file
 *  @return void
 *  
 *  @details Overwrites the List data array with the array supplied
 */
List.prototype.saveAll = function saveAllList(arr) {
	this._writeFile(arr);
};

/**
 *  @brief saveOneList
 *  
 *  @param data  {STRING} Data to save
 *  @return void
 *  
 *  @details Pushes a data onto the end of the List data array
 */
List.prototype.saveOne = function saveOneList(data) {
	var all = this.getAll();
	all.push(data);
	this.saveAll(all);
	all = null;
	data = null;
};

/**
 *  @brief removeOneList
 *  
 *  @param data        {STRING} Data to be removed
 *  @param ignoreCase  {BOOL} Whether to ignore case
 *  @return void
 *  
 *  @details Removes the specified data from the List data array
 */
List.prototype.removeOne = function removeOneList(data, ignoreCase) {
	var all = this.getAll();
	all = all.filter(function (element) {
		if (ignoreCase) {
			return (element.toLowerCase() !== data.toLowerCase());
		}
		return (element !== data);
	});
	this.saveAll(all);
	all = null;
	data = null;
};

exports.Json = Json;
exports.List = List;

// Save Cache on Exit
process.on("closing", function () {
	lib.events.emit("closing");
	FileDB.queue.saveCache();
});

process.on("SIGINT", function () {
	lib.events.emit("closing");
	FileDB.queue.saveCache();
	setTimeout(function () {
		process.exit();
	}, 500);
});
