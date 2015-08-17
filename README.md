# node-osdb-hash
Implementation of the [OSDb hash](http://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes) in nodejs

## Usage
```javascript
var oshash = require('node-osdb-hash');
var hash = oshash('/path/to/movie/file');
console.log(hash); // Eg : '8e245d9679d31e12'
```
