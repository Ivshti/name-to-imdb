var async = require("async");
var events = require("events");
var qs = require("querystring");
var _ = require("lodash");
var needle = require("needle");

/* Constants
 */
var CACHE_RETRY_TTL = 2*60*60*1000; // if we don't find an item, how long does it stay in the cache as "not found" before we retry it 
var MAX_CACHE_SIZE = 20000;

function assert(condition, log)
{ 
    if (!condition) console.log("name-retriever: "+log); 
}

// In-memory cache for items, avoid flooding Google (or whatever search api we use)
var cache = { };

function metadataFind(query, cb) {
    return cb(null,null);
}

function googleFind(query, cb) {
    var opts = {
        follow_max: 3,
        open_timeout: 15*1000
    };

    if (query.hintUrl) return needle.get(query.hintUrl, opts, function(err, resp, body) {
        if (err) return cb(err);
        var match = body && body.match(new RegExp("\/title\/(tt[0-9]+)\/")); // Match IMDB Id from the whole body
        var id = match && match[1];
        cb(null, id);
    });

    // WARNING this might go offline since it's deprecated; we fallback on simple HTML scraping
    needle.get("http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=large&q="+encodeURIComponent(query.query), opts, function(err, resp, body) {
        var result = body && body.responseData && body.responseData.results && body.responseData.results.length;
        
        // The API doesn't return results at all: fallback to google scraping
        if (err || !(body && body.responseData && body.responseData.results)) {
            cb();
            return retrQueue.push({ hash: query.hash, hintUrl: "https://www.google.com/search?safe=off&site=&source=hp&q="+encodeURIComponent(task.query) });
        }

        if (err) return callback(err);

        var id;
        if (result) body.responseData.results.slice(0, 3).forEach(function(res) {
            if (id) return;

            // Matching IMDB ID strictly
            var match = (query.type!="series" || res.title.match("TV Series")) && res.url.match(new RegExp("\/title\/(tt[0-9]+)\/"));
            var idMatch = match && match[1];

            assert(idMatch, "name-retriever: cannot match an IMDB ID in "+(result && result.url)+" ("+query.query+")");
            if (idMatch) id = idMatch;
        });
        cb(null, id);
    });
}

function nameRetriever()
{ 
    var retriever = new events.EventEmitter();
    var inProgress = {};
    retriever.get = function(task)
    {
        var q = _.pick(task, "name", "year", "type");

        // TODO: hash this once maybe?
        var hash = task.hash = new Buffer(task.hintUrl || _.values(q).join(":")).toString("ascii"); // convert to ASCII since EventEmitter bugs with UTF8
        if (cache.hasOwnProperty(hash)) return task.cb(cache[hash]);

        // Use this system of an EventEmitter + inProgress map to make sure items of the same name are not retrieved multiple times at once
        if (task.cb) retriever.once(hash, task.cb);
        if (inProgress[hash]) return;
        inProgress[hash] = true;

        retriever.once(hash, function(id) {
            delete inProgress[hash];

            // Cache system
            cache[hash] = id; 
            if (! id) setTimeout(function() { delete cache[hash] }, CACHE_RETRY_TTL); // 2 hours cache expiration - if we don't find an ID
        });

        metadataFind(q, function(err, res) {
            if (err) console.error(err);
            if (res) res = res[0];

            assert(res, "NOTMATCHED not matched an metadata item for "+JSON.stringify(q)+" / "+task.name); // log that so we know

            if (res) return retriever.emit(hash, (res.type == task.type) ? res.imdb_id : null);

            if (task.strictName) return retriever.emit(hash, null);

            // WARNING: www. vs not?  is there difference?
            // no quotes - they can actually make the results dumber
            task.query = "site:imdb.com "
                +task.name.toLowerCase()+(task.year ? " "+task.year : "")
                +((task.type=="series") ? " \"tv series\"" : ""); // Compute that now so that we can use the mapping
            googleFind(task, function(err, id) {
                retriever.emit(hash, id);
            });
        });
    };
    
    retriever.setMaxListeners(0); // Unlimited amount of listeners 
    return retriever;
};

var retriever = new nameRetriever();
module.exports = function nameToImdb(args, cb) {
    retriever.get(_.extend({ cb: cb }, typeof(args)=="string" ? {name: args} : args));
};
