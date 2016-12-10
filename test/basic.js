var nameToImdb = require("../index");
var tape = require("tape")
tape("basic test", function(t) {
	nameToImdb({ name: "south park" }, function(err, res, inf) {
		t.error(err);
        t.equals(res, "tt0121955")
        console.log(inf); // inf contains info on where we matched that name - e.g. locally, or on google
	})


})
