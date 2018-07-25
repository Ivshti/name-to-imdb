var Stremio = require("stremio-addons");

var helpers = require("../helpers")

// Use cinemeta to pull names of movies and series against IMDB IDs
var stremio = new Stremio.Client();
stremio.add("http://cinemeta.strem.io/stremioget/stremio/v1");
//stremio.add("http://localhost:3005/stremioget/stremio/v1");

// Index entry in our in-mem index
function indexEntry(entry) {
    if (entry.year) entry.year = parseInt(entry.year.toString().split("-")[0]); // first year for series
    var n = helpers.simplifyName(entry);
    if (!meta[n]) meta[n] = [];
    meta[n].push(entry);
    byImdb[entry.imdb_id] = entry;
}

// Find in our metadata set
var pulled = { movie: false, series: false };
var meta = { }, byImdb = { };

function metadataFind(query, cb) {
    // It's OK if we don't pass type and we don't fetch names, because we will go to google fallback
    if (query.type && !pulled[query.type]) stremio.call("names."+query.type, { }, function(err, res) {
        if (err) console.error(err);
        if (res) {
            res.forEach(indexEntry);
            pulled[query.type] = 1;
        }
        match();
    });
    else process.nextTick(match);

    function match() {
        var matches = meta[query.name] || [ ];
        var m = matches.find(function(match) {
            if (! match.type === query.type) return false

            if (query.type === 'movie' && query.hasOwnProperty('year')) 
                return helpers.yearSimilar(query.year, match.year)
           
            return true
        })
        return cb(null, m && m.imdb_id);
    };
}


module.exports = metadataFind
