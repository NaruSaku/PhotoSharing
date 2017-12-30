'use strict';

cs142App.controller('DialogController', ['$scope', '$rootScope', '$mdDialog','user','$location','loggedInUser',
    function($scope, $rootScope, $mdDialog,user,$location,loggedInUser) {
        $scope.dialog = {};
        $scope.dialog.user = user;
        $scope.dialog.show = true;
        //console.log(user.recentActivity);
        var list = user.recentActivity.visible_list;
        if (list.length !== 0 && list.indexOf(loggedInUser._id) < 0){
            $scope.dialog.show = false;
        }
        $scope.dialog.hide = function() {
            $mdDialog.hide();
        };

        $scope.dialog.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.dialog.answer = function(answer) {
            $mdDialog.hide(answer);
        };

        $scope.dialog.link_to = function (parameter) {
            if (parameter !== "all"){
                $location.path("/users/" + $scope.dialog.user._id);
            } else {
                $location.path("/activity");
            }
            $scope.dialog.cancel();
        };
    }]);