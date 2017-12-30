"use strict";
/*
 *  Defined the Mongoose Schema and return a Model for a User
 */
/* jshint node: true */

var mongoose = require('mongoose');
var activity = new mongoose.Schema({
    activity:String,
    date_time:String,
    user_name:String,
    photo_name:String,
    recently_upload_photo: {type:Boolean,default:false},
    visible_list: {type: [mongoose.Schema.Types.ObjectId], default: []},
    visible_to_all:{type:Boolean,default:true}
});

var new_activity = {
    activity:"registered as a user",
    date_time:new Date().toLocaleString(),
    user_name:"",
    photo_name:null,
    recently_upload_photo: false,
    visible_to_all:true,
    visible_list:[]   // if[]
};

// create a schema
var userSchema = new mongoose.Schema({
    first_name: {type:String,text:true}, // First name of the user.
    last_name: String,  // Last name of the user.
    location: String,    // Location  of the user.
    description: String,  // A brief user description
    occupation: String,    // Occupation of the user.
    login_name: String,
    password_digest: String,
    salt: String,
    email: {type:String,default:""},
    authenticated:{type:Boolean,default:false},
    authenticated_salt: {type:String,default:""},    // email authentication
    profile:{type:[String],default:['default-profile.jpeg']}, // the id of the photo
    recentActivity: {type:activity,default:new_activity},
    recently_upload_photo: {type:Boolean,default:false},
    recent_uploaded_photo:String,
    photo_liked_list:{type:[String],default:[]},
    photo_disliked_list:{type:[String],default:[]},
    favorite_photos:{type:[String],default:[]},
    friend_list:{type: [mongoose.Schema.Types.ObjectId], default: []},
    friend_request_list:{type: [mongoose.Schema.Types.ObjectId], default: []},
    message_record:{type:{},default:{}}
});

// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('User', userSchema);

// make this available to our users in our Node applications
module.exports = User;
