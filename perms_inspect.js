var fs = require('fs'),
	perms = fs.readFileSync('data/permissions.json').toString(),
	perms = JSON.parse(perms);

Object.keys(perms).forEach(function (entry) {
	console.log("\n["+entry+"]");
	Object.keys(perms[entry]).forEach(function (item) {
		console.log(" "+item);
		Object.keys(perms[entry][item]).forEach(function (pants) {
			console.log("  "+pants+": "+perms[entry][item][pants].join(", "));
		});
	});
});
