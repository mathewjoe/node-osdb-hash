var fs = require('fs');
var bignum = require('bignum');

var hashChunkSize = 64 * 1024 // 64kB
var startbuff = new Buffer(hashChunkSize);
var endbuff = new Buffer(hashChunkSize);
var bn64 = bignum('ffffffffffffffff', base=16);
var hash = bignum(0);

/*
Returns the hash, given a buffer
*/
var calculateHash = function (srcBuff) {
	var tempbuff = new Buffer(8);
	var hash = bignum(0);
	for(var i=0; i < hashChunkSize; i+=8){
		// Take chunks of 8 bytes from srcBuff and pass it to tempbuff in each iteration
		srcBuff.copy(tempbuff, 0, i, i+8);
		//Process the tempbuff, add the output to hash
		hash = hash.add(bignum.fromBuffer(tempbuff, {
			endian : 'little',
			size : 8
		}))
	}
	return hash;
}

module.exports.hashSync = function (fpath) {
	try {
		var fd = fs.openSync(fpath, 'r');
	}
	catch(err) {
		return console.error(err);
	}

	var stats = fs.statSync(fpath);
	var fsize = stats.size;

	hash = hash.add(fsize);

	// Reading the first and last 64kB into two separate buffers
	fs.readSync(fd, startbuff, 0, hashChunkSize, 0);
	fs.readSync(fd, endbuff, 0, hashChunkSize, fsize - hashChunkSize);
	fs.closeSync(fd);

	// Adding the checksum of first and last 64k to hash
	hash = hash.add(calculateHash(startbuff));
	hash = hash.add(calculateHash(endbuff));

	// Converting the hash to 64 bit hex code before returning
	return hash.and(bn64).toString(base=16);
}


