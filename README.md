# name-to-imdb
Map names of movies/series to IMDB IDs

```bash
npm install name-to-imdb
```

## Usage: nameToImdb(args, callback)

**args** - string of the name or object with name/year/type - ``{ name: "The Devil Bat", year: 1940, type: "movie" }``

## Example
```javascript
var nameToImdb = require("name-to-imdb");
nameToImdb({ name: "south park" }, function(err, res, inf) { 
	console.log(res); // prints "tt0121955"
	console.log(inf); // inf contains info on where we matched that name - e.g. locally, or on google
})
```
