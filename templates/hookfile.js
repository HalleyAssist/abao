//
// ABAO hooks file {{! Mustache template }}
// Generated from RAML specification
//   RAML: {{ramlFile}}
//   Date: {{timestamp}}
// <https://github.com/HalleyAssist/abao>
//

var
	hooks = require("hooks"),
	Q = require("q"),
	Needle = require("needle"),
	{ assert } = require("chai");

// Handle unhandleds
process.on("unhandledRejection", function (reason, p) {
	console.log("Unhandled Rejection at:", p, "reason:", reason);
	process.exit(1);
});

//
// Setup/Teardown
//

hooks.beforeAll(async function () {
	console.log("Starting RAML test");
	// assert api running
	let defer = Q.defer();
	setTimeout(function () {
		Needle.get("127.0.0.1:3000/info", function (error, response) {
			assert(!error, error);
			assert(response.statusCode == 200, "response code");
			defer.resolve(true);
		});
	}, 1000);
	return defer.promise;
});

hooks.afterAll(function (done) {
	done();
});


//
// Hooks
//

{{#hooks}}
//-----------------------------------------------------------------------------
hooks.before("{{{name}}}", function (test, done) {
	{{#comment}}
	// Modify "test.request" properties here to modify the inbound request
	{{/comment}}
	done();
});

hooks.after("{{{name}}}", function (test, done) {
	{{#comment}}
	// Assert against "test.response" properties here to verify expected results
	{{/comment}}
	done();
});

{{/hooks}}
