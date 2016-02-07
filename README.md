# name-to-imdb
Map names of movies/series to IMDB IDs

```bash
npm install name-to-imdb
```

## Usage: nameToImdb(args, callback)

**args** - string of the name or object with name/year/type - ``{ name: "The Devil Bat", year: 1940, type: "movie" }``

**args.strict** - don't lookup Google / hintUrl to find an IMDB ID

## Example
```javascript
var nameToImdb = require("name-to-imdb");
nameToImdb({ name: "south park" }, function(err, res, inf) { 
	console.log(res); // prints "tt0121955"
	console.log(inf); // inf contains info on where we matched that name - e.g. locally, or on google
})
```

## Names dataset
The dataset of movie/series names is exported from Stremio's Cinemeta API and generated in **names-dataset.json**. This has to be updated from time to time.

