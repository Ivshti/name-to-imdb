# name-to-imdb
Map names of movies/series to IMDB IDs

```bash
npm install name-to-imdb
```

## Usage: nameToImdb(args or name, callback)
**name** - string
**args** - object with name/year/type - { name: "The Devil Bat", year: 1940, type: "movie" }

## Example
```javascript
var nameToImdb = require("name-to-imdb");
nameToImdb({ name: "south park" }, function(err, res) { console.log(res) }) // prints 'tt0121955'
```
