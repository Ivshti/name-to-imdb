var namedQueue = require('named-queue');
var _ = require('lodash');
var helpers = require('./helpers')

var providers = {
    metadata: require('./providers/cinemeta'),
    imdbFind: require('./providers/imdbFind'),
}

var defaultProviders = ['metadata', 'imdbFind']

// Constants
var CACHE_TTL = 12*60*60*1000; // if we don't find an item, how long does it stay in the cache as 'not found' before we retry it 

// In-memory cache for matched items, to avoid flooding Google (or whatever search api we use)
var cache = { };

// Named queue, means that we're not working on one name more than once at a tim
// and a total of 3 names at once
var queue = new namedQueue(worker, 3)

// Outside API
function nameToImdb(args, cb) {
    args = typeof(args)=='string' ? { name: args } : args

    args.name = helpers.simplifyName(args)
    
    var q = _.pick(args, 'name', 'year', 'type')

    if (! q.name)
        return cb(new Error('empty name'))

    if (q.year && typeof(q.year)=='string') q.year = parseInt(q.year.split('-')[0])
    
    if (q.year && isNaN(q.year))
        return cb(new Error('invalid year'))

    if (q.type && !(q.type=='movie' || q.type=='series')) 
        return cb(null, null) // no match for other types

    var key = new Buffer(args.hintUrl || _.values(q).join(':')).toString('ascii') // convert to ASCII since EventEmitter bugs with UTF8
    
    if (cache.hasOwnProperty(key))
        return cb(null, cache[key], { match: 'cache' })

    queue.push({ 
        id: key,
        q: q,
        providers: args.providers || defaultProviders,
    }, function(err, imdb_id, match) {
        if (err)
            return cb(err)
        
        if (imdb_id) {
            cache[key] = imdb_id
            setTimeout(function() { delete cache[key] }, CACHE_TTL)
        }

        cb(null, imdb_id, match)
    })
};

function worker(task, cb) {
    var prov = [].concat(task.providers)

    nextProv()

    function nextProv()
    {
        var n = prov.shift()
        if (! n)
            return cb(null, null)

        var provider = providers[n]
        if (!provider)
            return cb(new Error('unknown provider: '+n))

        provider(task.q, function(err, id) {
            if (err)
                return cb(err)

            if (id)
                return cb(null, id, { match: n })
            else
                nextProv()
        })
    }
}

module.exports = nameToImdb;
