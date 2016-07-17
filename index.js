var async = require("async");
var events = require("events");
var qs = require("querystring");
var _ = require("lodash");
var needle = require("needle");
var Stremio = require("stremio-addons");

// Use cinemeta to pull names of movies and series against IMDB IDs
var stremio = new Stremio.Client();
stremio.add("http://cinemeta.strem.io/stremioget/stremio/v1");
//stremio.add("http://localhost:3005/stremioget/stremio/v1");

// Constants
var CACHE_TTL = 4*60*60*1000; // if we don't find an item, how long does it stay in the cache as "not found" before we retry it 
var MAX_CACHE_SIZE = 20000;

var GOOGLE_AJAX_API = "http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=large&q=";
var GOOGLE_SEARCH = "https://www.google.com/search?safe=off&site=&source=hp&q=";

function assert(condition, log)
{ 
    if (!condition) console.log("name-retriever: "+log); 
}

// Utility to reduce the name to it's most basic form
function simplifyName(n) { 
    if (!n) return n;
    return n.toLowerCase()
        .trim()
        .replace(/\([^\(]+\)$/, "") // remove brackets at end
        .replace(/&/g, "and") // unify & vs "and"
        .replace(/[^0-9a-z ]+/g, " ") // remove any special characters
        .split(" ").filter(function(r){ return r }).join(" ") // remove any aditional whitespaces
};

// Index entry in our in-mem index
function indexEntry(entry) {
    entry.year = parseInt(entry.year.split("-")[0]); // first year for series
    var n = simplifyName(entry.name);
    if (!meta[n]) meta[n] = [];
    meta[n].push(entry);
    byImdb[entry.imdb_id] = entry;
}

// Find in our metadata set
var pulled = { movie: false, series: false };
var meta = { }, byImdb = { };
function metadataFind(query, cb) {
    // It's OK if we don't pass type and we don't fetch names, because 
    if (query.type && !pulled[query.type]) stremio.call("names."+query.type, { }, function(err, res) {
        if (err) console.error(err);
        if (res) res.forEach(indexEntry);
        match();
    });
    else process.nextTick(match);

    function match() {
        var matches = meta[query.name] || [ ];
        var m = _.findWhere(matches, _.pick(query, "year", "type"));
        return cb(null, m && m.imdb_id);
    };
}

// Find in the web / Google
function webFind(task, cb) {
    var opts = {
        follow_max: 3,
        open_timeout: 15*1000,
        headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36" }
    };

    if (task.hintUrl) return needle.get(task.hintUrl, opts, function(err, resp, body) {
        if (err) return cb(err);
        var match = body && body.match(new RegExp("\/title\/(tt[0-9]+)\/")); // Match IMDB Id from the whole body
        var id = match && match[1];
        cb(null, id, { match: task.hintUrl });
    });

    // WARNING: www. vs not?  is there difference?
    // no quotes - they can actually make the results dumber
    var query = "site:imdb.com "
        +task.name.toLowerCase()+(task.year ? " "+task.year : "")
        +((task.type=="series") ? " \"tv series\"" : ""); // Compute that now so that we can use the mapping

    // Google search api is deprecated, use this
    webFind({ hintUrl: GOOGLE_SEARCH+encodeURIComponent(query) }, cb);
}

// Concurrency control
var retriever = new events.EventEmitter();
retriever.setMaxListeners(0); // Unlimited amount of listeners 

var inProgress = { };

// In-memory cache for matched items, to avoid flooding Google (or whatever search api we use)
var cache = { };

// Outside API
function nameToImdb(args, cb) {
    args = typeof(args)=="string" ? { name: args } : args;
    
    var q = _.pick(args, "name", "year", "type");
    q.name = simplifyName(q.name);

    if (! q.name) return cb(new Error("empty name"));

    if (q.year && typeof(q.year)=="string") q.year = parseInt(q.year.split("-")[0]);
    if (q.year && isNaN(q.year)) return cb(new Error("invalid year"));

    if (q.type && !(q.type=="movie" || q.type=="series")) return cb(null, null); // no match for other types

    var hash = new Buffer(args.hintUrl || _.values(q).join(":")).toString("ascii"); // convert to ASCII since EventEmitter bugs with UTF8
    if (cache.hasOwnProperty(hash)) return cb(null, cache[hash]);

    // Use a system of an EventEmitter + inProgress map to make sure items of the same name are not retrieved multiple times at once
    // Since google searches can take some time and we don't want to repeat
    retriever.once(hash, cb);
    cb = function(err, id, inf) { retriever.emit(hash, err, id, inf) };

    if (inProgress[hash]) return;
    inProgress[hash] = true;
    retriever.once(hash, function(err, id) {
        delete inProgress[hash];

        // Cache system
        cache[hash] = id;
        setTimeout(function() { delete cache[hash] }, CACHE_TTL);
    });
    
    // Find it in our metadata, if not, fallback to Google
    metadataFind(q, function(err, id) {
        if (err) return cb(err);
        if (id || args.strict || args.noGoogle) return cb(null, id, { match: "metadata" }); // strict means don't search google
        webFind(args, cb);
    });
};

module.exports = nameToImdb;
module.exports.byImdb = byImdb;
