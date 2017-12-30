"use strict";
/*
 *  Defined the Mongoose Schema and return a Model for a User
 */
/* jshint node: true */

var mongoose = require('mongoose');

var messageSchema = new mongoose.Schema({
    from:String,
    to:{type:String,default:""},  // default means group message
    text:String,
    profile:String,
    date:String
});

var Message = mongoose.model('Message', messageSchema);

// make this available to our users in our Node applications
module.exports = Message;
