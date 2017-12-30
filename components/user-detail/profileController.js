'use strict';

cs142App.controller('profileController', ['$scope', '$rootScope', '$mdDialog','$location','profile','Upload','$http','userId',
    function($scope, $rootScope, $mdDialog,$location,profile,Upload,$http,userId) {
        $scope.profile = {};
        $scope.profile.photo = profile;
        $scope.profile.hide = function() {
            $mdDialog.hide();
        };

        $scope.profile.cancel = function() {
            $mdDialog.cancel();
        };
	 
	    // upload on file select or drop 

	    $scope.upload = function (file) {
            var domForm = new FormData();
            domForm.append('uploadedProfile', file);
            domForm.append('user', userId);
	        $http.post('/user/profile', domForm, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).then(function successCallback(response){
                $rootScope.$broadcast("ProfileChanged");
                console.log("Profile has been modified!");
            }, function errorCallback(response){
                console.error('ERROR uploading photo', response);
            });
            $mdDialog.cancel();
        };
    }]);