# name-to-imdb
Map names of movies/series to IMDB IDs

```bash
npm install name-to-imdb
```

## Usage: nameToImdb(args, callback)

**args** - string of the name or object with name/year/type - ``{ name: "The Devil Bat", year: 1940, type: "movie" }``

**args.providers** - an array of providers to search in; possible options are ``metadata`` and ``imdbFind``; default is ``["metadata", "imdbFind"]``

## Example
```js
var nameToImdb = require("name-to-imdb");
nameToImdb({ name: "south park" }, function(err, res, inf) { 
	console.log(res.id); // prints "tt0121955"
	console.log(res.name); // prints "South Park"
	console.log(inf); // inf contains info on where we matched that name - e.g. metadata, or on imdb
})
```

```js
// console.log({ res })
res: {
    id: 'tt0121955',
    name: 'South Park',
    year: 1997,
    type: 'TV series',
    yearRange: '1997-',
    image: {
      src: 'https://m.media-amazon.com/images/M/MV5BOGE2YWUzMDItNTg2Ny00NTUzLTlmZGYtNWMyNzVjMjQ3MThkXkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_.jpg',
      width: 680,
      height: 1000
    },
    starring: 'Trey Parker, Matt Stone',
    similarity: 1
  }
```
