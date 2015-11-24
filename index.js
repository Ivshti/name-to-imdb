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
    if (! condition) console.log("name-retriever: "+log); 
}

/* In-memory cache for items, avoid flooding Google (or whatever search api we use)
 */
var cache = { };

function nameRetriever()
{
    var opts = {
        follow_max: 3,
        open_timeout: 15*1000
    };

    // Queue to retrieve items we can't match in our metadata dataset
    var retriever = new events.EventEmitter(), inProgress = {};
    var retrQueue = async.queue(function(task, cb)
    {
        if (task.hintUrl) return needle.get(task.hintUrl, opts, function(err, resp, body) {
            var match = body && body.match(new RegExp("\/title\/(tt[0-9]+)\/")); // Match IMDB Id from the whole body
            var id = match && match[1];
            delete inProgress[task.hash];
            retriever.emit(task.hash, id, true); // true for "new match"
            cb();
        });

        // WARNING this might go offline since it's deprecated; we fallback on simple HTML scraping
        needle.get("http://ajax.googleapis.com/ajax/services/search/web?v=1.0&rsz=large&q="+encodeURIComponent(task.query), opts, function(err, resp, body) {
        //yahooSearch(task.query, 1, function(err, body)
            if (err) console.error(err);

            var result = body && body.responseData && body.responseData.results && body.responseData.results.length;
            
            // The API doesn't return results at all: fallback to google scraping
            if (err || !(body && body.responseData && body.responseData.results)) {
                cb();
                return retrQueue.push({ hash: task.hash, hintUrl: "https://www.google.com/search?safe=off&site=&source=hp&q="+encodeURIComponent(task.query) });
            }

            var id;
            if (result) body.responseData.results.slice(0, 3).forEach(function(res) {
                if (id) return;

                // Matching IMDB ID strictly
                var match = (task.type!="series" || res.title.match("TV Series")) && res.url.match(new RegExp("\/title\/(tt[0-9]+)\/"));
                var idMatch = match && match[1];

                assert(idMatch, "name-retriever: cannot match an IMDB ID in "+(result && result.url)+" ("+task.query+")");
                if (idMatch) id = idMatch;
            });
            
            delete inProgress[task.hash];
            retriever.emit(task.hash, id, true); // true for "new match"
            cb();
        });
    }, 2); // reduced from 10 to 2 - most of the requests should be handled by Metadata and cache

    retriever.get = function(task)
    {
        var q = _.pick(task, "name", "year", "type");
        if (q.type == "series") q.year = q.year ? new RegExp("^"+q.year) : null;
        if (! q.year) delete q.year;

        // TODO: hash this once maybe?
        var hash = task.hash = new Buffer(task.hintUrl || _.values(q).join(":")).toString("ascii"); // convert to ASCII since EventEmitter bugs with UTF8
        if (cache.hasOwnProperty(hash)) return task.cb(cache[hash]);

        // Use this system of an EventEmitter + inProgress map to make sure items of the same name are not retrieved multiple times at once
        if (task.cb) retriever.once(hash, task.cb);
        if (inProgress[hash]) return;
        inProgress[hash] = true;

        // Cache system
        retriever.once(hash, function(id) {
            cache[hash] = id; 
            if (! id) setTimeout(function() { delete cache[hash] }, CACHE_RETRY_TTL); // 2 hours cache expiration - if we don't find an ID
        });

        metadataFind(q, function(err, res) {
            if (err) console.error(err);
            if (res) res = res[0];

            assert(res, "NOTMATCHED not matched an metadata item for "+JSON.stringify(q)+" / "+task.name); // log that so we know

            if (res) {
                // IMPOSSIBLE - since we have type in the query
                //assert(res.type == task.type, "found metadata for name '"+task.name+"', but type mismatches: "+task.type+" vs "+res.type);
                delete inProgress[hash];
                return retriever.emit(hash, (res.type == task.type) ? res.imdb_id : null);
            };

            if (task.strictName) { 
                delete inProgress[hash];
                return retriever.emit(hash, null);
            }

            // WARNING: www. vs not?  is there difference?
            // no quotes - they can actually make the results dumber
            task.query = "site:imdb.com "
                +task.name.toLowerCase()+(task.year ? " "+task.year : "")
                +((task.type=="series") ? " \"tv series\"" : ""); // Compute that now so that we can use the mapping
            retrQueue.push(task);
        });
    };
    
    retriever.setMaxListeners(0); /* Unlimited amount of listeners */
    return retriever;
};

module.exports = nameRetriever;
