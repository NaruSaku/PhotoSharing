"use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 *
 */

var mongoose = require('mongoose');
var async = require('async');


// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');
var Comment = require('./schema/comment.js');
var Activity = require('./schema/activity.js');
var Mention = require('./schema/mention.js');
var Message = require('./schema/message.js');

var express = require('express');
var app = express();
var server = app.listen(3000);



var session = require('express-session');
var bodyParser = require('body-parser');
var fs = require("fs");
var multer = require('multer');
var cs142password = require('./cs142password.js');
var nodemailer = require('nodemailer');
var crypto = require('crypto');


mongoose.connect('mongodb://localhost/cs142project6');


app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.use(function(request, response, next){
    if(!request.session.user_id){
        if (request.originalUrl === '/admin/login' || request.originalUrl === '/user' || request.originalUrl === '/sendEmail' || request.originalUrl === '/authentication'){
            next();
        } else if(request.originalUrl === '/admin/logout'){
            response.status(400).send("No user logged-in");
            return;
        } else {
            response.status(401).send("Unauthorized, require log-in");
            return;
        }
    } else {
        next();
    }
    
});

app.get('/', function (request, response) {
    response.sendfile('index.html');
    // response.send('Simple web server of files from ' + __dirname);
});

/*
 * URL /user/list - Return all the User object.
 */
app.get('/user/list', function (request, response) {
    User.find({},['_id','first_name','last_name','location','description','occupation','recentActivity','recently_upload_photo','recent_uploaded_photo','profile'],function (err,userList) {
        if (err){
            response.status(400).send(JSON.stringify(err));
            return ;
        }
        var photoNum = [];

        // !!!important
        var userList2 = JSON.parse(JSON.stringify(userList));

        async.each(userList2,function (user,callback){
            Photo.find({'user_id':user._id},function (err,photos) {
                if (err){
                    console.log("User" + user + "has no photos.");
                }
                /*This part is to filter the photos who have the authority*/
                photos = photos.filter(function(photo) {
                    return (!photo.control || (photo.visibleList.indexOf(request.session.user_id) >= 0));
                });
                user.photoLength = photos.length;
                photoNum.push(photos.length);
                callback();
            });
        },function (err) {
            response.status(200).send(userList2);
        });
    });
});

/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {
    var id = request.params.id;
    User.findOne({'_id':id},
        ['_id','first_name','last_name','login_name','location','description','occupation','favorite_photos','recentActivity','recently_upload_photo','recent_uploaded_photo','photo_liked_list','photo_disliked_list','profile','friend_request_list','friend_list'],
        function (err,userDetail) {
        if (err){
            response.status(400).send(JSON.stringify(err));
            return;
        } else if (userDetail === null){
            console.log('User with _id:' + id + ' not found.');
            response.status(400).send('Not found');
            return;
        }
        response.status(200).send(userDetail);
    });
});
/*This part is used to get the photo recently updated and with most comments*/
app.get('/userPhoto/:id', function (request, response) {
    var id = request.params.id;
    var send_body = {};
    Photo.find({'user_id': id}, function(err, photoList) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        var mostRecentlyPhoto = {};
        var mostCommentsPhoto = {};
        var commentNum = 0;
        photoList = photoList.filter(function(photo) {
            return (!photo.control || (photo.visibleList.indexOf(request.session.user_id) >= 0));
        });
        if (photoList.length > 0){
            mostRecentlyPhoto = photoList[photoList.length - 1];
            mostCommentsPhoto = photoList[0];
            send_body.mostRecentlyPhoto = mostRecentlyPhoto;
            send_body.mostCommentsPhoto = mostCommentsPhoto;
            var photos = JSON.parse(JSON.stringify(photoList));
            async.each(photos,function (photo,photo_callback) {
                if (photo.comments.length > commentNum){
                    commentNum = photo.comments.length;
                    mostCommentsPhoto = photo;
                    send_body.mostCommentsPhoto = mostCommentsPhoto;
                }
                photo_callback();
            },function (err) {
                if (err){
                    response.status(400).send(JSON.stringify(err));
                }
                response.status(200).send(send_body);
            });
        }
    });
});

app.get('/comment/:text', function (request, response) {
    var text = request.params.text;
    console.log("User input: " + text);
    var send_comments = [];
    var send_photos = [];


    /*This part is a test for promise*/
    // function runAsync1(){
    //     var p = new Promise(function(resolve, reject){
    //         Comment.find({$text:{$search: text}},function(err,comments){
    //             if (err) {
    //                 response.status(400).send(JSON.stringify(err));
    //                 return;
    //             }
    //             send_comments = comments;
    //             console.log(comments.length + "!");
    //             resolve("shit1");
    //         });
    //
    //     });
    //     return p;
    // }
    // function runAsync2(){
    //     var p = new Promise(function(resolve, reject){
    //         async.each(send_comments,function (send_comment,comment_callback) {
    //             Photo.findOne({photo_id:send_comment.photo_id},function (err,photo) {
    //                 if (err) {
    //                     response.status(400).send(JSON.stringify(err));
    //                     return;
    //                 }
    //                 send_photos.push(photo);
    //                 comment_callback();
    //                 resolve("shit2");
    //             })
    //         });
    //
    //     });
    //     return p;
    // }
    // function runAsync3(){
    //     var p = new Promise(function(resolve, reject){
    //         console.log(send_comments.length + "?");
    //         resolve("shit3");
    //         response.status(200).send({
    //             comments:send_comments,
    //             photos:send_photos
    //         });
    //     });
    //     return p;
    // }
    //
    // runAsync1().then(function(data){
    //     console.log(data);
    //     return runAsync2();
    // }).then(function(data){
    //     console.log(data);
    //     return runAsync3();
    // })
    /*This part is a test for non-promise then*/
    // Comment.find({$text:{$search: text}},function(err,comments){
    //     if (err) {
    //         response.status(400).send(JSON.stringify(err));
    //         return;
    //     }
    //     send_comments = comments;
    //     console.log(comments.length);
    // }).then(function () {
    //     async.each(send_comments,function (send_comment,comment_callback) {
    //         Photo.findOne({photo_id:send_comment.photo_id},function (err,photo) {
    //             if (err) {
    //                 response.status(400).send(JSON.stringify(err));
    //                 return;
    //             }
    //             send_photos.push(photo);
    //             comment_callback();
    //         })
    //     })
    // }).then(function () {
    //     response.status(200).send({
    //         comments:send_comments,
    //         photos:send_photos
    //     });
    // })

    Comment.find({$text:{$search: text}},function(err,comments){
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        console.log(comments);
        send_comments = JSON.parse(JSON.stringify(comments));
        // for (var index = 0; index < send_comments.length; index++){
        //     console.log(send_comments[index].photo_id);
        //     console.log(send_comments[index].comment);
        //     console.log(send_comments[index].date_time);
        //     console.log(send_comments[index].user_id);
        // }
        async.each(send_comments,function (send_comment,comment_callback) {
            Photo.findOne({_id:send_comment.photo_id},['file_name'],function (err,photo) {
                if (err) {
                    response.status(400).send(JSON.stringify(err));
                    return;
                }
                send_photos.push(photo);
                comment_callback();
            });
        },function (err) {
            if (err) {
                response.status(400).send(JSON.stringify(err));
            }
            // for (var index = 0; index < send_comments.length; index++){
            //     console.log(send_comments[index].photo_id);
            //     console.log(send_comments[index].comment);
            // }
            response.status(200).send({
                comments:send_comments,
                photos:send_photos
            });
        });
    });
});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */
app.get('/photosOfUser/:id', function (request, response) {
    var user_id = request.params.id;
    Photo.find({'user_id': user_id}, function(err, photoList) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (!photoList) {
            console.log('Photos for user with _id:' + user_id + ' not found.');
            response.status(400).send('Not found');
            return;
        }
        var photos = JSON.parse(JSON.stringify(photoList));
        /*This part is to filter the photos who have the authority*/
        photos = photos.filter(function(photo) {
            return (!photo.control || (photo.visibleList.indexOf(request.session.user_id) >= 0));
        });
        async.each(photos,function (photo,photo_callback) {
            var comments = photo.comments;
            photo.date_time = changeDateFormat(photo.date_time);
            async.each(comments,function (comment,comment_callback) {
                User.findOne({'_id':comment.user_id},function (err,commentator) {
                    if (err) {
                        console.log('Database find() returned error:');
                        console.log(JSON.stringify(err));
                    }  else {
                        if (commentator === null) {
                            var index = comments.indexOf(comment);
                            comments.splice(index,1);
                        } else {
                            comment.date_time = changeDateFormat(comment.date_time);
                            comment.user = commentator;
                        }
                        comment_callback();
                    }
                });
            },function (err) {
                if (err) {
                    console.log("Failed to import the comments.");
                } else {
                    photo_callback();
                }
            });
        },function (err) {
            if (err){
                response.status(400).send(JSON.stringify(err));
            } else {
                response.status(200).send(photos);
            }
        });
    });
});

app.post('/admin/login', function(request, response) {
    if (!request.body.login_name){
        return;
    }
    if(request.session.user_id){
        User.findOne({_id:request.session.user_id},['_id','first_name','last_name','location','description','occupation','favorite_photos','recentActivity','recently_upload_photo','recent_uploaded_photo','photo_liked_list','photo_disliked_list','profile','friend_request_list','friend_list'],function (err,user) {
            if (err){
                request.status(400).send();
                return ;
            }
            response.status(200).send(user);
            return ;
        });
    }

    User.findOne({login_name: request.body.login_name}, function(err, user) {
        if (user !== null) {
            if(cs142password.doesPasswordMatch(user.password_digest, user.salt, request.body.password)){
                request.session.user_id = user._id;
                response.status(200).send({
                    _id:user._id,
                    login_name:user.login_name,
                    first_name:user.first_name,
                    last_name:user.last_name,
                    friend_request_list:user.friend_request_list,
                    friend_list:user.friend_list,
                    profile:user.profile
                });
            } else {
                response.status(400).send("Password is not correct!");
            }
        } else {
            response.status(400).send(request.body.login_name + " is not a valid account");
        }
    });
});

app.post('/admin/logout', function(request, response) {
    if (request.session.user_id) {
        request.session.destroy(function(err) {} );
        //session.user_id = "";
        response.status(200).send();
    } else {
        response.status(400).send("No user currently logged in");
    }
});

/*This part is used for register*/
app.post('/user', function(request, response) {
    var userName = request.body.userName;
    if (userName === undefined){
        response.status(400).send("userName cannot be undefined.");
        return;
    }
    User.findOne({login_name: userName}, function(err, user) {
        if (user !== null) {
            console.log(userName + " already exists.");
            response.status(400).send(userName + " already exists.");
            return;
        }
        var password = cs142password.makePasswordEntry(request.body.password);
        var newUser = {
            login_name: request.body.userName,
            first_name: request.body.firstName,
            last_name: request.body.lastName,
            description: request.body.description,
            location: request.body.location,
            occupation: request.body.occupation,
            email:request.body.email,
            password_digest: password.hash,
            salt: password.salt
        };

        User.create(newUser, function(err, createdUser) {
            if (err) {
                response.status(400).send(JSON.stringify(err));
                return;
            }
            request.session.user_id = createdUser._id;
            response.status(200).send(createdUser);
        });
    });
});

var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');
app.post('/photos/new', function(request, response) {
    processFormBody(request, response, function (err) {
        if (err || !request.file) {
            response.status(400).send("no file");
            return;
        }

        if(request.file.fieldname !== "uploadedphoto") {
            response.status(400).send("no file");
            return;
        }
        // We need to create the file in the directory "images" under an unique name. We make
        // the original file name unique by adding a unique prefix with a timestamp.
        var timestamp = new Date().valueOf();
        var filename = 'U' +  String(timestamp) + request.file.originalname;

        var visibleList = request.body.visibleList.split(',');
        var control = (request.body.control === "true");

        fs.writeFile("./images/" + filename, request.file.buffer, function (err) {
            // XXX - Once you have the file written into your images directory under the name
            // filename you can create the Photo object in the database
            if (err) {
                console.log(err);
                response.status(400).send("Error uploading photo");
            }
            var newPhoto = {
                file_name: filename,
                user_id: request.session.user_id,
                comments: [],
                control:control,
                date_time:new Date().toLocaleString()
            };
            if (control){
                newPhoto.visibleList=visibleList;
            }
            Photo.create(newPhoto, function(err, createdPhoto) {
                if (err) {
                    console.log(err);
                    response.status(400).send("Error uploading photo");
                }
                response.status(200).send(createdPhoto);
            });
            User.findOne({_id:request.session.user_id},function (err,user) {
                if (err) {
                    response.status(400).send(JSON.stringify(err));
                }
                user.recent_uploaded_photo = "images/" + filename;
                user.save();
            });
        });
    });
});

app.post('/commentsOfPhoto/:photo_id', function(request, response) {
    var user_id = request.session.user_id;  // who posted this comment
    var photo_id = request.params.photo_id;
    var comment = request.body.comment;
    var owner_id = request.body.owner_id;
    // And here is date_time which is default
    var newComment = new Comment({
        comment: comment,
        user_id: user_id,
        photo_id:photo_id,
        owner_id:owner_id,
        date_time:new Date().toLocaleString()
    });

    // Your implementation should reject any empty comments with a status of 400 (Bad request)
    if (!comment) {
        console.log("The comment is empty!");
        response.status(400).send("The comment is empty!");
    } else {
        newComment.save(function (err,res) {
            if (err) {
                console.log("Error:" + err);
            }
            else {
                Photo.findOne({_id: photo_id}, function(err, photo) {
                    if (!err) {
                        photo.comments.push(newComment);
                        photo.save();
                        response.status(200).send();
                    } else {
                        console.log("Photo does not exist");
                        response.status(400).send("Photo does not exist");
                    }
                });
            }
        });
        // Comment.create(newComment,function(err){
        //     console.log(newComment);
        //     if (err) {
        //         console.log(err);
        //         response.status(400).send("Error uploading photo");
        //     }
        //     Photo.findOne({_id: photo_id}, function(err, photo) {
        //         if (!err) {
        //             photo.comments.push(newComment);
        //             photo.save();
        //             console.log(photo);
        //             response.status(200).send();
        //             //response.status(200).send();
        //         } else {
        //             console.log("Photo does not exist");
        //             response.status(400).send("Photo does not exist");
        //         }
        //     });
        //
        // });
    }
});

app.post('/deletePhoto', function(request, response) {
    var photo_id = request.body.photo_id;
    var user_id = request.session.user_id;

    Photo.findOne({_id: photo_id}, function(err, photo) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (photo === null) {
            response.status(400).send("No such photo!");
            return;
        }
        if (!photo.user_id.equals(user_id)){
            // === is not useful here and I don't know why
            console.log(photo.user_id + " " + user_id);
            response.status(400).send("Have no authorities!");
            return;
        }

        var like_user_ids_list = photo.like_user_ids;
        async.each(like_user_ids_list,function (like_user_id,callback) {
            User.findOne({_id:like_user_id},function (err,user) {
                if (err) {
                    response.status(400).send(JSON.stringify(err));
                    return;
                }
                var photo_liked_list = user.photo_liked_list;
                if (photo_liked_list.indexOf(photo_id) >= 0){
                    photo_liked_list.remove(photo_id);
                }
                user.save();
                callback();
            });
        });

        var dislike_user_ids_list = photo.dislike_user_ids;
        async.each(dislike_user_ids_list,function (dislike_user_id,callback) {
            User.findOne({_id:dislike_user_id},function (err,user) {
                if (err) {
                    response.status(400).send(JSON.stringify(err));
                    return;
                }
                var photo_disliked_list = user.photo_disliked_list;
                if (photo_disliked_list.indexOf(photo_id) >= 0){
                    photo_disliked_list.remove(photo_id);
                }
                user.save();
                callback();
            });
        });
        fs.unlinkSync("images/" + photo.file_name);
        Photo.remove({_id: photo_id}, function(err) {});
        response.status(200).end();
    });
    Comment.remove({photo_id:photo_id}, function(err, comments){
        if(err){
            console.log(err);
        }
        console.log('Successfully deleted：' + comments);
    });
});

app.post('/deleteComment', function(request, response) {
    if (!request.session.user_id) {
        response.status(401).send("You don't have the authority.");
        return;
    }
    var comment_id = request.body.comment_id;
    var photo_id = request.body.photo_id;

    Photo.findOne({_id: photo_id}, function(err, photo) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (photo === null) {
            response.status(400).send("No such photo!");
            return;
        }

        for (var index = 0; index < photo.comments.length; index++){
            if (photo.comments[index]._id.equals(comment_id)){
                break;
            }
        }
        if (index !== photo.comments.length){
            photo.comments.splice(index,1);
            photo.save();
            response.status(200).end();
        } else {
            response.status(400).send("No such comment!");
        }
    });
    Comment.remove({_id:comment_id}, function(err, comments){
        if(err){
            console.log(err);
        }
        console.log('Successfully deleted：' + comments);
    });
});


app.post('/deleteAccount', function(request, response) {
    var user_id = request.body.user._id;
    if (request.session.user_id !== user_id){
        response.status(401).send('Unauthorized');
        return;
    }
    console.log("User" + request.body.user.last_name + "is to be deleted");
    User.findOne({_id: user_id}, function(err, user) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if(!user) {
            response.status(400).send("No such user");
        }

        // /**This part is to delete this user has liked which photos*/
        // var photo_liked_list = user.photo_liked_list;
        // async.each(photo_liked_list,function (err,photo_id) {
        //     Photo.findOne({_id:photo_id},function (err,photo) {
        //         if (err) {
        //             response.status(400).send(JSON.stringify(err));
        //             return;
        //         }
        //         var like_user_ids = photo.like_user_ids;
        //         if (like_user_ids.indexOf(user_id) >= 0){
        //             like_user_ids.remove(user_id);
        //         }
        //         photo.save();
        //     })
        // });
        //
        // /**This part is to delete this user has disliked which photos*/
        // var photo_disliked_list = user.photo_disliked_list;
        // async.each(photo_disliked_list,function (err,photo_id) {
        //     Photo.findOne({_id:photo_id},function (err,photo) {
        //         if (err) {
        //             response.status(400).send(JSON.stringify(err));
        //             return;
        //         }
        //         var dislike_user_ids = photo.dislike_user_ids;
        //         if (dislike_user_ids.indexOf(user_id) >= 0){
        //             dislike_user_ids.remove(user_id);
        //         }
        //         photo.save();
        //     })
        // });
        //
        // /**
        //  * This part is to delete the other users have liked or disliked
        //  * the photos of this user
        //  */
        // Photo.remove({user_id: user_id}, function(err,photos) {
        //     async.each(photos,function (photo,photo_callback) {
        //         var like_user_ids = photo.like_user_ids;
        //         async.each(like_user_ids,function (user_id,user_callback) {
        //             User.findOne({_id:user_id},function (err,user) {
        //                 var photo_liked_list = user.photo_liked_list;
        //                 if (photo_liked_list.indexOf(photo.photo_id) >= 0){
        //                     photo_liked_list.remove(photo.photo_id);
        //                 }
        //                 user.save();
        //                 user_callback();
        //             })
        //         });
        //
        //         var dislike_user_ids = photo.dislike_user_ids;
        //         async.each(dislike_user_ids,function (user_id,user_callback) {
        //             User.findOne({_id:user_id},function (err,user) {
        //                 var photo_disliked_list = user.photo_disliked_list;
        //                 if (photo_disliked_list.indexOf(photo.photo_id) >= 0){
        //                     photo_disliked_list.remove(photo.photo_id);
        //                 }
        //                 user.save();
        //                 user_callback();
        //             })
        //         });
        //         photo_callback();
        //     })
        // });

        Photo.remove({user_id: user_id}, function(err) {});
        User.remove({_id: user_id}, function(err,user) {});
        Comment.remove({user_id: user_id}, function(err) {});
        request.session.destroy(function(err) {} );
        response.status(200).send();
    });

});




// This part is built by myself to record how many times a photo has been viewed
// I hope it will not be counted as an extra property
// Oh, I think I have to comment this paragraph temporarily

app.post('/photoView', function(request, response) {
    var photo_id = request.body.photo_id;
    Photo.findOne({_id: photo_id}, function(err, photo) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (photo === null) {
            response.status(400).send("No such photo!");
            return;
        }
        photo.view_times++;
        photo.save();
        response.status(200).end();
    });
});

/**This part has been revised to meet the instructions
 * The original part can been seen on Github */
app.post('/likePhoto', function(request, response) {
    var photo_id = request.body.photo_id;
    var user_id = request.session.user_id;

    Photo.findOne({_id: photo_id}, function(err, photo) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        photo.view_times--;
        if (photo.dislike_user_ids.indexOf(user_id) >= 0){
            response.status(400).send("You have already disliked this photo.");
            return;
        }
        if (photo.like_user_ids.indexOf(user_id) >= 0) {
            photo.like_user_ids.remove(user_id);
        } else {
            photo.like_user_ids.push(user_id);
        }
        photo.save();
        User.findOne({_id:user_id},function (err,user) {
            if (err) {
                response.status(400).send(JSON.stringify(err));
                return;
            }
            var likePhotoList = user.photo_liked_list;
            if (likePhotoList.indexOf(photo_id) >= 0){
                likePhotoList.remove(photo_id);
            } else {
                likePhotoList.push(photo_id);
            }
            console.log("likePhotoList: " + likePhotoList);
            user.save();
            response.status(200).send({liked:true});
        })
    });
});


app.post('/dislikePhoto', function(request, response) {
    var photo_id = request.body.photo_id;
    var user_id = request.session.user_id;

    Photo.findOne({_id: photo_id}, function(err, photo) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        photo.view_times--;
        if (photo.like_user_ids.indexOf(user_id) >= 0){
            response.status(400).send("You have already liked this photo.");
            return;
        }
        if (photo.dislike_user_ids.indexOf(user_id) >= 0) {
            photo.dislike_user_ids.remove(user_id);
        } else {
            photo.dislike_user_ids.push(user_id);
        }
        photo.save();
        User.findOne({_id:user_id},function (err,user) {
            if (err) {
                response.status(400).send(JSON.stringify(err));
                return;
            }
            var dislikePhotoList = user.photo_disliked_list;
            if (dislikePhotoList.indexOf(photo_id) >= 0){
                dislikePhotoList.remove(photo_id);
            } else {
                dislikePhotoList.push(photo_id);
            }
            console.log("dislikePhotoList: " + dislikePhotoList);
            user.save();
            response.status(200).send();
        });
    });
});


app.post('/recentActivity/', function(request, response){
    var user_id = request.body.user_id;
    var activity = request.body.activity;
    var photo_name = request.body.photo_name;
    // if control is true, visible_to_all is false;
    var visible_to_all = (request.body.control !== true);
    var visible_list = request.body.visibleList;


    User.findOne({_id: user_id}, function(err, user) {
        if(err || !user) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        var photo_show;   // photo name to be showed on recent activity
        var recently_upload_photo; // if there is a photo

        if(activity === "posted a photo") {
            user.recently_upload_photo = true;
        } else {
            user.recently_upload_photo = false;
        }

        if (photo_name !== undefined){  // add a comment
            photo_show = "images/" + photo_name;
            recently_upload_photo = true;
        } else if (user.recently_upload_photo){
            photo_show = user.recent_uploaded_photo;
            recently_upload_photo = true;
        } else {
            photo_show = undefined;
            recently_upload_photo = false;
        }

        var new_activity = {
            activity:activity,
            date_time:new Date().toLocaleString(),
            user_name:user.first_name + " " + user.last_name,
            photo_name:photo_show,
            recently_upload_photo: recently_upload_photo,
            visible_to_all:visible_to_all,
            visible_list:visible_list   // if[]
        };

        user.recentActivity = new_activity;


        user.save(function (err) {
            console.log(user.first_name + " " + user.recentActivity.activity);
            Activity.findOne({id:1},function (err,activity) {
                var list = activity.list;
                if (list.length === 200){
                    list.splice(0,1);
                }
                list.push(new_activity);
                activity.save();
                response.status(200).send();

            });
        });
    });
});

app.post('/activity',function (request,response) {
    Activity.findOne({id:1},function (err,activity_list) {
        if(err || !activity_list) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        activity_list.list = activity_list.list.filter(function (activity) {
            return (activity.visible_to_all || activity.visible_list.indexOf(request.session.user_id) >= 0);
        });
        var length = activity_list.list.length;
        if (length > 20){
            activity_list.list = activity_list.list.slice(length - 20,length);
        }
        activity_list.list.reverse();
        response.status(200).send(activity_list.list);
    });
});

app.post('/getFavorite',function (request,response) {
    User.findOne({_id:request.session.user_id},function (err,user) {
        if(err || !user) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        // var list = JSON.parse(JSON.stringify(user.favorite_photos));
        var result = [];
        async.each(user.favorite_photos,function (photo_id,done_callback) {
            Photo.findOne({_id:photo_id},function (err,photo) {
                result.push(photo);
                done_callback();
            });
        },function (err) {
            response.status(200).send(result);
        });
    });
});

app.post('/favorite',function (request,response) {
    User.findOne({_id:request.session.user_id},function (err,user) {
        if(err || !user) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        var photo_id = request.body.photo_id;
        var list = user.favorite_photos;
        if (list.indexOf(photo_id) >= 0){
            list.remove(photo_id);
        } else {
            list.push(photo_id);
        }
        user.save();
        response.status(200).send({length:list.length});
    });
});

app.post('/mentions', function (request, response) {
    var mentions = request.body.mentions;
    var mentionPromises = mentions.map(function (mention){
        return Mention.create(mention, function (err, mentionObj) {
            if (err) {
                console.error('Error create photo', err);
            } else {
                console.log('Adding mentions');
            }
        });
    });
    Promise.all(mentionPromises).then(function(value){
        response.status(200).send('mentions saved');
    });
});

app.post('/getMention', function (request, response) {
    var user_id = request.body.user_id;
    var all = request.body.all;
    Mention.find({user_id: user_id},function(err, mentions){
        if(err){
            response.status(400).send('Server error');
            return;
        }
        if (!mentions) {
            response.status(200).send('No mentions are found!');
            return;
        }
        mentions = JSON.parse(JSON.stringify(mentions));
        if (all !== true){
            mentions = mentions.filter(function(mention) {
                return mention.read === false;
            });
        }
        response.status(200).send(mentions);
    });
});

app.post('/changeMentionState', function (request, response) {
    var mention = request.body.mention;
    Mention.findOne({_id: mention._id},function(err, mention_read){
        console.log(mention_read.read);
        if(err){
            response.status(400).send('Server error');
            return;
        }
        if (!mention_read) {
            response.status(200).send('No mentions are found!');
            return;
        }
        mention_read.read = true;
        mention_read.save();
        console.log(mention_read.read + "!");
        response.status(200).send();
    });
});

app.post('/photos/forward', function(request, response) {
    var photo = request.body.photo;
    var visibleList = request.body.visibleList;
    var control = request.body.control;

    var newPhoto = {
        file_name: photo.file_name,
        user_id: request.session.user_id,
        comments: [],
        control:control,
        date_time:new Date().toLocaleString()
    };
    if (control){
        newPhoto.visibleList=visibleList;
    }
    Photo.create(newPhoto, function(err, createdPhoto) {
        if (err) {
            console.log(err);
            response.status(400).send("Error uploading photo");
        }
        response.status(200).send(createdPhoto);
    });
    User.findOne({_id:request.session.user_id},function (err,user) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
        }
        user.recent_uploaded_photo = "images/" + photo.file_name;
        user.save();
    });
});

app.get('/profile/:id', function (request, response) {
    var profile_id = request.params.id;
    Photo.findOne({'_id': profile_id}, function(err, photo) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (!photo) {
            response.status(400).send('Not found');
            return;
        }
        response.status(200).send(photo);
    });
});

var processFormBody2 = multer({storage: multer.memoryStorage()}).single('uploadedProfile');
app.post('/user/profile', function(request, response) {
    processFormBody2(request, response, function (err) {
        var owner_id = request.body.user;
        if (err || !request.file) {
            response.status(400).send("no file");
            return;
        }

        if(request.file.fieldname !== "uploadedProfile") {
            response.status(400).send("no file");
            return;
        }

        var timestamp = new Date().valueOf();
        var filename = 'U' +  String(timestamp) + request.file.originalname;

        fs.writeFile("./images/" + filename, request.file.buffer, function (err) {
            if (err) {
                console.log(err);
                response.status(400).send("Error uploading photo");
            }
            var newPhoto = {
                file_name: filename,
                date_time:new Date().toLocaleString()
            };
            Photo.create(newPhoto, function(err, createdPhoto) {
                if (err) {
                    console.log(err);
                    response.status(400).send("Error uploading photo");
                }
                User.findOne({_id:owner_id},function(err,user){
                    console.log("user.profile: " + createdPhoto._id);
                    user.profile.push(createdPhoto.file_name);
                    user.save();
                });
                response.status(200).send();
            });
        });
    });
});

app.post('/searchFriend', function (request, response) {
    var login_name = request.body.search_name;
    console.log("search_name: " + login_name);
    User.find({'login_name':login_name},
        ['_id','first_name','last_name','location','description','occupation','profile'],
        function (err,login_name_list) {
        if (err){
            response.status(400).send(JSON.stringify(err));
            return;
        }
        response.status(200).send(login_name_list);
    });
});

app.post('/addFriend',function(request,response){
    var friend_id = request.body.friend_id;
    var request_id = request.body.request_id;
    User.findOne({_id:friend_id},function(err,user){
        if (err){
            response.status(400).send(JSON.stringify(err));
            return;
        }
        if (user.friend_list.indexOf(friend_id) >= 0){   // You are already friends!
            response.status(200).send("Friends");
        } else if (user.friend_request_list.indexOf(request_id) < 0){
            user.friend_request_list.push(request_id);
            user.save();
            //console.log("Send Successfully");
            response.status(200).send(true);
        } else {
            //console.log("You have already sent the request!");
            response.status(200).send(false);
        }
    });
});


app.post('/showFriendRequest',function(request,response){
    var friend_requests = request.body.FriendRequests;
    //console.log(friend_requests);
    var list = [];
    async.each(friend_requests,function (user_id,done_callback) {
        User.findOne({'_id':user_id},['_id','first_name','last_name','location','description','occupation','profile'],function(err,user){
            if (err){
                response.status(400).send(JSON.stringify(err));
                return;
            }
            list.push(user);            
            done_callback();     
        });
    },function (err) {
        if (err){
            response.status(400).send("Error");
        } else {
            response.status(200).send(list);
        }        
    });
});


app.post('/acceptFriend',function(request,response){
    var accept_list = request.body.accept_list;
    console.log("accept_list: " + accept_list);
    async.each(accept_list,function (accept_id,done_callback) {
        User.findOne({'_id':accept_id},['friend_list'],function(err,user){
            if (err){
                response.status(400).send(JSON.stringify(err));
                return;
            }
            if (user.friend_list.indexOf(request.session.user_id) < 0){
                user.friend_list.push(request.session.user_id);  // push the current user to the acceptor's friend list
                user.save();
            }
            console.log(user.friend_list + "!");
            done_callback();    
        });    
    },function (err) {
        if (err){
            response.status(400).send("Error");
        } else {
            User.findOne({'_id':request.session.user_id},['friend_request_list','friend_list'],function(err,user2){
                if (err){
                    response.status(400).send(JSON.stringify(err));
                    return;
                }
                console.log(user2.friend_list + " " + accept_list);
                for (var i = accept_list.length - 1; i >= 0; i--){
                    if (user2.friend_list.indexOf(accept_list[i]) < 0){
                        user2.friend_list.push(accept_list[i]);            // add friend
                    }
                    var index = user2.friend_request_list.indexOf(accept_list[i]);
                    console.log(index);
                    if (index >= 0){
                        console.log("before: " + user2.friend_request_list);
                        user2.friend_request_list.splice(index,1); // remove request
                        console.log("after: " + user2.friend_request_list);
                    }
                }
                user2.save();
                response.status(200).send();
            }); 
        }
    });
});

app.post('/sendEmail',function(request,response){
    var email_address = request.body.email;
    var salt = crypto.randomBytes(16).toString('hex');
    nodemailer.createTestAccount((err, account) => {
        var transporter = nodemailer.createTransport({
            host: "smtp.126.com",        // 主机  
            secureConnection : true,     // 使用 SSL  
            port: 465,                   // SMTP 端口  
            auth: {
                user: 'yuji199509@126.com', //刚才注册的邮箱账号
                pass: '3013207390bbs'       //邮箱的授权码，不是注册时的密码
            }
        });

        var html = '<a href="localhost:3000/photo-share.html#!/authentication/' + request.session.user_id  + '/' + salt + '">localhost:3000/photo-share.html#!/authentication/' + request.session.user_id  + '/' + salt + '</a>'; // html body
        console.log("html: " + html);

        // setup email data with unicode symbols
        let mailOptions = {
            from: '"Ji Yu" <yuji199509@126.com>', // sender address
            to: email_address, // list of receivers
            subject: 'Hello ✔', // Subject line
            text: 'This is message from Ji Yu\'s photo sharing website!', // plain text body
            html: html
            // http://localhost:3000/photo-share.html#!/users/5a34749dffa77a213a8b7d13
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
            // Preview only available when sending through an Ethereal account
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

            // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
            // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...         
        });
    });

    User.findOne({'_id':request.session.user_id},['authenticated','authenticated_salt'],function(err,user){
        user.authenticated_salt = salt;
        user.save();
        console.log(salt + "!");
        response.status(200).send();
    });
});

app.post('/authentication',function(request,response){
    var user_id = request.body.user_id;
    console.log(user_id + " " + request.session.user_id);
    if (user_id.equals == request.session.user_id){
        response.status(401).send("You are not the owner!");
        return ;
    }
    var salt = request.body.salt;
    console.log(salt + "?");
    User.findOne({'_id':request.session.user_id},['authenticated','authenticated_salt'],function(err,user){
        if (user.authenticated_salt === salt){
            user.authenticated = true;
            user.save();
            response.status(200).send("Email authentication Successful!");
        } else {
            response.status(401).send("Who are you?");
        }      
    });
});


// This part is used to chat online
var io = require('socket.io').listen(server);

var connectedSockets={};
var allUsers=[{
    login_name:"",
    profile:"cardboard.jpg"
}];                             //初始值即包含"群聊",用""表示login_name

io.on('connection',function(socket){
    socket.on('addUser',function(data){ //有新用户进入聊天室
        console.log("AddUser " + JSON.stringify(data));
        if (!connectedSockets[data.login_name]){        //昵称已被占用
            socket.login_name = data.login_name;
            connectedSockets[socket.login_name] = socket;   //保存每个socket实例,发私信需要用
            allUsers.push(data);
            socket.broadcast.emit('userAdded',data);//广播欢迎新用户,除新用户外都可看到
        }
        socket.emit('allUser',allUsers);//将所有在线用户发给新用户
    });

    socket.on('addMessage',function(data){ //有用户发送新消息
        if (data.to){              //发给特定用户
            if (connectedSockets[data.to]){
                connectedSockets[data.to].emit('messageAdded',data);
            } else {
                connectedSockets[data.from].emit('non-message',data);
            }
            Message.create({
                'from':data.from,
                'to':data.to,
                'text':data.text,
                'profile':data.profile,
                'date':new Date().toLocaleString()
            }, function(err, createdMessage) {
                console.log("Created: " + createdMessage);
                User.findOne({'login_name':data.from},['message_record'],function(err,user){   // save the message into the from
                    if (user.message_record[data.to] === undefined){
                        user.message_record[data.to] = [];
                    }
                    user.message_record[data.to].push(createdMessage._id);   // 是否应该添加_id？
                    user.markModified('message_record');//传入anything，表示该属性类型发生变化
                    user.save();
                    //console.log("data.from:" + JSON.stringify(user.message_record));
                });
                User.findOne({'login_name':data.to},['message_record'],function(err,user){  // save the message into the to
                    if (user.message_record[data.from] === undefined){
                        user.message_record[data.from] = [];
                    }
                    user.message_record[data.from].push(createdMessage._id);
                    user.markModified('message_record');//传入anything，表示该属性类型发生变化
                    user.save();
                    //console.log("data.to: " + JSON.stringify(user.message_record));
                })
            });
        } else {                   //群发
            Message.create({
                'from':data.from,
                'to':data.to,
                'text':data.text,
                'profile':data.profile,
                'date':new Date().toLocaleString()
            },function(err,createdMessage){
                console.log("group: " + createdMessage);
            });
            socket.broadcast.emit('messageAdded',data);//广播消息,除原发送者外都可看到
        }
    });



    socket.on('disconnect', function () {  //有用户退出聊天室
        console.log({  
            login_name: socket.login_name
        });
        socket.broadcast.emit('userRemoved', {  //广播有用户退出
            login_name: socket.login_name
        });
        for(var i = 0;i < allUsers.length;i++){
            if (allUsers[i].login_name === socket.login_name){
                allUsers.splice(i,1);
            }
        }
        delete connectedSockets[socket.login_name]; //删除对应的socket实例
    });
});



app.post('/searchRecord',function(request,response){
    var receiver = request.body.receiver;
    if (receiver === ""){    // group
        Message.find({'to':""},function(err,messages){
            if (err){
                response.status(400).send(JSON.stringify(err));
                return ;
            }
            response.status(200).send(messages);
        });
    } else {
        User.findOne({'_id':request.session.user_id},['login_name','message_record'],function(err,user){
            if (err){
                response.status(400).send(JSON.stringify(err));
                return ;
            }
            var message_id_list = user.message_record[receiver] === undefined ? [] : user.message_record[receiver];
            var message_list = [];

            async.each(message_id_list,function (message_id,callback){
                Message.findOne({'_id':message_id},function (err,message) {
                    message_list.push(message);
                    callback();
                });
            },function (err) {
                response.status(200).send(message_list);
            });
        });
    }
});






//2013-12-04T21:12:00.000Z
function changeDateFormat(dateTime) {
    if (dateTime.length > 25){
        var first = dateTime.slice(4,10);
        var second = dateTime.slice(11,24);
        return first + " " + second;
    }
    return dateTime;
}

function contains(arr, obj) {  
    var i = arr.length;  
    while (i--) {  
        if (arr[i] === obj) {  
            return true;  
        }  
    }  
    return false;  
}  


// var server = app.listen(3000, function () {
//     var port = server.address().port;
//     console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
// });
