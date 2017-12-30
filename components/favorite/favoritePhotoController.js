'use strict';

cs142App.controller('favoritePhotoController', ['$scope', '$rootScope', '$mdDialog','photo','$location',
    function($scope, $rootScope, $mdDialog,photo,$location) {
        $scope.favoritePhoto = {};
        $scope.favoritePhoto.photo = photo;
        console.log(photo.user_id);
        $scope.favoritePhoto.hide = function() {
            $mdDialog.hide();
        };

        $scope.favoritePhoto.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.favoritePhoto.link_to = function () {
            $location.path("/photos/" + $scope.favoritePhoto.photo.user_id);
            $mdDialog.cancel();
        };
    }]);