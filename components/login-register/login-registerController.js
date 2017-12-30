'use strict';

/* jshint node: true */

cs142App.controller('LoginRegisterController', ['$scope', '$resource', '$http', '$location', '$rootScope', '$cookies',
    function($scope, $resource, $http, $location, $rootScope,$cookies) { /*$cookies*/
        $scope.login = {};
        $scope.login.loginName = "";
        $scope.login.password = "";
        $scope.register = {};
        $scope.register.loginName = "";
        $scope.register.firstName = "";
        $scope.register.lastName = "";
        $scope.register.description = "";
        $scope.register.occupation = "";
        $scope.register.location = "";
        $scope.register.password1 = "";
        $scope.register.password2 = "";
        $scope.register.email = "";

        $scope.login.error = "";
        $scope.register.error = "";

        $scope.register.sendEmail = function () {
            var requestBody = {
                userName: $scope.register.userName,
                email: $scope.register.email
            };
            $http.post('/sendEmail',JSON.stringify(requestBody));
        };

        $scope.login.submit = function (isValid) {
            // If you want to use the save password function,just leave the password blank
            if (document.getElementById("save").checked && $scope.login.password === "") {
                $scope.login.password = $cookies.get($scope.login.loginName);
            }
            if (!isValid) {
                $scope.login.error = "The username and password length should exceed 6!";
                return ;
            }

            if (!!$scope.login.loginName && !!$scope.login.password){
                var requestBody = {
                    login_name: $scope.login.loginName,
                    password: $scope.login.password
                };
                $http.post('/admin/login', JSON.stringify(requestBody)).then(function successCallback(response) {
                    if (document.getElementById("save").checked){
                        $cookies.put($scope.login.loginName,$scope.login.password);
                    }
                    $scope.main.loggedInUser = response.data;
                    //console.log("response.data: " + JSON.stringify($scope.main.loggedInUser));
                    $http.post('/recentActivity/',JSON.stringify({
                        activity: "logged in",
                        user_id: $scope.main.loggedInUser._id,
                        control:false,
                        visibleList:[]
                    })).then(function () {
                        $rootScope.$broadcast('listUpdated');
                    });
                    $rootScope.$broadcast('loggedIn');
                    $location.path("/users/" + $scope.main.loggedInUser._id);
                }, function errorCallback(response) {
                    $scope.login.error = response.data;
                    console.log(response.data);
                });
            } else {
                $scope.login.error = "Please complete the form!";
            }
        };

        $scope.register.registerAccount = function (isValid) {
            if (!isValid) {
                $scope.register.error = "The password length should exceed 4!";
                return ;
            }
            if (!($scope.register.firstName && $scope.register.lastName && $scope.register.description && $scope.register.location && $scope.register.userName)){
                $scope.register.error = "Please complete the form!";
                return ;
            }
            if ($scope.register.password1 !== $scope.register.password2) {
                $scope.register.error = "Please re-enter the password!";
                return ;
            }

            var registerSent = {
                userName: $scope.register.userName,
                firstName: $scope.register.firstName,
                lastName: $scope.register.lastName,
                description: $scope.register.description,
                location: $scope.register.location,
                occupation :$scope.register.occupation,
                email: $scope.register.email,
                password: $scope.register.password1
            };
            $http.post('/user', JSON.stringify(registerSent)).then(function successCallback(response) {
                $scope.main.loggedInUser = response.data;
                $scope.register.sendEmail();
                $http.post('/recentActivity/',JSON.stringify({
                    activity: "registered as a user",
                    user_id: $scope.main.loggedInUser._id
                })).then(function () {
                    $rootScope.$broadcast('listUpdated');
                });

                $http.post('/recentActivity/',JSON.stringify({
                    activity: "logged in",
                    user_id: $scope.main.loggedInUser._id,
                    control:false,
                    visibleList:[]
                })).then(function () {
                    $rootScope.$broadcast('listUpdated');
                });

                $rootScope.$broadcast('loggedIn');
                $location.path("/users/" + $scope.main.loggedInUser._id);
                $scope.register.reset();
            }, function errorCallback(response) {
                console.log(response.data);
            });

        };
        $scope.login.reset = function () {
            $scope.login.loginName = "";
            $scope.login.password = "";
            $scope.login.error = "";
        };

        $scope.register.reset = function () {
            $scope.register.userName = "";
            $scope.register.firstName = "";
            $scope.register.lastName = "";
            $scope.register.description = "";
            $scope.register.occupation = "";
            $scope.register.location = "";
            $scope.register.password1 = "";
            $scope.register.password2 = "";
            $scope.register.error = "";
        };

        var now = new Date();
        var hour = now.getHours();
        var background_img = document.getElementById("cs142-login-login");
        if (hour >= 10 && hour <= 15){
            background_img.style.background = 'url("/images/afternoon.jpeg")';
            background_img.style.backgroundSize = '100%';
        } else if (hour >= 15 && hour <= 17){            
            background_img.style.background = 'url("/images/4pm-5pm.jpeg")';
            background_img.style.backgroundSize = '100%';
        } else if (hour >= 6 && hour <= 17){            
            background_img.style.background = 'url("/images/background.jpeg")';
            background_img.style.backgroundSize = '100%';
        }

    }]);