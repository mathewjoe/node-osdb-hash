var fs = require('fs');
var bignum = require('bignum');
var async = require('async');
var util = require('util');

var EventEmitter = require('events').EventEmitter;

var hashChunkSize = 64 * 1024 // 64kB
var startbuff = new Buffer(hashChunkSize);
var endbuff = new Buffer(hashChunkSize);
// Mask to obtain 64 bit hex of hash
var bn64 = bignum('ffffffffffffffff', base=16);

/*
* Returns the hash, given a buffer
*
* Steps :
* 1. Read 8 bytes from the buffer
* 2. Convert to bignum ( to obtain 64 bit int )
* 3. Add 64 bit int to hash
* 4. Repeat for the remaining bytes in the 64kB
*
*/
var hashFromBuffer = function (srcBuff) {
	var tempbuff = new Buffer(8);
	var hash = bignum(0);
	for(var i=0; i < hashChunkSize; i+=8){
		// Take chunks of 8 bytes (64 bits) from srcBuff and pass it to tempbuff in each iteration
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
	// If Opening file fails, log error and return
	try {
		var fd = fs.openSync(fpath, 'r');
	}
	catch(err) {
		return console.error(err);
	}

	var hash = bignum(0);

	var stats = fs.statSync(fpath);
	var fsize = stats.size;

	// Adding file size to hash
	hash = hash.add(fsize);

	// Reading the first and last 64kB into two separate buffers
	fs.readSync(fd, startbuff, 0, hashChunkSize, 0);
	fs.readSync(fd, endbuff, 0, hashChunkSize, fsize - hashChunkSize);
	fs.closeSync(fd);

	// Adding the checksum of first and last 64k to hash
	hash = hash.add(hashFromBuffer(startbuff));
	hash = hash.add(hashFromBuffer(endbuff));

	// Converting the hash to 64 bit hex code before returning
	return hash.and(bn64).toString(base=16);
}

// Constructor function for async hashing. Inherits EventEmitter
var hashAsync = function (fpath, cb) {
	EventEmitter.call(this);
	this.hash = bignum(0);
	this.fpath = fpath;
	this.cb = cb || null;
}
// Inheriting EventEmitter methods
util.inherits(hashAsync, EventEmitter);

/*
* Steps :
* 1. Open file (to obtain fd) and obtain file stats parallely
* 2. Read first and last 64k of file, into corresponding buffers startbuff and endbuff
* 3. Calculate checksums from buffers using hashFromBuffer()
* 4. Calculate hash = file size + checksums of fist and last 64kB of file
*/
hashAsync.prototype.calculateHash = function() {
	var self = this;
	// Open file and obtain file stats parallely,
	async.parallel([
		function (cb) {
			fs.open(self.fpath, 'r', cb)
		},
		function (cb) {
			fs.stat(self.fpath, cb);
		}
		], function (err, results) {
			if(err) return self.handleError(err);
			var fd = results[0],
				stats = results[1];
			// Add file size to hash
			self.hash = self.hash.add(stats.size);
			// Read the first and last 64k into corresponding buffers parallely
			async.parallel([
				function (cb) {
					fs.read(fd, startbuff, 0, hashChunkSize, 0, cb);
				},
				function (cb) {
					fs.read(fd, endbuff, 0, hashChunkSize, stats.size - hashChunkSize, cb);
				}
				], function (err, results) {
					if(err) return self.handleError(err);
					// Calculate checksums of fist and last 64k in respective buffers and add to hash
					self.hash = self.hash.add(hashFromBuffer(startbuff)).add(hashFromBuffer(endbuff));
					// Converting the hash to 64 bit hex code
					self.hash = self.hash.and(bn64).toString(base=16);
					// If Usage #1, call callback with hash
					// If USage #1, emit 'hashReady' event with hash as event data
					if(self.cb){
						self.cb(null, self.hash);
					}
					else {
						self.emit('hashReady', self.hash);
					}
			})
	});
};

// Usage #1 : Pass error to callback
// Usage #2 : Emit 'error' event with error object as data
hashAsync.prototype.handleError = function(err) {
	if(this.cb){
		this.cb(err);
	}
	else {
		this.emit('error', err);
	}
};

/*
* Usage:
* 1. osh.hash('/path/to/file', function(err, hash){}) // Node Callback Style
* 2. var hasher = osh.hash('/path/to/file')  // Event based - returns an EventEmitter
*    hasher.on('hashReady', function(hash){})
*    hasher.calculateHash();
*
*/
module.exports.hash = function (fpath, cb) {
	var newHash = new hashAsync(fpath, cb);
	if(cb) {
		newHash.calculateHash();	
	}
	else {
		return newHash;
	}
}