"use strict";

cs142App.controller('commentController', ['$scope', '$routeParams','$resource','$location','$rootScope',
    function ($scope, $routeParams, $resource, $location,$rootScope) {
        /*
         * Since the route is specified as '/users/:userId' in $routeProvider config the
         * $routeParams  should have the userId property set with the path from the URL.
         */
        $scope.comments = {};
        var text = $routeParams.text;
        console.log(text);
        var comment = $resource('/comment/:text',{text:text});
        comment.get({'text':text},function (commentList) {
            $scope.comments = commentList;
            $scope.comments.commentList = commentList.comments;
            $scope.comments.photos = commentList.photos;
        });

    }]);

