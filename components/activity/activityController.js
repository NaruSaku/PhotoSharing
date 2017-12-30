'use strict';

cs142App.controller('activityController', ['$scope','$resource','$http',
    function ($scope,$resource,$http) {
        $scope.main.title = 'Activities';
        $scope.activity = {};
        $http.post('/activity',"").then(function (response) {
            $scope.activity.activity_list = response.data;
        });
    }]);