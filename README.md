# name-to-imdb
Map names of movies/series to IMDB IDs

```bash
npm install name-to-imdb
```

## Usage: nameToImdb(args, callback)

**args** - string of the name or object with name/year/type - ``{ name: "The Devil Bat", year: 1940, type: "movie" }``

**args.strict** - don't fallback to match first result of imdb (if name doesn't match but year and type do, this is if we're searching with an alternative name, aka)

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

