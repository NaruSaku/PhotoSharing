'use strict';

var cs142App = angular.module('cs142App', ['ngRoute', 'ngMaterial', 'ngResource','ngCookies','mentio','tm.pagination','ngFileUpload','ui.bootstrap','ngToast']); /*'ngCookies'*/

cs142App.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
        when('/users', {
            templateUrl: 'components/user-detail/user-detailTemplate.html',
            controller: 'UserDetailController'
        }).
        when('/users/:userId', {
            templateUrl: 'components/user-detail/user-detailTemplate.html',
            controller: 'UserDetailController'
        }).
        when('/photos/:userId', {
            templateUrl: 'components/user-photos/user-photosTemplate.html',
            controller: 'UserPhotosController'
        }).
        when('/login-register',{
            templateUrl: 'components/login-register/login-registerTemplate.html',
            controller:'LoginRegisterController'
        }).
        when('/authentication/:user_id/:salt',{
            templateUrl: 'components/login-register/authenticationTemplate.html',
            controller:'AuthenticationController'
        }).
        when('/comment/:text',{
            templateUrl: 'components/comment/commentTemplate.html',
            controller:'commentController'
        }).
        when('/activity',{
            templateUrl: 'components/activity/activityTemplate.html',
            controller:'activityController'
        }).
        when('/favorite',{
            templateUrl: 'components/favorite/favoriteTemplate.html',
            controller:'favoriteController'
        }).
        when('/chat/:login_name',{
            templateUrl: 'components/socket/socketTemplate.html',
            controller:'chatController'
        }).
        otherwise({
            redirectTo: '/users'
        });
    }]);

cs142App.controller('MainController', ['$scope', '$mdSidenav','$resource','$rootScope','$location','$http','$mdDialog','$modal','ngToast',
    function ($scope, $mdSidenav,$resource,$rootScope,$location,$http,$mdDialog,$modal,ngToast) {
        $scope.main = {};
        $scope.main.title = 'CS142 Photo Sharing Website';
        $scope.main.authorName = "Ji Yu";
        $scope.main.loggedInUser = undefined;
        $scope.main.selectedPhotoFile = undefined;
        $scope.main.upload = false;

        var service = {
            SaveState: function () {
                if ($scope.main.loggedInUser){
                    localStorage.userService = angular.toJson($scope.main.loggedInUser);
                }
            },

            RestoreState: function () {
                //delete localStorage.userService;
                if(localStorage.userService){
                    $scope.main.loggedInUser = angular.fromJson(localStorage.userService);
                }
            }
        };

        window.onbeforeunload = function (event) {
            $rootScope.$broadcast('savestate');
        };
        $rootScope.$on("savestate", service.SaveState);


        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            //console.log("next: " + JSON.stringify(next) + " current: " + current);
            if ($scope.main.loggedInUser === undefined) {
                service.RestoreState();
                if($scope.main.loggedInUser){
                    return;
                }
                if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                    $location.path("/login-register");
                }
            } else {
                if (next.templateUrl === "components/login-register/login-registerTemplate.html") {
                    $location.path("/users/" + $scope.main.loggedInUser._id);
                }
            }
        });

        $scope.main.showUserList = function () {
            $mdSidenav("users").toggle();
        };

        /* Reference:http://blog.csdn.net/YYecust/article/details/52419522 */
        $scope.main.controlVisibility = function(photo) {
            console.log("Begin to upload photo.");
            var child = $scope.$new(false,$scope);
            $mdDialog.show({
                clickOutsideToClose: true,
                controller: 'visibilityControlController',
                scope: child,
                templateUrl: 'components/visibility-control/visibility-controlTemplate.html'
            }).then(function(result) { // everybody can see
                if ($scope.main.upload){
                    $scope.main.uploadPhoto(true, result);
                } else {
                    $scope.main.forward(result,photo,true);
                }
            }, function(result) {   // only people on the list can see
                if (result){
                    if ($scope.main.upload){
                        var visibleList = [];
                        $scope.main.uploadPhoto(false, visibleList);
                    } else {
                        $scope.main.forward(result,photo,false);
                    }
                }
            });
        };

        //Called on file selection - we simply save a reference to the file in selectedPhotoFile
        $scope.main.inputFileNameChanged = function (element) {
            $scope.main.selectedPhotoFile = element.files[0];
            $scope.main.upload = true;
            $scope.main.controlVisibility();
        };

        $scope.main.inputFileNameSelected = function () {
            return !!$scope.main.selectedPhotoFile;
        };

        // Upload the photo file selected by the user using a post request to the URL /photos/new
        $scope.main.uploadPhoto = function (control, visibleList) {
            if (!$scope.main.inputFileNameSelected()) {
                console.error("uploadPhoto called will no selected file");
                return;
            }
            console.log('fileSubmitted', $scope.main.selectedPhotoFile);

            var domForm = new FormData();
            domForm.append('uploadedphoto', $scope.main.selectedPhotoFile);
            domForm.append('control', control);
            domForm.append('visibleList', visibleList);
            console.log(visibleList);

            // Using $http to POST the form
            $http.post('/photos/new', domForm, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).then(function successCallback(response){
                var photo = response.data;
                console.log(photo._id);
                $http.post('/recentActivity/',JSON.stringify({
                    activity: "posted a photo",
                    user_id: $scope.main.loggedInUser._id,
                    control:photo.control,
                    visibleList:photo.visibleList
                })).then(function () {
                    $rootScope.$broadcast('listUpdated');
                });

                $rootScope.$broadcast("photoUploaded");
                $location.path("/photos/" + $scope.main.loggedInUser._id);
                $scope.main.selectedPhotoFile = undefined;
                $scope.main.upload = false;
                console.log("Photo has been uploaded successfully!");
            }, function errorCallback(response){
                // Couldn't upload the photo. XXX  - Do whatever you want on failure.
                console.error('ERROR uploading photo', response);
            });
        };

        $scope.main.forward = function(visibleList,photo,control){
            console.log(photo);
            $http.post('/photos/forward',JSON.stringify({
                'photo':photo,
                'visibleList':visibleList,
                'control':control
            })).then(function successCallback(response){
                $rootScope.$broadcast("photoUploaded");
            },function errorCallback(response){
                console.error('ERROR forwarding photo', response);
            });
        }

        $scope.main.showActivities = function () {
            $location.path("/activity");
        };

        $scope.main.logout = function() {
            $http.post('/recentActivity/',JSON.stringify({
                activity: "logged out",
                user_id: $scope.main.loggedInUser._id,
                control:false,
                visibleList:[]
            })).then(function () {
                $rootScope.$broadcast('listUpdated');
                $http.post('/admin/logout','').then(function successCallback(response) {
                    delete $scope.main.loggedInUser;
                    delete localStorage.userService;
                    $scope.main.title = 'CS142 Photo Sharing Website';
                    $location.path("/login-register");
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            });

        };

        $scope.main.submit = function () {
            $location.path("/comment/" + $scope.main.comment);
            $scope.main.comment = "";
        };

        $scope.main.searchFriend = function() {
            var modalInstance = $modal.open({
                templateUrl : 'modal.html',     //script标签中定义的id
                controller : 'modalCtrl',       //modal对应的Controller
                resolve : {
                    //data : ""
                }
            });
            modalInstance.result.then(function(search_name) {   
                $http.post('/searchFriend',JSON.stringify({'search_name':search_name}))
                .then(function successCallback(response) {
                    $scope.main.login_name_list = response.data;
                    // if ($scope.main.login_name_list.length === 0){
                    //     console.log("No such user.");
                    // } else {
                        console.log($scope.main.login_name_list.length + " user(s) have been found.");
                        $scope.main.addFriend($scope.main.login_name_list);
                    //}
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            }, function(reason) {  
                console.log(reason);// 点击空白区域，总会输出backdrop  
            });  
        };

        $scope.main.addFriend = function(list){
            var modalInstance = $modal.open({
                templateUrl : 'addFriendmodal.html',     //script标签中定义的id
                controller : 'AddFriendCtrl',       //modal对应的Controller
                resolve : {  
                    list : function() {  
                        return list;  
                    }  
                }  
            });
            modalInstance.result.then(function(chosen_friend_id) {  
                if (chosen_friend_id === $scope.main.loggedInUser._id || chosen_friend_id === null || chosen_friend_id === undefined){    // cannot add friend to yourself
                    console.log("invalid");
                    return ;
                } 
                $http.post('/addFriend',JSON.stringify({
                    'friend_id':chosen_friend_id,
                    'request_id':$scope.main.loggedInUser._id
                }))
                .then(function successCallback(response) {
                    console.log(response.data);
                    if (response.data === "Friends"){
                        ngToast.create({
                          className: 'warning',
                          content: 'You are already friends.'
                        });
                    } else if (response.data){
                        ngToast.create('Send successfully!');
                    } else {
                        ngToast.create({
                          className: 'warning',
                          content: 'You have sent this request before.'
                        });
                    }
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            }, function(reason) {  
                console.log(reason);// 点击空白区域，总会输出backdrop  
            });  
        };

        $scope.main.showFriendRequest = function(){
            console.log($scope.main.loggedInUser);
            $http.post('/showFriendRequest',JSON.stringify({'FriendRequests':$scope.main.loggedInUser.friend_request_list})).
            then(function successCallback(response) {
                $scope.main.friend_request_list = response.data;
                
                console.log($scope.main.friend_request_list.length + " request(s) have been found.");
                var modalInstance = $modal.open({
                    templateUrl : 'friendRequest.html',     //script标签中定义的id
                    controller : 'friendRequestCtrl',       //modal对应的Controller
                    resolve : {
                        list : function() {  
                            return $scope.main.friend_request_list;  
                        }  
                    }
                });
                modalInstance.result.then(function(accept_list) {   
                    $http.post('/acceptFriend',JSON.stringify({'accept_list':accept_list}))
                    .then(function successCallback(response) {
                        ngToast.create('Accept successfully!');
                    }, function errorCallback(response) {
                        console.log(response.data);
                    });
                }, function(reason) {  
                    console.log(reason);// 点击空白区域，总会输出backdrop  
                });  

            }, function errorCallback(response) {
                console.log(response.data);
            });
        }


    }]);


cs142App.controller('modalCtrl', function($scope, $modalInstance) {

    //在这里处理要进行的操作   
    $scope.ok = function() {
        $modalInstance.close($scope.selected);  
    };
    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    }
});

cs142App.controller('AddFriendCtrl', function($scope, $modalInstance,list) {
    $scope.list = list;
    $scope.chosen_friend;
    $scope.choose = function(id){
        console.log(id);
        $scope.chosen_friend = id;
        $scope.ok();
    }
    $scope.ok = function() {
        $modalInstance.close($scope.chosen_friend);  
    };
    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    }
});

cs142App.controller('friendRequestCtrl', function($scope, $modalInstance,list) {
    $scope.list = list;
    $scope.accept_list = [];
    $scope.accept = function(id){
        if ($scope.accept_list.indexOf(id) < 0){
            $scope.accept_list.push(id);
        }  
        $scope.list.splice($scope.list.indexOf(id),1);  // not sure
    }
    $scope.ok = function() {
        if (list.length === 0){
            $scope.cancel();
        }
        $modalInstance.close($scope.accept_list);  
    };
    $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
    }
});

// 2012-08-30 10:44:23
function string2DateStamp(stringTime) {
    var timestamp2 = Date.parse(stringTime);
    timestamp2 = timestamp2 / 1000;
    return timestamp2;
}

// cs142App.run(function($rootScope, $location, $anchorScroll, $routeParams) {
//     $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
//         $location.hash($routeParams.scrollTo);
//         $anchorScroll();
//     });
// });

