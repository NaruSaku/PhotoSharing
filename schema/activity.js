"use strict";

/* jshint node: true */

// grab the things we need
var mongoose = require('mongoose');

// create a schema
var activity = new mongoose.Schema({
    activity:String,
    date_time:String,
    user_name:String,
    photo_name:String,
    recently_upload_photo: {type:Boolean,default:false},
    visible_list: {type: [mongoose.Schema.Types.ObjectId], default: []},
    visible_to_all:{type:Boolean,default:true}
});

var activity_list = new mongoose.Schema({
    id:{type:Number},
    list:{type:[activity],default:[]}
});

// the schema is useless so far
// we need to create a model using it
var ActivityInfo = mongoose.model('ActivityInfo', activity_list);

// make this available
module.exports = ActivityInfo;
