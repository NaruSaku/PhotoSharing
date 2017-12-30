 "use strict";
 /* jshint node: true */
 // 1.node cs142password.js
 // 2.nodemon webServer.js
 // It works but if I open the browser console it still has the


 var crypto = require('crypto');
  function makePasswordEntry(clearTextPassword) {
      var hash = crypto.createHash('sha1');
      var salt = crypto.randomBytes(8).toString('hex');
      hash.update(clearTextPassword + salt);
      return {
          salt: salt,
          hash: hash.digest('hex')
      };
  }

  function doesPasswordMatch(hash, salt, clearTextPassword) {
      var hash2 = crypto.createHash('sha1');
      hash2.update(clearTextPassword + salt);
      var password = hash2.digest('hex');
      return password === hash;
  }

  module.exports = {
      makePasswordEntry:makePasswordEntry,
      doesPasswordMatch:doesPasswordMatch
  };

