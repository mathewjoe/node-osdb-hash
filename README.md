# Opensubtitles API (OSDb protocol) Hash Implementation
Implementation of the [OSDb hash](http://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes) in nodejs, for use with [Opensubtitles Database (OSDb)](http://trac.opensubtitles.org/projects/opensubtitles/wiki/OSDb)

## Installation
`$ npm install node-osdb-hash`

## Usage
### Synchronous
```javascript
var osh = require('node-osdb-hash');
var hash = osh.hashSync('/path/to/movie/file');
console.log(hash); // Eg : '8e245d9679d31e12'
```
### Asynchronous
```javascript
var osh = require('node-osdb-hash');
osh.hash('/path/to/movie/file', function (err, hash) {
	if(err) return console.error(err);
	console.log(hash); // Eg : '8e245d9679d31e12'
}
```
### Using Events
```javascript
var osh = require('node-osdb-hash');
var hasher = osh.hash('/path/to/movie/file');
hasher.on('hashReady', function (hash){
	console.log(hash); // Eg : '8e245d9679d31e12'
}
hasher.on('error', function (err) {
	console.error(err);
}
hasher.calculateHash();
```