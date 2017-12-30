'use strict';

cs142App.controller('favoriteController', ['$scope','$resource','$http','$mdDialog','$rootScope',
    function ($scope,$resource,$http,$mdDialog,$rootScope) {
        $scope.main.title = 'Favorite';
        $scope.favorite = {};
        $scope.favorite.load = function () {
            $http.post('/getFavorite',"").then(function (response) {
                $scope.favorite.list = response.data;
                console.log($scope.favorite.list);
            });
        };

        $scope.favorite.load();

        $scope.favorite.showDetail = function (photo) {
            $mdDialog.show({
                controller: 'favoritePhotoController',
                templateUrl: 'components/favorite/favoritePhotoTemplate.html',
                parent: angular.element(document.body),
                // targetEvent: ev,
                clickOutsideToClose:true,
                locals:{
                    photo:photo
                }
            }).then(function(answer) {}, function() {});
        };
        $scope.favorite.showDelete = function () {
            $scope.favorite.show = "cs142-favorite-show";
        };
        $scope.favorite.hideDelete = function () {
            $scope.favorite.show = "cs142-favorite-hide";
        };

        $scope.favorite.show = "cs142-favorite-hide";

        $scope.favorite.delete = function (photo) {
            var confirm = $mdDialog.confirm()
                .title('This will delete this photo from your favorite list!')
                .textContent('This action cannot be revoked')
                .ok('Delete Anyway')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function() {
                console.log(photo._id);
                var photo_id = photo._id;
                $http.post('/favorite', JSON.stringify({photo_id:photo_id})).then(function successCallback(response) {
                    $rootScope.$broadcast("favorite");
                    console.log(response.data.length);
                }, function errorCallback(response) {
                    console.log(response.data);
                });
            }, function() {
                console.log("You don't want to delete the account at present.");
            });


        };

        $scope.$on("favorite",$scope.favorite.load);

    }]);