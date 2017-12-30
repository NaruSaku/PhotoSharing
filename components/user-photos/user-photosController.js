'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$routeParams','$resource','$http', '$rootScope','$location','$mdDialog','$anchorScroll','mentioUtil',
    function($scope, $routeParams,$resource, $http, $rootScope,$location,$mdDialog,$anchorScroll,mentioUtil) {
        /*
         * Since the route is specified as '/photos/:userId' in $routeProvider config the
         * $routeParams  should have the userId property set with the path from the URL.
         */
        var userId = $routeParams.userId;
        $scope.userPhotos = {};
        $scope.userPhotos.comments = {};
        $scope.userPhotos.total_photos = [];
        $scope.userPhotos.photos = [];
        $scope.userPhotos.index = 0;
        $scope.userPhotos.noPhotos = false;
        $scope.userPhotos.people = [];
        $scope.userPhotos.percentage = ["100%", "80%", "50%"];


        var User = $resource('/user/:userId');
        var userPhotos = $resource('/photosOfUser/:userId');
        var userList = $resource("/user/list");

        $scope.userPhotos.reload = function () {
            User.get({'userId': userId}, function(user) {
                $scope.userPhotos.fullName = user.first_name + " " + user.last_name;
                $scope.main.appContext = "The Photos of " + $scope.userPhotos.fullName;
                userPhotos.query({'userId': userId},function (photos) {
                    photos = photos.sort(function (photo1, photo2) {
                        if(photo1.like_user_ids.length > photo2.like_user_ids.length) {
                            return -1;
                        } else if(photo1.like_user_ids.length < photo2.like_user_ids.length) {
                            return 1;
                        } else {
                            if (string2DateStamp(photo1.date_time) > string2DateStamp(photo2.date_time)){
                                return -1;
                            } else if (string2DateStamp(photo1.date_time) < string2DateStamp(photo2.date_time)){
                                return 1;
                            }
                            return 0;
                        }
                    });

                    User.get({'userId':$scope.main.loggedInUser._id},function (logged_user) {
                        photos.forEach(function (photo) {
                            if (logged_user.favorite_photos.indexOf(photo._id) >= 0){
                                photo.favorite = true;
                            } else {
                                photo.favorite = false;
                            }

                            if (logged_user.photo_liked_list.indexOf(photo._id) >= 0){
                                photo.liked = true;
                            } else {
                                photo.liked = false;
                            }
                        });
                    });
                    $scope.userPhotos.total_photos = photos;
                    $scope.paginationConf.totalItems = photos.length;
                    $scope.userPhotos.photos = photos.slice(0,$scope.paginationConf.itemsPerPage);

                    if (photos.length === 0){
                        $scope.userPhotos.noPhotos = true;
                    }

                    $scope.userPhotos.photos.forEach(function (photo) {
                        $http.post('/photoView', JSON.stringify({photo_id:photo._id})).then(function successCallback(response) {
                            $rootScope.$broadcast("photoViewed");
                        }, function errorCallback(response) {
                            console.log(response.data);
                        });
                    });
                });
            });



        };

        $scope.userPhotos.reload();

        $scope.userPhotos.addComment = function(photo) {
            var data = JSON.stringify({
                comment: $scope.userPhotos.newComment,
                owner_id:photo.user_id
            });
            var mentions = processComment(photo);
            if (mentions.length !== 0){
                $http.post("/mentions",JSON.stringify({mentions:mentions})).then(function successCallback(response) {
                    console.log("mentions added.");
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            }
            $http.post("/commentsOfPhoto/" + photo._id, data).then(function successCallback(response) {
                $http.post('/recentActivity/',JSON.stringify({
                    activity: "added a comment",
                    user_id: $scope.main.loggedInUser._id,
                    photo_name:photo.file_name,
                    control:photo.control,
                    visibleList:photo.visibleList
                })).then(function () {
                    console.log("Activity updated");
                    $rootScope.$broadcast('listUpdated');
                });
                $rootScope.$broadcast("commentAdded");
                console.log(response.data);
            }, function errorCallback(response) {
                console.log(response.data);
            });
            $scope.userPhotos.newComment = "";
        };

        $scope.userPhotos.hasPhotoAuthority = function (photo) {
            if ($scope.main.loggedInUser){
                return $scope.main.loggedInUser._id === photo.user_id;
            }
        };
  
        $scope.userPhotos.hasCommentAuthority = function (comment) {
            if ($scope.main.loggedInUser){
                return $scope.main.loggedInUser._id === comment.user_id;
            }
        };

        $scope.userPhotos.deleteComment = function(ev,photo,comment) {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.confirm()
                .title('This will delete the comment!')
                .textContent('This delete cannot be revoked')
                .targetEvent(ev)
                .ok('Delete!')
                .cancel('Keep it');

            $mdDialog.show(confirm).then(function() {
                $http.post('/deleteComment', JSON.stringify({photo_id:photo._id,comment_id:comment._id})).then(function successCallback(response) {
                    $rootScope.$broadcast("commentDeleted");
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            }, function() {
                console.log("You don't want to delete the comment at present.");
            });
        };

        $scope.userPhotos.delete = function (ev,photo) {
            var confirm = $mdDialog.confirm()
                .title('This will delete the photo!')
                .textContent('This delete cannot be revoked')
                .targetEvent(ev)
                .ok('Delete!')
                .cancel('Keep it');
            $mdDialog.show(confirm).then(function() {
                $http.post('/deletePhoto', JSON.stringify({photo_id:photo._id})).then(function successCallback(response) {
                    $rootScope.$broadcast("photoDeleted");
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            }, function() {
                console.log("You don't want to delete the photo at present.");
            });

        };



        /* This part is for advanced feature */
        $scope.userPhotos.previous = function () {
            if ($scope.userPhotos.index === 0){
                return ;
            }
            $scope.userPhotos.index--;
            $rootScope.$broadcast("pageChanged");
        };

        $scope.userPhotos.next = function () {
            if ($scope.userPhotos.index === $scope.userPhotos.photos2.length - 1){
                return ;
            }
            $scope.userPhotos.index++;
            $rootScope.$broadcast("pageChanged");
        };

        /* This part is for the like and dislike */
        $scope.userPhotos.like = function(photo) {
            var photo_id = photo._id;
            $http.post('/likePhoto', JSON.stringify({photo_id:photo_id})).then(function successCallback(response) {
                $rootScope.$broadcast("photoLiked");
            }, function errorCallback(response) {
                console.log(response.data);
            });
        };
        $scope.userPhotos.dislike = function(photo) {
            var photo_id = photo._id;
            $http.post('/dislikePhoto', JSON.stringify({photo_id:photo_id})).then(function successCallback(response) {
                $rootScope.$broadcast("photoDisLiked");
            }, function errorCallback(response) {
                console.log(response.data);
            });
        };
        $scope.userPhotos.favorite = function(photo) {
            var photo_id = photo._id;
            photo.favorite = !photo.favorite;
            $http.post('/favorite', JSON.stringify({photo_id:photo_id})).then(function successCallback(response) {
                $rootScope.$broadcast("favorite");
                console.log(response.data.length);
            }, function errorCallback(response) {
                console.log(response.data);
            });
        };

        userList.query({}, function (users) {
            $scope.userPhotos.userNames = users;
        });

        $scope.userPhotos.searchPeople = function(term) {
            if (term === ""){
                return ;
            }
            var peopleList = [];
            angular.forEach($scope.userPhotos.userNames, function(person) {
                if (person.first_name.toUpperCase().indexOf(term.toUpperCase()) >= 0 || person.last_name.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                    var profile_length = person.profile.length;
                    var profile = person.profile[profile_length - 1];
                    if (profile === '5a31ca6582fe983ecda367c0'){
                        person.profile = 'default-profile.jpeg';
                    } else {
                        person.profile = profile;
                    }
                    peopleList.push(person);
                }
            });
            $scope.userPhotos.people = peopleList;
            return peopleList;
        };

        $scope.userPhotos.getTagTextRaw = function(user) {
            return '@' + user.first_name + ' ' + user.last_name;
        };

        function processComment(photo){
            var i, j;
            var findMentions = /@\w+ \w+/i;
            var resArr = [];
            var mentArr = $scope.userPhotos.newComment.match(findMentions);
            if(!mentArr){
                return resArr;
            }
            for(i = 0; i < mentArr.length; i++){
                var name = mentArr[i].slice(1).split(" ");
                if (name.length < 2){
                    return null;
                }

                for(j = 0; j < $scope.userPhotos.userNames.length; j++){
                    if ($scope.userPhotos.userNames[j].first_name === name[0] &&
                        $scope.userPhotos.userNames[j].last_name === name[1]) {
                            resArr.push({
                                caller_id:$scope.main.loggedInUser._id,
                                user_id: $scope.userPhotos.userNames[j]._id,  // people who is mentioned
                                text: $scope.userPhotos.newComment,  
                                photo_id: photo._id,                          // at which photo the person is mentioned
                                photo_owner: photo.user_id,                   
                                photo_name: photo.file_name,
                                user_first_name: $scope.main.loggedInUser.first_name,
                                user_last_name: $scope.main.loggedInUser.last_name
                            });
                    }
                }
            }
            console.log(resArr);
            return resArr;
        }

        $scope.userPhotos.forward = function(photo) {
            $scope.main.controlVisibility(photo);
        };


        $scope.paginationConf = {
            currentPage: 1,
            totalItems: 100,//$scope.userPhotos.total_length,
            itemsPerPage: 3,
            pagesLength: 3,
            perPageOptions: [1,5,10, 20, 30, 40, 50],
            onChange:function(){
                var currentPage = $scope.paginationConf.currentPage;
                var itemsPerPage = $scope.paginationConf.itemsPerPage;
                $scope.userPhotos.photos = $scope.userPhotos.total_photos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            }
        };

        $scope.userPhotos.selectChange = function(percentage){
            var image = document.getElementById("cs142-photos-image");
            image.style.width = percentage;
        }

        

        /** doesn't work here*/
        // $scope.$on("bottom",$scope.gotoBottom);
        // $scope.gotoBottom = function() {
        //     console.log("shit");
        //     setTimeout(function () {
        //         console.log("shit");
        //         $location.hash('bottom');
        //         $anchorScroll();
        //     },1000)
        // };

        // $rootScope.$on('$routeChangeStart', function(newRoute, oldRoute) {
        //     var id = $routeParams.scrollTo;
        //     //$location.hash(id);
        //     $scope.scrollTo(id);
        //     $anchorScroll();
        //     console.log(id);
        // });

        $scope.scrollTo = function(id) {
            //alert("shit");
            $location.hash(id);
            $anchorScroll();
        };


        $scope.$on("commentAdded", $scope.userPhotos.reload);
        $scope.$on("commentDeleted", $scope.userPhotos.reload);
        $scope.$on('photoUploaded', $scope.userPhotos.reload);
        $scope.$on('photoDeleted', $scope.userPhotos.reload);
        $scope.$on('pageChanged', $scope.userPhotos.reload);
        $scope.$on('photoLiked', $scope.userPhotos.reload);
        $scope.$on('photoDisLiked', $scope.userPhotos.reload);
    }]);
