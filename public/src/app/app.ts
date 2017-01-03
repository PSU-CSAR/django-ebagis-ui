/// <reference path="../../../typings/main.d.ts" />

var app = angular.module('ebagis', [
    'app.templates',
    'ui.bootstrap',
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ui.router',
]);

app.directive('header', ['$rootScope', 'UserProfile', function($rootScope, UserProfile){
   var linkFn = function(scope, element, attrs) {       
        scope.authenticated = false;
        scope.user = UserProfile.data;
        
        $rootScope.$on('UserProfile.authenticated', function() {
            scope.$apply(function() {
                scope.authenticated = true;
                scope.user = UserProfile.data;
                console.log("user after login: ", scope.user);
            });
        });

        $rootScope.$on('UserProfile.unauthenticated', function() {
            scope.$apply(function() {
                scope.authenticated = false;
                scope.user = UserProfile.data;
                console.log("user after logout: ", scope.user);
            });
        });
    };

    return {
        restrict: 'E',
        templateUrl: 'app-templates/app/partial/header/header.html',
        link: linkFn,
    };
}]);

app.directive('headerAccount', function(){
    return {
        restrict: 'E',
        templateUrl: 'app-templates/app/partial/header/account.html',
    };
});

app.config(["$stateProvider", '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {

    // standard auth types
    var auth = {
        anon: ["Auth", function (Auth) { return Auth.isAnonymous(true); }],
        auth: ["Auth", function (Auth) { return Auth.isAuthenticated(true); }],
        admin: ["Auth", function (Auth) { return Auth.hasRole("ROLE_ADMIN"); }],
    }

    // remove the # from urls where supported
    $locationProvider.html5Mode(true);

    // set the default route -> redirect requests to unrecognized pages
    // might consider making a 404 page and redirecting to that
    $urlRouterProvider.otherwise('404');

    // setup the states (routes) on the stateProvider
    $stateProvider

    // anyone states
    .state("forbidden", {
            /* ... */
     })

    .state("404", {
        url: '/404',
        templateUrl: 'app-templates/app/partial/main/404.html',
     })
    
    // anonymous states
    .state("login", {
        url: '/account/login',
        templateUrl: 'app-templates/app/partial/account/login.html',
        controller: 'LoginController',
        resolve: {
            auth: auth.anon,
            userProfile: "UserProfile",
        }
    })

    .state("register", {
        url: '/account/register',
        templateUrl: 'app-templates/app/partial/account/register.html',
        controller: 'RegisterController',
        resolve: {
            auth: auth.anon,
            userProfile: "UserProfile",
        }
    })

    .state("forgot", {
        url: '/account/reset',
        templateUrl: 'app-templates/app/partial/account/passwordreset.html',
        controller: 'PasswordResetController',
        resolve: {
            auth: auth.anon,
            userProfile: "UserProfile",
        }
    })

    .state("resetConfirm", {
        url: '/account/resetConfirm/{userToken:[0-9A-Za-z_\-]+}/{passwordResetToken:[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20}}',
        //url: '/account/resetConfirm/:userToken/:passwordResetToken',
        templateUrl: 'app-templates/app/partial/account/passwordresetconfirm.html',
        controller: 'PasswordResetConfirmController',
        resolve: {
            auth: auth.anon,
            userProfile: "UserProfile",
        }
    })

    .state("verifyEmail", {
        url: '/account/verifyEmail/{emailVerificationToken:[^/]{1,65}}',
        templateUrl: 'app-templates/app/partial/account/verifyemail.html',
        controller: 'VerifyEmailController',
        resolve: {
            auth: auth.anon,
            userProfile: "UserProfile",
        }
    })


    // authenticated states
    .state("logout", {
        url: '/account/logout',
        templateUrl: 'app-templates/app/partial/account/logout.html',
        controller: 'LogoutController',
        resolve: {
            auth: auth.auth,
            userProfile: "UserProfile",
        }
    })

    .state("account", {
        url: '/account',
        templateUrl: 'app-templates/app/partial/account/account.html',
        resolve: {
            auth: auth.auth,
            userProfile: "UserProfile",
        }
    })

    .state("changePassword", {
        url: '/account/changepassword',
        templateUrl: 'app-templates/app/partial/account/passwordchange.html',
        controller: 'PasswordChangeController',
        resolve: {
            auth: auth.auth,
            userProfile: "UserProfile",
        }
    })

    .state("root", {
        url: '/',
        controller: 'RootController',
        resolve: {
            auth: auth.auth,
            userProfile: "UserProfile",
        }
    })

    .state("home", {
        url: '/map',
        templateUrl: 'app-templates/app/partial/map/map.html',
        controller: 'MapController',
        resolve: {
            auth: auth.auth,
            userProfile: "UserProfile",
        }
    })

    // staff-only states

    // admin-only states
    .state("admin", {
        /* ... */
        resolve: {
            auth: auth.admin,
        }
    });

}])

app.factory("Auth", ["UserProfile", function (UserProfile) {

    var Auth = {

        OK: 200,

        // "we don't know who you are, so we can't say if you're authorized to access
        // this resource or not yet, please sign in first"
        UNAUTHORIZED: 401,

        // "we know who you are, and your profile does not allow you to access this resource"
        FORBIDDEN: 403,

        NOTFOUND: 404,

        hasRole: function(role) {
            return new Promise(function(resolve, reject) {
                if (UserProfile.hasRole(role)) {
                    resolve(Auth.OK);
                } else if (UserProfile.isAnonymous()) {
                    reject(Auth.UNAUTHORIZED);
                } else {
                    reject(Auth.FORBIDDEN);
                }
            });
        },

        hasAnyRole: function(roles) {
            return new Promise(function(resolve, reject) {
                if (UserProfile.hasAnyRole(roles)) {
                    resolve(Auth.OK);
                } else if (UserProfile.isAnonymous()) {
                    reject(Auth.UNAUTHORIZED);
                } else {
                    reject(Auth.FORBIDDEN);
                }
            });
        },

        isAnonymous: function(force) {
            return new Promise(function(resolve, reject) {
                UserProfile.isAnonymous(force).then(
                    function() {
                        resolve(Auth.OK);
                    }).catch(function(err) {
                        reject(Auth.FORBIDDEN);
                    }
                );
            });
        },

        isAuthenticated: function(force) {
            return new Promise(function(resolve, reject) {
                UserProfile.isAuthenticated(force).then(
                    function() {
                        resolve(Auth.OK);
                    }).catch(function(err) {
                        reject(Auth.UNAUTHORIZED);
                    }
                );
            });
        },

    };

    return Auth;

}])

class UserProfileClass {

    constructor(api, rootScope) {
        // use rootScope for signals to watchers
        this.$rootScope = rootScope;

        // need to store whether or not the current user is authenticated
        this.authenticated = null,

        // we use authPromise to store the last auth request made
        // in case we've just made the request and it hasn't returned yet
        // thus, we can be efficient and not request again unless forced
        this.authPromise = null,
        
        // the service with the API methods
        this.api = api;

        // finally let's run some initialization logic
        this.initialize();
    }

    initialize() {
        // setup our API service
        // first arg is the base URL of the server API
        // second arg is a boolean of whether to use django sessions or not
        //this.api.initialize(window.appConfig.urlBase + '/api/rest/account', false);
        // run authenticationStatus the first time to determine initial
        // value for this.authenticated
        this.authenticationStatus(true).then(function() {
            console.log("user is logged in on profile initialization");
        }).catch(function(err) {
            console.log("profile error on initialization: ", err);
        });
    }

    setAuthenticated(val) {
        if (this.authenticated != val) {
            this.authenticated = val;
            if (val) {
                this.$rootScope.$broadcast("UserProfile.authenticated");
            } else {
                this.$rootScope.$broadcast("UserProfile.unauthenticated");
            }
        }
    }

    getAuthenticated() {
        return this.authenticated;
    }

    refresh() {
        up = this
        up.authPromise = new Promise(function(resolve, reject) {
        //return new Promise(function(resolve, reject) {
            up.api.profile().then(function(response) {
                up.data = response;
                up.setAuthenticated(true);
                resolve(response);
            }).catch(function(err) {
                up.setAuthenticated(false);
                // destroy any cached login tokens
                up.api.clearUserToken();
                reject(err);
            });
        });
        return up.authPromise;
    }

    hasRole(role) {
        return this.data.roles.indexOf(role) >= 0;
    }

    hasAnyRole(roles) {
        return !!this.data.roles.filter(function (role) {
            return roles.indexOf(role) >= 0;
        }).length;
    }

    isAnonymous(force) {
        up = this
        return new Promise(function(resolve, reject) {
            up.authenticationStatus(force).then(
                function() {
                    reject();
                }).catch(function(err) {
                    resolve(err);
                }
            );
        });
    }

    isAuthenticated(force) {
        up = this
        return new Promise(function(resolve, reject) {
            up.authenticationStatus(force).then(
                function() {
                    resolve();
                }).catch(function(err) {
                    reject(err);
                }
            );
        });
    }

    authenticationStatus(force) {
        // Set force to true to ignore stored value and query API
        force = force || false;
        var up = this;
        return new Promise(function(resolve, reject) {
            if (up.authPromise != null && !force) {
                // we have a stored promise
                promise = up.authPromise;
            } else {
                // we don't have a strored promise, or we're forcing a
                // request back to the API to verify the authentication status
                promise = up.refresh();
            }
            promise.then(function() {
                resolve();
            }).catch(function(err) {
                reject("User is not logged in.", err);
            });
        });
    }

    login(username, password) {
        up = this;
        return up.api.login(username, password).then(function() {
            return up.authenticationStatus(true).then(function() {
                up.$rootScope.$broadcast("UserProfile.logged_in", data);
            }).catch(function(err) {
                console.log(err);
            });
        }).catch(function(err) {
            console.log(err);
            return err;
        });
    }

    logout() {
        up = this;
        return up.api.logout().then(function(){
            up.data = null;
            up.authPromise = null;
            up.setAuthenticated(false);
            up.$rootScope.$broadcast("UserProfile.logged_out");
        }).catch(function(err) {
            console.log(err);
        });
    }
}

app.service("UserProfile", ["ebagisAPI", "$rootScope", UserProfileClass]);

app.run(["$rootScope", "Auth", "$state", "UserProfile", function ($rootScope, Auth, $state, UserProfile) {
    // if a user trys to go to a page they can't access, redirect them
    $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
        console.log("caught an auth error: request to ", toState," with params ", toParams, " returned ", error);
        if (error == Auth.UNAUTHORIZED) {
            console.log("unauthed: go to login");
            $state.go("login");
        } else if (error == Auth.FORBIDDEN) {
            console.log("forbidden: go home");
            $state.go("root");
        } else if (error == Auth.NOTFOUND) {
            console.log("not found: go 404");
            $state.go("404");
        }
    });
}])

app.controller('RootController', ['$scope', '$state', function ($scope, $state) {
    $state.go("account");
}]);

app.controller('UserProfileController', ['$scope', 'ebagisAPI', 'Validate', 'UserProfile', function ($scope, ebagisAPI, Validate, UserProfile) {
    $scope.model = {'first_name':'','last_name':'','email':''};
    $scope.complete = false;
   
    $scope.model = UserProfile.data;

    $scope.updateProfile = function(formData, model){
        $scope.errors = [];
        Validate.form_validation(formData,$scope.errors);
        if (!formData.$invalid) {
        ebagisAPI.updateProfile(model)
            .then(function(data) {
                // success case
                $scope.complete = true;
            }, function(data) {
                // error case
                $scope.error = data;
            });
        }
    }
}]);

app.controller('AuthrequiredCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });


class ebagisAPI {
    
    constructor(http, cookies, state) {
        this.$http = http;
        this.$cookies = cookies;
        this.$state = state;

        // Change this to point to your Django REST Auth API
        // e.g. /api/rest-auth  (DO NOT INCLUDE ENDING SLASH)
        this.API_URL = window.appConfig.restURL + '/account';
        // Set use_session to true to use Django sessions to store security token.
        // Set use_session to false to store the security token locally and transmit it as a custom header.
        this.use_session = false;
    }

    request(args) {    
        // uncomment next line for request tracing
        console.trace();

        // Let's retrieve the token from the cookie, if available
        if (this.$cookies.get('token')) {
            this.$http.defaults.headers.common.Authorization = 'Token ' + this.$cookies.get('token');
        }
        
        // Continue
        params = args.params || {}
        args = args || {};
        url = this.API_URL + args.url,
        method = args.method || "GET",
        params = params,
        data = args.data || {};
        api = this;

        return new Promise(function(resolve, reject) {
            // Fire the request, as configured.
            api.$http({
                url: url,
                withCredentials: api.use_session,
                method: method.toUpperCase(),
                headers: {'X-CSRFToken': api.$cookies['csrftoken']},
                params: params,
                data: data
            })

            .success(angular.bind(api, function(data, status, headers, config) {
                resolve(data, status);
            }))

            .error(angular.bind(api, function(data, status, headers, config) {
                console.log("error syncing with: " + url);
                
                // Set request status
                if (data) {
                    data.status = status;
                }
                
                if (status == 0) {
                    if (data == "") {
                        data = {};
                        data['status'] = 0;
                        data['non_field_errors'] = ["Could not connect. Please try again."];
                    }
                    // or if the data is null, then there was a timeout.
                    if (data == null) {
                        // Inject a non field error alerting the user
                        // that there's been a timeout error.
                        data = {};
                        data['status'] = 0;
                        data['non_field_errors'] = ["Server timed out. Please try again."];
                    }
                }

                reject(data, status, headers, config);
            }));
        });
    }

    clearUserToken() {
        var api = this;
        api.$cookies.remove('token');
    }

    register(firstName, lastName, username, password1, password2, email, more) {
        var data = {
            'first_name': firstName,
            'last_name': lastName,
            'username': username,
            'password1': password1,
            'password2': password2,
            'email': email,
            'activation_url': this.$state.href('verifyEmail').replace(/\/+/g, "/"),
        }
        data = angular.extend(data, more);
        return this.request({
            'method': "POST",
            'url': "/registration/",
            'data' :data
        });
    }

    login(username, password) {
        var api = this;
        delete api.$http.defaults.headers.common.Authorization;
        api.$cookies.remove('token');

        return api.request({
            'method': "POST",
            'url': "/login/",
            'data':{
                'username':username,
                'password':password
            }
        }).then(function(data) {
            if (!api.use_session) {
                api.$http.defaults.headers.common.Authorization = 'Token ' + data.key;
                api.$cookies.put("token", data.key);
            }
            return data;
        }, function(data) {
            return data;
        });
    }

    logout() {
        var api = this;
        return api.request({
            'method': "POST",
            'url': "/logout/",
        }).then(function(data) {
            delete api.$http.defaults.headers.common.Authorization;
            api.clearUserToken();
        });
    }
    
    changePassword(password1, password2) {
        return this.request({
            'method': "POST",
            'url': "/password/change/",
            'data': {
                'new_password1': password1,
                'new_password2': password2
            }
        });
    }
    
    resetPassword(email) {
        return this.request({
            'method': "POST",
            'url': "/password/reset/",
            'data': {
                'email': email,
                'reset_url': this.$state.href('resetConfirm').replace(/\/+/g, "/"),
                'site_name': 'ebagis',
            }
        });
    }
    
    profile() {
        return this.request({
            'method': "GET",
            'url': "/user/",
        }); 
    }
    
    updateProfile(data) {
        return this.request({
            'method': "PATCH",
            'url': "/user/",
            'data': data
        }); 
    }
    
    verify(key) {
        return this.request({
            'method': "POST",
            'url': "/registration/verify-email/",
            'data': {'key': key} 
        });            
    }
    
    confirmReset(uid, token, password1, password2) {
        return this.request({
            'method': "POST",
            'url': "/password/reset/confirm/",
            'data': {
                'uid': uid,
                'token': token,
                'new_password1':password1,
                'new_password2':password2
            }
        });
    }
    
    initialize(url, sessions) {
        this.API_URL = url;
        this.use_session = sessions;
    }

}

app.service('ebagisAPI', ['$http', '$cookies', '$state', ebagisAPI]);

app.controller('LoginController', ['$scope', '$state', 'Validate', 'UserProfile', function ($scope, $state, Validate, UserProfile) {
    $scope.model = {
        'username': '',
        'password': '',
    };
    $scope.complete = false;

    $scope.login = function(formData) {
        $scope.errors = [];
        Validate.form_validation(formData,$scope.errors);
        
        if (!formData.$invalid) {
            UserProfile.login($scope.model.username, $scope.model.password)
            .then(function() {  
                if (UserProfile.getAuthenticated()) {
                    $state.go('account');
                } else {
                    $scope.$apply(function() {
                        $scope.errors = {'non_field_errors':['The provided username and/or password is incorrect.']}; 
                    });
                }
            });
        }
    }
}]);

app.controller('LogoutController', ['$scope', '$state', 'UserProfile', function ($scope, $state, UserProfile) {
    UserProfile.logout().then(function(){
        $state.go('login');
    }).catch(function(err) {
        console.log(err);
    });
}]);

app.controller('MainController', ['$scope', '$cookies', '$location', 'ebagisAPI', 'UserProfile', function ($scope, $cookies, $location, ebagisAPI, UserProfile) {
    
    $scope.login = function(){
      UserProfile.login(prompt('Username'),prompt('password'))
      .then(function(data){
        handleSuccess(data);
      },handleError);
    }
    
    $scope.logout = function(){
      UserProfile.logout()
      .then(handleSuccess,handleError);
    }
    
    $scope.resetPassword = function(){
      ebagisAPI.resetPassword(prompt('Email'))
      .then(handleSuccess,handleError);
    }
    
    $scope.register = function(){
      ebagisAPI.register(
          prompt('First Name'),
          prompt('Last Name'),
          prompt('Username'),
          prompt('Password'),
          prompt('Email')
      )
      .then(handleSuccess,handleError);
    }
    
    $scope.verify = function(){
      ebagisAPI.verify(prompt("Please enter verification code"))
      .then(handleSuccess,handleError);
    }
    
    $scope.goVerify = function(){
      $location.path("/verifyEmail/"+prompt("Please enter verification code"));
    }
    
    $scope.changePassword = function(){
      ebagisAPI.changePassword(prompt("Password"), prompt("Repeat Password"))
      .then(handleSuccess,handleError);
    }
    
    $scope.profile = function(){
      ebagisAPI.profile()
      .then(handleSuccess,handleError);
    }
    
    $scope.updateProfile = function(){
      ebagisAPI.updateProfile({'first_name': prompt("First Name"), 'last_name': prompt("Last Name"), 'email': prompt("Email")})
      .then(handleSuccess,handleError);
    }
    
    $scope.confirmReset = function(){
      ebagisAPI.confirmReset(prompt("Code 1"), prompt("Code 2"), prompt("Password"), prompt("Repeat Password"))
      .then(handleSuccess,handleError);
    }

    $scope.goConfirmReset = function(){
      $location.path("/passwordResetConfirm/"+prompt("Code 1")+"/"+prompt("Code 2"))
    }
    
    var handleSuccess = function(data){
      $scope.response = data;
    }
    
    var handleError = function(data){
      $scope.response = data;
    }

    $scope.show_login = true;
    $scope.$on("UserProfile.logged_in", function(data){
      $scope.show_login = false;
    });
    $scope.$on("UserProfile.logged_out", function(data){
      $scope.show_login = true;
    });

}]);

app.controller('PasswordChangeController', function ($scope, $state, $timeout, ebagisAPI, Validate) {
    $scope.model = {'new_password1':'','new_password2':''};
    $scope.complete = false;
    $scope.changePassword = function(formData){
        $scope.errors = [];
        Validate.form_validation(formData,$scope.errors);
        if(!formData.$invalid){
            ebagisAPI.changePassword($scope.model.new_password1, $scope.model.new_password2)
            .then(function(data){
                // success case
                console.log(data);
                $scope.$apply(function() {
                    $scope.complete = true;
                });
                $timeout(function(){$state.go("login");}, 8000);
            }, function(data){
                // error case
                console.log(data);
                $scope.$apply(function () {
                    $scope.errors = data;
                });
            });
        }
    }
});

app.controller('PasswordResetController', function ($scope, $state, $timeout, ebagisAPI, Validate) {
    $scope.processForm = function(email) {
        $scope.errors = [];
        Validate.form_validation(email, $scope.errors);
        if (!$scope.email.$invalid) {
            console.log($scope.email);
            ebagisAPI.resetPassword($scope.email)
            .then(function(data) {
                // success case
                console.log(data);
                $scope.$apply(function() {
                    $scope.message = data.success;
                });
                $timeout(function(){$state.go("login");}, 8000);
            }, function(data) {
                // error case
                console.log(data);
                $scope.$apply(function () {
                    $scope.errors = data;
                });
            });
        }
    };
});

app.controller('PasswordResetConfirmController', function ($scope, $stateParams, $state, $timeout, ebagisAPI, Validate) {
    $scope.model = {'new_password1':'','new_password2':''};
    $scope.complete = false;
    $scope.confirmReset = function(formData) {
        $scope.errors = [];
        Validate.form_validation(formData,$scope.errors);
        if(!formData.$invalid) {
            ebagisAPI.confirmReset(
                    $stateParams['userToken'],
                    $stateParams['passwordResetToken'],
                    $scope.model.new_password1,
                    $scope.model.new_password2,
            ).then(function(data) {
                // success case
                $scope.$apply(function() {
                    $scope.complete = true;
                });
                $timeout(function(){$state.go("login");}, 8000);
            }, function(data) {
                // error case
                $scope.$apply(function() {
                    $scope.errors = data;
                });
            });
        }
    }
});

app.controller('RestrictedController', function ($scope, $location) {
    $scope.$on('UserProfile.logged_in', function() {
        $location.path('/');
    });
});

app.controller('RegisterController', function ($scope, ebagisAPI, Validate) {
    $scope.model = {
        'firstName': '',
        'lastName': '',
        'username': '',
        'password': '',
        'email': ''
    };
    $scope.complete = false;
    $scope.register = function(formData) {
        $scope.errors = [];
        Validate.form_validation(formData,$scope.errors);
        if (!formData.$invalid) {
            ebagisAPI.register(
                $scope.model.firstName,
                $scope.model.lastName,
                $scope.model.username,
                $scope.model.password1,
                $scope.model.password2,
                $scope.model.email
            ).then(function(data) {
                // success case
                $scope.$apply(function() {
                    $scope.complete = true;
                });
            }, function(data) {
                // error case
                $scope.$apply(function() {
                    $scope.errors = data;
                });
            });
        }
    }
});

app.service('Validate', function Validate() {
    return {
        'message': {
            'minlength': 'This value is not long enough.',
            'maxlength': 'This value is too long.',
            'email': 'A properly formatted email address is required.',
            'required': 'This field is required.'
        },
        'more_messages': {
            'demo': {
                'required': 'Here is a sample alternative required message.'
            }
        },
        'check_more_messages': function(name,error){
            return (this.more_messages[name] || [])[error] || null;
        },
        validation_messages: function(field,form,error_bin){
            var messages = [];
            for(var e in form[field].$error){
                if(form[field].$error[e]){
                    var special_message = this.check_more_messages(field,e);
                    if(special_message){
                        messages.push(special_message);
                    }else if(this.message[e]){
                        messages.push(this.message[e]);
                    }else{
                        messages.push("Error: " + e)
                    }
                }
            }
            var deduped_messages = [];
            angular.forEach(messages, function(el, i){
                if(deduped_messages.indexOf(el) === -1) deduped_messages.push(el);
            });
            if(error_bin){
                error_bin[field] = deduped_messages;
            }
        },
        'form_validation': function(form,error_bin){
            for(var field in form){
                if(field.substr(0,1) != "$"){
                    this.validation_messages(field,form,error_bin);
                }
            }
        }
    }
});

app.controller('VerifyEmailController', function ($scope, $stateParams, ebagisAPI) {
    ebagisAPI.verify($stateParams["emailVerificationToken"]).then(function(data) {
        $scope.success = true;
    }, function(data) {
        $scope.failure = false;
    });
});
