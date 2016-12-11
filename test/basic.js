var nameToImdb = require("../index");
var tape = require("tape")

tape("basic test - match from google (type not provided)", function(t) {
	nameToImdb({ name: "south park" }, function(err, res, inf) {
		t.error(err);
		t.equals(res, "tt0121955")
		t.ok(inf)
		t.ok(inf.match && inf.match.match("google"), "is matched on google");
		t.end()
		//console.log(inf); // inf contains info on where we matched that name - e.g. locally, or on google
	})
})

tape("basic test", function(t) {
	nameToImdb({ name: "south park", type: "series" }, function(err, res, inf) {
		t.error(err);
		t.equals(res, "tt0121955")
		t.ok(inf)
		t.ok(inf.match && inf.match === "metadata", "is matched on cinemeta");
		t.end()
	})
})
