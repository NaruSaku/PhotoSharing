'use strict';

cs142App.controller('AuthenticationController', ['$scope', '$rootScope', '$routeParams','$http','$location',
    function($scope, $rootScope, $routeParams,$http,$location) {
        $scope.authentication = {};
        var userId = $routeParams.user_id;
        var salt = $routeParams.salt;


        $scope.authentication.notAuthorized = false;
        $scope.authentication.checked = false;

        $http.post('/authentication',JSON.stringify({'user_id':userId,'salt':salt}))
        .then(function successCallback(response) {
            $scope.authentication.checked = true;
            $scope.authentication.notAuthorized = false;
            $scope.authentication.showTime(5);  
            console.log(response.data);
        }, function errorCallback(response) {
            $scope.authentication.checked = true;
            $scope.authentication.notAuthorized = true;
            $scope.authentication.showTime(5);  
            console.log(response.data);
        });
 
        $scope.authentication.showTime = function(count){  
            setInterval(function(){ 
                count -= 1;  
                document.getElementById("seconds").innerHTML = count;
                if(count === 0){  
                    if ($scope.authentication.notAuthorized){    // not the user
                        alert("shit2");
                        $location.path("http://localhost:3000/photo-share.html#!/login-register");
                    } else {
                        console.log("shit3")
                        $location.path("/users/" + $scope.main.loggedInUser._id);   // The email validation completed, redirect to the main page
                    }
                }  
            }, 1000);  
        }     

    }]);