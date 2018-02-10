var needle = require("needle")

var helpers = require("../helpers")

function imdbFind(task, cb, simpler) {

    function nextTick() {
        if (!simpler && task.year)
            imdbFind(task, cb, true)
        else
            cb(null, null)
    }

    function matchSimilar(parsed, callback) {

        var pick
        var secondBest
        var firstResult

        var similarityGoal = 0.6

        parsed.some(function(elm) {
            if (!task.type || (task.type == 'movie' && elm.q == 'feature') || (task.type == 'series' && (elm.q == 'TV series' || elm.q == 'TV mini-series'))) {

                if (helpers.yearSimilar(task.year, elm.y)) {

                    // try to match by levenshtein distance
                    var similarity = helpers.nameSimilar(task.name, elm.l)

                    if (similarity > similarityGoal) {
                        if (!pick || (pick && similarity > pick.similarity)) {
                            pick = elm
                            pick.similarity = similarity
                        }
                    }

                    // fallback to non-levenshtein distance logic
                    if (!secondBest && helpers.nameAlmostSimilar(task.name, elm.l))
                        secondBest = elm

                    // if nothing else is found, pick first result
                    // (because what we're searching for might be the alternative name of the first result)
                    // this is ignored if strict mode enabled
                    if (!firstResult && !task.strict)
                        firstResult = elm
                }

            }
        })

        callback(pick || secondBest || firstResult || null)
    }

    // we first search imdb for name + year (if we have a year set)
    // if it fails we search by name only (simpler)
    var searchTerm = !simpler && task.year ? task.name + ' ' + task.year : task.name
    
    var imdbSearchUrl = 'http://sg.media-imdb.com/suggests/' + searchTerm.charAt(0) + '/' + encodeURIComponent(searchTerm)  + '.json'

    needle.get(imdbSearchUrl, function(err, res) {
        if (!err && res.statusCode == 200 && res.body) {

            res.body = String.fromCharCode.apply(null, res.body)

            var imdbParse = JSON.parse(res.body.match(/{.*}/g))

            if (imdbParse.d) {

                var selected

                matchSimilar(imdbParse.d, function(selected) {
                    if (selected)
                        cb(null, selected.id, { match: imdbSearchUrl })
                    else nextTick()
                })

            } else nextTick()
        } else nextTick()
    })
}

 module.exports = imdbFind