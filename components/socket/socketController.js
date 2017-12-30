cs142App.factory('socket', function($rootScope) {
    var socket = io(); //默认连接部署网站的服务器
    return {
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {   //手动执行脏检查
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});


cs142App.factory('userService', function($rootScope) {
    return {
        get: function(users,login_name) {
            if(users instanceof Array){
                for(var i = 0;i < users.length;i++){
                    if(users[i].login_name === login_name){
                        return users[i];
                    }
                }
            } else {
                return null;
            }
        }
    };
});

cs142App.controller("chatController",['$scope','socket','userService','$rootScope','$http','$mdDialog','$routeParams',
    function($scope,socket,userService,$rootScope,$http,$mdDialog,$routeParams){
        var login_name_init = $routeParams.login_name;
        $scope.socket = {};
        var messageWrapper = $('.message-wrapper');
        $scope.login_name = $scope.main.loggedInUser.login_name;
        $scope.receiver = login_name_init === '""' ? "" : login_name_init;//默认是群聊
        $scope.publicMessages = [];//群聊消息
        $scope.privateMessages = {};//私信消息
        $scope.messages = $scope.publicMessages;//默认显示群聊
        $scope.users = [];//
     
        $scope.profile = $scope.main.loggedInUser.profile[$scope.main.loggedInUser.profile.length - 1];

        $scope.login = function(){   //登录进入聊天室
            socket.emit("addUser",{
                login_name:$scope.main.loggedInUser.login_name,
                profile:$scope.profile
            });
        }
        $scope.login();

        $scope.scrollToBottom = function(){
            messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
        }

        $scope.postMessage = function(){
            var msg = {
                text:$scope.words,
                type:"normal",
                profile:$scope.main.loggedInUser.profile,
                from:$scope.main.loggedInUser.login_name,  // from:$scope.main.loggedInUser
                to:$scope.receiver       // to: 
            };
            var rec = $scope.receiver;
            if(rec){  //私信
               if(!$scope.privateMessages[rec]){
                   $scope.privateMessages[rec] = [];
               }
               $scope.privateMessages[rec].push(msg);
            } else { //群聊
                $scope.publicMessages.push(msg);
            }
            $scope.words = "";
            if(rec !== $scope.login_name) { //排除给自己发的情况
                socket.emit("addMessage", msg);
            }
        }
        $scope.setReceiver = function(receiver){
            $scope.receiver = receiver;
            if(receiver){ //私信用户
                if(!$scope.privateMessages[receiver]){
                    $scope.privateMessages[receiver] = [];
                }
                $scope.messages = $scope.privateMessages[receiver];

            } else {//广播
                $scope.messages = $scope.publicMessages;
            } 
            var user = userService.get($scope.users,receiver);
            if(user){ 
                user.hasNewMessage = false;
            }
            $scope.socket.toUser = userService.get($scope.users,$scope.receiver);
            //console.log($scope.socket.toUser);
            if ($scope.socket.toUser === undefined && $scope.socket.toUser !== ""){
                $scope.socket.offline = "[offline]";
            } else {
                $scope.socket.offline = "";
            }
        }

        //接收到欢迎新用户消息
        socket.on('userAdded', function(data) {
            $scope.publicMessages.push({
                text:data.login_name,
                type:"welcome"
            });
            $scope.users.push(data);
        });



        //接收到在线用户消息
        socket.on('allUser', function(data) {
            $scope.users = data;
            $scope.socket.toUser = userService.get($scope.users,$scope.receiver);
            //console.log($scope.socket.toUser);
            if ($scope.socket.toUser === undefined && $scope.socket.toUser !== ""){
                $scope.socket.offline = "[offline]";
            } else {
                $scope.socket.offline = "";
            }
        });

        //接收到用户退出消息
        socket.on('userRemoved', function(data) {
            $scope.publicMessages.push({
                text:data.login_name,
                type:"bye"
            });
            for(var i = 0;i < $scope.users.length;i++){
                if($scope.users[i].login_name === data.login_name){
                    $scope.users.splice(i,1);
                    return;
                }
            }
        });

        //接收到新消息
        socket.on('messageAdded', function(data) {
            if(data.to){        //私信
                if(!$scope.privateMessages[data.from]){
                    $scope.privateMessages[data.from] = [];
                }
                $scope.privateMessages[data.from].push(data);
            } else {         //群发
                $scope.publicMessages.push(data);
            }
            var fromUser = userService.get($scope.users,data.from);
            var toUser = userService.get($scope.users,data.to);
            if($scope.receiver !== data.to) {        //与来信方不是正在聊天当中才提示新消息
                if (fromUser && toUser.login_name) {
                    fromUser.hasNewMessage = true;   //私信
                } else {
                    toUser.hasNewMessage = true;     //群发
                }
            }
        });

        socket.on('non-message', function(data) {
            if(!$scope.privateMessages[data.from]){
                $scope.privateMessages[data.from] = [];
            }
            $scope.privateMessages[data.from].push(data);
            $scope.messages = $scope.privateMessages[data.from];
        });






        $scope.socket.search_record = function(){
            $http.post('/searchRecord', JSON.stringify({receiver:$scope.receiver}))
            .then(function successCallback(response) {
                $scope.socket.record = response.data;
                $scope.socket.record = $scope.socket.record.sort(function (record1, record2) {
                    if (string2DateStamp(record1.date) > string2DateStamp(record2.date)){
                        return 1;
                    } else if (string2DateStamp(record1.date) < string2DateStamp(record2.date)){
                        return -1;
                    }
                    return 0;
                });
                var child = $scope.$new(false,$scope);
                $mdDialog.show({
                    clickOutsideToClose: true,
                    controller: 'historyController',
                    scope: child,
                    templateUrl: 'components/socket/history.html',
                    locals:{
                        'messages':$scope.socket.record,
                        'self':$scope.main.loggedInUser.login_name,
                        'receiver':$scope.receiver
                    }
                });
            }, function errorCallback(response) {
                console.log(response.data);
            });
        }

}]);

cs142App.controller('historyController', ['$scope', '$mdDialog', 'messages','self','receiver',
    function($scope, $mdDialog,messages,self,receiver) {
        $scope.history = {};
        $scope.history.messages = messages;
        $scope.history.login_name = self;
        $scope.history.receiver = receiver;
        $scope.history.cancel = function(){
            $mdDialog.cancel();
        };
    }
]);

cs142App.directive('message', ['$timeout',function($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'components/socket/message.html',
        scope:{
            info:"=",
            self:"=",
            scrolltothis:"&"
        },
        link:function(scope, elem, attrs){
            scope.time = new Date();
            $timeout(scope.scrolltothis);
        }
    };
}]).directive('user', ['$timeout',function($timeout) {
        return {
            restrict: 'E',
            templateUrl: 'components/socket/user.html',
            scope:{
                info:"=",
                iscurrentreceiver:"=",
                setreceiver:"&"
            }
        };
}]).directive('history', ['$timeout',function($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'components/socket/history_message.html',
        scope:{
            info:"=",
            self:"="
        }
    };
}]);
