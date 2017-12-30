"use strict";

/*
 * Defined the Mongoose Schema and return a Model for a Photo
 */

/* jshint node: true */

var mongoose = require('mongoose');

/*
 * Photo can have comments and we stored them in the Photo object itself using
 * this Schema:
 */
var mentionSchema = new mongoose.Schema({
	caller_id:mongoose.Schema.Types.ObjectId,
    text: String,
    photo_id: mongoose.Schema.Types.ObjectId,
    user_id: mongoose.Schema.Types.ObjectId,
    photo_name: String,
    photo_owner: mongoose.Schema.Types.ObjectId,
    user_first_name: String,
    user_last_name: String,
    read: {type:Boolean,default:false}
});
// the schema is useless so far
// we need to create a model using it
var Mention = mongoose.model('Mention', mentionSchema);

// make this available to our photos in our Node applications
module.exports = Mention;
