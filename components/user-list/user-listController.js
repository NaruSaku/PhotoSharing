'use strict';

cs142App.controller('UserListController', ['$scope','$resource','$mdDialog','$location','$http',
    function ($scope,$resource,$mdDialog,$location,$http) {
        $scope.main.title = 'User List';
        $scope.userList = {};
        $scope.userList.userNames = [];

        var userList = $resource("/user/list");

        $scope.userList.reload = function () {
            userList.query({}, function (users) {
                $scope.userList.userNames = users;
            });
        };

        $scope.userList.reload();

        $scope.userList.showRecentActivity = function(ev,user) {
            $mdDialog.show({
                controller: 'DialogController',
                templateUrl: 'components/user-list/DialogTemplate.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                //scope:$scope,
                locals:{
                    loggedInUser:$scope.main.loggedInUser,
                    user:user
                }
            }).then(function(answer) {}, function() {});
        };

        $scope.userList.showFavorite = function () {
            $location.path("/favorite");
        };

        $scope.userList.load = function () {
            $http.post('/getFavorite',"").then(function (response) {
                $scope.userList.list = response.data;
                // choose the first 4
                $scope.userList.list = $scope.userList.list.slice(0,4);
            });
        };
        $scope.userList.load();

        $scope.userList.chat = function(){
            $location.path('/chat/""');
        }


        $scope.$on('photoUploaded', $scope.userList.reload);
        $scope.$on('photoDeleted', $scope.userList.reload);
        $scope.$on('listUpdated', $scope.userList.reload);
        $scope.$on('favorite',$scope.userList.load);
    }]);