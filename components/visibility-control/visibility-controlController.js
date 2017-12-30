'use strict';

cs142App.controller('visibilityControlController', ['$scope', '$rootScope', '$mdDialog', '$resource',
    function($scope, $rootScope, $mdDialog, $resource) {
        $scope.visibility = {};

        var UserList = $resource("/user/list");
        UserList.query({},function (list) {
            $scope.visibility.users = list.filter(function(user) {
                return (user._id !== $scope.main.loggedInUser._id);
            });
        });

        $scope.visibility.visibleList = [];
        $scope.visibility.selectAll=false;

        $scope.visibility.checked = [];
        $scope.visibility.selectAll = function () {
            if($scope.visibility.select_all) {
                $scope.visibility.checked = [];
                angular.forEach($scope.visibility.users, function (i) {
                    i.checked = true;
                    $scope.visibility.checked.push(i._id);
                });
            } else {
                angular.forEach($scope.visibility.users, function (i) {
                    i.checked = false;
                    $scope.visibility.checked = [];
                });
            }
            //console.log($scope.visibility.checked);
        };
        $scope.visibility.selectOne = function () {
            angular.forEach($scope.visibility.users , function (i) {
                var index = $scope.visibility.checked.indexOf(i._id);
                if(i.checked && index === -1) {
                    $scope.visibility.checked.push(i._id);
                } else if (!i.checked && index !== -1){
                    $scope.visibility.checked.splice(index, 1);
                }
            });

            if ($scope.visibility.users.length === $scope.visibility.checked.length) {
                $scope.visibility.select_all = true;
            } else {
                $scope.visibility.select_all = false;
            }
            //console.log($scope.visibility.checked);
        };

        $scope.visibility.cancel = function() {
            $mdDialog.cancel(true);
        };

        $scope.visibility.answer = function() {
            $scope.visibility.users.forEach(function(user) {
                if (user.checked) {
                    $scope.visibility.visibleList.push(user._id);
                }
            });
            $scope.visibility.visibleList.push($scope.main.loggedInUser._id);
            $mdDialog.hide($scope.visibility.visibleList);
        };
    }]);