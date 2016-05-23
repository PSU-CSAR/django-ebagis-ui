/// <reference path="../../../typings/main.d.ts" />
angular.module('ebagis', [
    'app.templates',
    'auth'
]);
// your app setup here
'use strict';
angular.module('auth', [
    'app.templates',
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
])
    .config(function ($routeProvider) {
    $routeProvider
        .when('/', {
        templateUrl: 'app-templates/auth/views/main.html',
        controller: 'MainCtrl',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/register', {
        templateUrl: 'app-templates/auth/views/register.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/passwordReset', {
        templateUrl: 'app-templates/auth/views/passwordreset.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/passwordResetConfirm/:firstToken/:passwordResetToken', {
        templateUrl: 'app-templates/auth/views/passwordresetconfirm.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/login', {
        templateUrl: 'app-templates/auth/views/login.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/verifyEmail/:emailVerificationToken', {
        templateUrl: 'app-templates/auth/views/verifyemail.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/logout', {
        templateUrl: 'app-templates/auth/views/logout.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/userProfile', {
        templateUrl: 'app-templates/auth/views/userprofile.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/passwordChange', {
        templateUrl: 'app-templates/auth/views/passwordchange.html',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/restricted', {
        templateUrl: 'app-templates/auth/views/restricted.html',
        controller: 'RestrictedCtrl',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus();
                }]
        }
    })
        .when('/authRequired', {
        templateUrl: 'app-templates/auth/views/authrequired.html',
        controller: 'AuthrequiredCtrl',
        resolve: {
            authenticated: ['djangoAuth', function (djangoAuth) {
                    return djangoAuth.authenticationStatus(true);
                }]
        }
    })
        .otherwise({
        redirectTo: '/'
    });
})
    .run(function (djangoAuth) {
    djangoAuth.initialize('https://test.ebagis.geog.pdx.edu/api/rest/account', false);
});
'use strict';
angular.module('auth')
    .service('djangoAuth', function djangoAuth($q, $http, $cookies, $rootScope) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var service = {
        /* START CUSTOMIZATION HERE */
        // Change this to point to your Django REST Auth API
        // e.g. /api/rest-auth  (DO NOT INCLUDE ENDING SLASH)
        'API_URL': '/api/rest/account',
        // Set use_session to true to use Django sessions to store security token.
        // Set use_session to false to store the security token locally and transmit it as a custom header.
        'use_session': false,
        /* END OF CUSTOMIZATION */
        'authenticated': null,
        'authPromise': null,
        'request': function (args) {
            // Let's retrieve the token from the cookie, if available
            if ($cookies.get('token')) {
                $http.defaults.headers.common.Authorization = 'Token ' + $cookies.get('token');
            }
            // Continue
            params = args.params || {};
            args = args || {};
            var deferred = $q.defer(), url = this.API_URL + args.url, method = args.method || "GET", params = params, data = args.data || {};
            // Fire the request, as configured.
            $http({
                url: url,
                withCredentials: this.use_session,
                method: method.toUpperCase(),
                headers: { 'X-CSRFToken': $cookies['csrftoken'] },
                params: params,
                data: data
            })
                .success(angular.bind(this, function (data, status, headers, config) {
                deferred.resolve(data, status);
            }))
                .error(angular.bind(this, function (data, status, headers, config) {
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
                deferred.reject(data, status, headers, config);
            }));
            return deferred.promise;
        },
        'register': function (username, password1, password2, email, more) {
            var data = {
                'username': username,
                'password1': password1,
                'password2': password2,
                'email': email
            };
            data = angular.extend(data, more);
            return this.request({
                'method': "POST",
                'url': "/registration/",
                'data': data
            });
        },
        'login': function (username, password) {
            var djangoAuth = this;
            return this.request({
                'method': "POST",
                'url': "/login/",
                'data': {
                    'username': username,
                    'password': password
                }
            }).then(function (data) {
                if (!djangoAuth.use_session) {
                    $http.defaults.headers.common.Authorization = 'Token ' + data.key;
                    $cookies.put("token", data.key);
                }
                djangoAuth.authenticated = true;
                $rootScope.$broadcast("djangoAuth.logged_in", data);
            });
        },
        'logout': function () {
            var djangoAuth = this;
            return this.request({
                'method': "POST",
                'url': "/logout/"
            }).then(function (data) {
                delete $http.defaults.headers.common.Authorization;
                $cookies.remove('token');
                djangoAuth.authenticated = false;
                $rootScope.$broadcast("djangoAuth.logged_out");
            });
        },
        'changePassword': function (password1, password2) {
            return this.request({
                'method': "POST",
                'url': "/password/change/",
                'data': {
                    'new_password1': password1,
                    'new_password2': password2
                }
            });
        },
        'resetPassword': function (email) {
            return this.request({
                'method': "POST",
                'url': "/password/reset/",
                'data': {
                    'email': email
                }
            });
        },
        'profile': function () {
            return this.request({
                'method': "GET",
                'url': "/user/"
            });
        },
        'updateProfile': function (data) {
            return this.request({
                'method': "PATCH",
                'url': "/user/",
                'data': data
            });
        },
        'verify': function (key) {
            return this.request({
                'method': "POST",
                'url': "/registration/verify-email/",
                'data': { 'key': key }
            });
        },
        'confirmReset': function (uid, token, password1, password2) {
            return this.request({
                'method': "POST",
                'url': "/password/reset/confirm/",
                'data': {
                    'uid': uid,
                    'token': token,
                    'new_password1': password1,
                    'new_password2': password2
                }
            });
        },
        'authenticationStatus': function (restrict, force) {
            // Set restrict to true to reject the promise if not logged in
            // Set to false or omit to resolve when status is known
            // Set force to true to ignore stored value and query API
            restrict = restrict || false;
            force = force || false;
            if (this.authPromise == null || force) {
                this.authPromise = this.request({
                    'method': "GET",
                    'url': "/user/"
                });
            }
            var da = this;
            var getAuthStatus = $q.defer();
            if (this.authenticated != null && !force) {
                // We have a stored value which means we can pass it back right away.
                if (this.authenticated == false && restrict) {
                    getAuthStatus.reject("User is not logged in.");
                }
                else {
                    getAuthStatus.resolve();
                }
            }
            else {
                // There isn't a stored value, or we're forcing a request back to
                // the API to get the authentication status.
                this.authPromise.then(function () {
                    da.authenticated = true;
                    getAuthStatus.resolve();
                }, function () {
                    da.authenticated = false;
                    if (restrict) {
                        getAuthStatus.reject("User is not logged in.");
                    }
                    else {
                        getAuthStatus.resolve();
                    }
                });
            }
            return getAuthStatus.promise;
        },
        'initialize': function (url, sessions) {
            this.API_URL = url;
            this.use_session = sessions;
            return this.authenticationStatus();
        }
    };
    return service;
});
'use strict';
angular.module('auth')
    .service('Validate', function Validate() {
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
        'check_more_messages': function (name, error) {
            return (this.more_messages[name] || [])[error] || null;
        },
        validation_messages: function (field, form, error_bin) {
            var messages = [];
            for (var e in form[field].$error) {
                if (form[field].$error[e]) {
                    var special_message = this.check_more_messages(field, e);
                    if (special_message) {
                        messages.push(special_message);
                    }
                    else if (this.message[e]) {
                        messages.push(this.message[e]);
                    }
                    else {
                        messages.push("Error: " + e);
                    }
                }
            }
            var deduped_messages = [];
            angular.forEach(messages, function (el, i) {
                if (deduped_messages.indexOf(el) === -1)
                    deduped_messages.push(el);
            });
            if (error_bin) {
                error_bin[field] = deduped_messages;
            }
        },
        'form_validation': function (form, error_bin) {
            for (var field in form) {
                if (field.substr(0, 1) != "$") {
                    this.validation_messages(field, form, error_bin);
                }
            }
        }
    };
});
'use strict';
/**
 * @ngdoc function
 * @name angularDjangoRegistrationAuthApp.controller:AuthrequiredCtrl
 * @description
 * # AuthrequiredCtrl
 * Controller of the angularDjangoRegistrationAuthApp
 */
angular.module('auth')
    .controller('AuthrequiredCtrl', function ($scope) {
    $scope.awesomeThings = [
        'HTML5 Boilerplate',
        'AngularJS',
        'Karma'
    ];
});
'use strict';
angular.module('auth')
    .controller('LoginCtrl', function ($scope, $location, djangoAuth, Validate) {
    $scope.model = { 'username': '', 'password': '' };
    $scope.complete = false;
    $scope.login = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            djangoAuth.login($scope.model.username, $scope.model.password)
                .then(function (data) {
                // success case
                $location.path("/");
            }, function (data) {
                // error case
                $scope.errors = data;
            });
        }
    };
});
'use strict';
angular.module('auth')
    .controller('LogoutCtrl', function ($scope, $location, djangoAuth) {
    djangoAuth.logout();
});
'use strict';
angular.module('auth')
    .controller('MainCtrl', function ($scope, $cookies, $location, djangoAuth) {
    $scope.login = function () {
        djangoAuth.login(prompt('Username'), prompt('password'))
            .then(function (data) {
            handleSuccess(data);
        }, handleError);
    };
    $scope.logout = function () {
        djangoAuth.logout()
            .then(handleSuccess, handleError);
    };
    $scope.resetPassword = function () {
        djangoAuth.resetPassword(prompt('Email'))
            .then(handleSuccess, handleError);
    };
    $scope.register = function () {
        djangoAuth.register(prompt('Username'), prompt('Password'), prompt('Email'))
            .then(handleSuccess, handleError);
    };
    $scope.verify = function () {
        djangoAuth.verify(prompt("Please enter verification code"))
            .then(handleSuccess, handleError);
    };
    $scope.goVerify = function () {
        $location.path("/verifyEmail/" + prompt("Please enter verification code"));
    };
    $scope.changePassword = function () {
        djangoAuth.changePassword(prompt("Password"), prompt("Repeat Password"))
            .then(handleSuccess, handleError);
    };
    $scope.profile = function () {
        djangoAuth.profile()
            .then(handleSuccess, handleError);
    };
    $scope.updateProfile = function () {
        djangoAuth.updateProfile({ 'first_name': prompt("First Name"), 'last_name': prompt("Last Name"), 'email': prompt("Email") })
            .then(handleSuccess, handleError);
    };
    $scope.confirmReset = function () {
        djangoAuth.confirmReset(prompt("Code 1"), prompt("Code 2"), prompt("Password"), prompt("Repeat Password"))
            .then(handleSuccess, handleError);
    };
    $scope.goConfirmReset = function () {
        $location.path("/passwordResetConfirm/" + prompt("Code 1") + "/" + prompt("Code 2"));
    };
    var handleSuccess = function (data) {
        $scope.response = data;
    };
    var handleError = function (data) {
        $scope.response = data;
    };
    $scope.show_login = true;
    $scope.$on("djangoAuth.logged_in", function (data) {
        $scope.show_login = false;
    });
    $scope.$on("djangoAuth.logged_out", function (data) {
        $scope.show_login = true;
    });
});
'use strict';
angular.module('auth')
    .controller('MasterCtrl', function ($scope, $location, djangoAuth) {
    // Assume user is not logged in until we hear otherwise
    $scope.authenticated = false;
    // Wait for the status of authentication, set scope var to true if it resolves
    djangoAuth.authenticationStatus(true).then(function () {
        $scope.authenticated = true;
    });
    // Wait and respond to the logout event.
    $scope.$on('djangoAuth.logged_out', function () {
        $scope.authenticated = false;
    });
    // Wait and respond to the log in event.
    $scope.$on('djangoAuth.logged_in', function () {
        $scope.authenticated = true;
    });
    // If the user attempts to access a restricted page, redirect them back to the main page.
    $scope.$on('$routeChangeError', function (ev, current, previous, rejection) {
        console.error("Unable to change routes.  Error: ", rejection);
        $location.path('/restricted').replace();
    });
});
'use strict';
angular.module('auth')
    .controller('PasswordchangeCtrl', function ($scope, djangoAuth, Validate) {
    $scope.model = { 'new_password1': '', 'new_password2': '' };
    $scope.complete = false;
    $scope.changePassword = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            djangoAuth.changePassword($scope.model.new_password1, $scope.model.new_password2)
                .then(function (data) {
                // success case
                $scope.complete = true;
            }, function (data) {
                // error case
                $scope.errors = data;
            });
        }
    };
});
'use strict';
angular.module('auth')
    .controller('PasswordresetCtrl', function ($scope, djangoAuth, Validate) {
    $scope.model = { 'email': '' };
    $scope.complete = false;
    $scope.resetPassword = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            djangoAuth.resetPassword($scope.model.email)
                .then(function (data) {
                // success case
                $scope.complete = true;
            }, function (data) {
                // error case
                $scope.errors = data;
            });
        }
    };
});
'use strict';
angular.module('auth')
    .controller('PasswordresetconfirmCtrl', function ($scope, $routeParams, djangoAuth, Validate) {
    $scope.model = { 'new_password1': '', 'new_password2': '' };
    $scope.complete = false;
    $scope.confirmReset = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            djangoAuth.confirmReset($routeParams['firstToken'], $routeParams['passwordResetToken'], $scope.model.new_password1, $scope.model.new_password2)
                .then(function (data) {
                // success case
                $scope.complete = true;
            }, function (data) {
                // error case
                $scope.errors = data;
            });
        }
    };
});
'use strict';
angular.module('auth')
    .controller('RegisterCtrl', function ($scope, djangoAuth, Validate) {
    $scope.model = { 'username': '', 'password': '', 'email': '' };
    $scope.complete = false;
    $scope.register = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            djangoAuth.register($scope.model.username, $scope.model.password1, $scope.model.password2, $scope.model.email)
                .then(function (data) {
                // success case
                $scope.complete = true;
            }, function (data) {
                // error case
                $scope.errors = data;
            });
        }
    };
});
'use strict';
/**
 * @ngdoc function
 * @name angularDjangoRegistrationAuthApp.controller:RestrictedCtrl
 * @description
 * # RestrictedCtrl
 * Controller of the angularDjangoRegistrationAuthApp
 */
angular.module('auth')
    .controller('RestrictedCtrl', function ($scope, $location) {
    $scope.$on('djangoAuth.logged_in', function () {
        $location.path('/');
    });
});
'use strict';
angular.module('auth')
    .controller('UserprofileCtrl', function ($scope, djangoAuth, Validate) {
    $scope.model = { 'first_name': '', 'last_name': '', 'email': '' };
    $scope.complete = false;
    djangoAuth.profile().then(function (data) {
        $scope.model = data;
    });
    $scope.updateProfile = function (formData, model) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            djangoAuth.updateProfile(model)
                .then(function (data) {
                // success case
                $scope.complete = true;
            }, function (data) {
                // error case
                $scope.error = data;
            });
        }
    };
});
'use strict';
angular.module('auth')
    .controller('VerifyemailCtrl', function ($scope, $routeParams, djangoAuth) {
    djangoAuth.verify($routeParams["emailVerificationToken"]).then(function (data) {
        $scope.success = true;
    }, function (data) {
        $scope.failure = false;
    });
});
angular.module("app.templates", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("app-templates/auth/views/authrequired.html", "<p>This is a restricted view.  You must be authenticated to view it.</p>\n");
        $templateCache.put("app-templates/auth/views/login.html", "<div id=\"login_view\" ng-controller=\"LoginCtrl\">\n  <form role=\"form\" ng-submit=\"login(loginForm)\" name=\"loginForm\" novalidate>\n    <div class=\"form-group\">\n      <label for=\"id_username\">Username</label>\n      <input name=\"username\" id=\"id_username\" type=\"text\" ng-model=\"model.username\" placeholder=\"Username\" class=\"form-control\" required />\n    </div>\n    <div class=\"alert alert-danger\" ng-repeat=\"error in errors.username\">{{error}}</div>\n    <div class=\"form-group\">\n      <label for=\"id_password\">Password</label>\n      <input name=\"password\" id=\"id_password\" type=\"password\" ng-model=\"model.password\" placeholder=\"Password\" class=\"form-control\" required />\n    </div>\n    <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password\">{{error}}</div>\n    <div class=\"alert alert-danger\" ng-repeat=\"error in errors.non_field_errors\">{{error}}</div>\n    <div class=\"alert alert-danger\" ng-if=\"error\">{{error}}</div>\n    <button type=\"submit\" class=\"btn btn-primary\">Login</button>\n  </form>\n</div>\n");
        $templateCache.put("app-templates/auth/views/logout.html", "<div id=\"logout_view\" ng-controller=\"LogoutCtrl\">\n	<div class=\"alert alert-info\">You have logged out.</div>\n</div>");
        $templateCache.put("app-templates/auth/views/main.html", "<h4>Routes</h4>\n    <p>\n        <a ng-hide=\"authenticated\" href=\"#/login\" class=\"btn btn-primary\">Login</a>\n        <a ng-hide=\"authenticated\" href=\"#/passwordReset\" class=\"btn btn-primary\">Send Password Reset</a>\n        <a ng-hide=\"authenticated\" ng-click=\"goConfirmReset()\" class=\"btn btn-primary\">Confirm Password Reset</a>\n    </p>\n    <p>\n        <a ng-show=\"authenticated\" href=\"#/logout\" class=\"btn btn-primary\">Logout</a>\n        <a ng-hide=\"authenticated\" ng-href=\"#/register\" class=\"btn btn-primary\">Register</a>\n        <a ng-click=\"goVerify()\" class=\"btn btn-primary\">Verify Email</a>\n        <a ng-show=\"authenticated\" href=\"#/passwordChange\" class=\"btn btn-primary\">Change Password</a>\n        <a ng-show=\"authenticated\" href=\"#/userProfile\" class=\"btn btn-primary\">Profile</a>\n        <a href=\"#/authRequired\" class=\"btn btn-primary\">Restricted Page</a>\n    </p>\n<hr/>\n<h4>Kitchen Sink Demo</h4>\n<div style=\"margin-bottom:25px;\">\n  <div style=\"margin-bottom:15px;\">\n    <button ng-hide=\"authenticated\" ng-click=\"login()\" class=\"btn btn-primary\">Login</button>\n    <button ng-show=\"authenticated\" ng-click=\"logout()\" class=\"btn btn-primary\">Logout</button>\n    <button ng-hide=\"authenticated\" ng-click=\"resetPassword()\" class=\"btn btn-primary\">Send Password Reset</button>\n    <button ng-hide=\"authenticated\" ng-click=\"confirmReset()\" class=\"btn btn-primary\">Confirm Password Reset</button>\n    <button ng-hide=\"authenticated\" ng-click=\"register()\" class=\"btn btn-primary\">Register</button>\n    <button ng-click=\"verify()\" class=\"btn btn-primary\">Verify Email</button>\n    <button ng-show=\"authenticated\" ng-click=\"changePassword()\" class=\"btn btn-primary\">Change Password</button>\n    <button ng-show=\"authenticated\" ng-click=\"profile()\" class=\"btn btn-primary\">Get Profile</button>\n    <button ng-show=\"authenticated\" ng-click=\"updateProfile()\" class=\"btn btn-primary\">Update Profile</button>\n  </div>\n\n  <p><textarea style=\"width:90%;height:200px;\">{{response}}</textarea></p>\n\n</div>\n\n<hr/>\n<h4>ngInclude Demo - Login</h4>\n<div ng-if=\"show_login\" ng-include=\"\'app-templates/auth/views/login.html\'\"></div>\n<div ng-if=\"!show_login\" class=\"alert alert-info\">You have logged in.</div>\n\n\n<div class=\"footer\">\n  <p>Tivix</p>\n</div>\n\n");
        $templateCache.put("app-templates/auth/views/passwordchange.html", "<div id=\"passwordChange_view\" ng-controller=\"PasswordchangeCtrl\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-submit=\"changePassword(changePasswordForm)\" name=\"changePasswordForm\" ng-if=\"authenticated\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_password1\">New Password</label>\n                <input name=\"new_password1\" id=\"id_password1\" type=\"password\" ng-model=\"model.new_password1\" placeholder=\"New Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.new_password1\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password2\">Repeat Password</label>\n                <input name=\"new_password2\" id=\"id_password2\" type=\"password\" ng-model=\"model.new_password2\" placeholder=\"Repeat Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.new_password2\">{{error}}</div>\n            <button ng-show=\"authenticated\" type=\"submit\" class=\"btn btn-primary\">Change Password</button>\n        </form>\n        <div class=\"alert alert-warning\" ng-if=\"authenticated != true\">You need to be logged in to do this!</div>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You have changed your password.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/auth/views/passwordreset.html", "<div id=\"passwordReset_view\" ng-controller=\"PasswordresetCtrl\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated != true\" name=\"passwordResetForm\" ng-submit=\"resetPassword(passwordResetForm)\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_email\">Email</label>\n                <input name=\"email\" id=\"id_email\" type=\"text\" ng-model=\"model.email\" placeholder=\"Email\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n            <button ng-hide=\"authenticated\" type=\"submit\" class=\"btn btn-primary\">Reset Password</button>\n        </form>\n        <p ng-if=\"authenticated\">You are already logged in!  You don\'t need to reset your password.</p>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You should receive an email shortly with instructions on how to reset your account password.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/auth/views/passwordresetconfirm.html", "<div id=\"passwordResetConfirm_view\" ng-controller=\"PasswordresetconfirmCtrl\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated != true\" ng-submit=\"confirmReset(confirmResetForm)\" name=\"confirmResetForm\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_password1\">New Password</label>\n                <input name=\"password1\" id=\"id_password1\" type=\"password\" ng-model=\"model.new_password1\" placeholder=\"New Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password1\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password2\">Repeat Password</label>\n                <input name=\"password2\" id=\"id_password2\" type=\"password\" ng-model=\"model.new_password2\" placeholder=\"Repeat Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password2\">{{error}}</div>\n            <button type=\"submit\" ng-hide=\"authenticated\" class=\"btn btn-primary\">Reset Password</button>\n        </form>\n        <p ng-if=\"authenticated\">You are already logged in!  You don\'t need to reset your password.</p>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You have changed your password.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/auth/views/register.html", "<div id=\"register_view\" ng-controller=\"RegisterCtrl\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated != true\" name=\"registerForm\" ng-submit=\"register(registerForm)\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_username\">Username</label>\n                <input name=\"username\" id=\"id_username\" class=\"form-control\" type=\"text\" ng-model=\"model.username\" placeholder=\"Username\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.username\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password\">Password</label>\n                <input name=\"password1\" id=\"id_password1\" class=\"form-control\" type=\"password\" ng-model=\"model.password1\" placeholder=\"Password\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password1\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password\">Repeat Password</label>\n                <input name=\"password\" id=\"id_password2\" class=\"form-control\" type=\"password\" ng-model=\"model.password2\" placeholder=\"Repeat Password\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password2\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_email\">Email</label>\n                <input name=\"email\" id=\"id_email\" class=\"form-control\" type=\"email\" ng-model=\"model.email\" placeholder=\"Email\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n            <button ng-hide=\"authenticated\" type=\"submit\" class=\"btn btn-primary\">Register</button>\n        </form>\n        <p ng-if=\"authenticated\">You are already logged in!  You don\'t need to register.</p>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">Great!  You\'ve just registered.  You should receive an email shortly with instructions on how to activate your account.</div>\n    </div>\n</div>");
        $templateCache.put("app-templates/auth/views/restricted.html", "<p>You have attempted to access a restricted page.  Please login to continue.</p>\n<div ng-include=\"\'app-templates/auth/views/login.html\'\"></div>\n");
        $templateCache.put("app-templates/auth/views/userprofile.html", "<div id=\"userProfile_view\" ng-controller=\"UserprofileCtrl\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated\" name=\"userProfileForm\" ng-submit=\"updateProfile(userProfileForm, model)\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_first_name\">First Name</label>\n                <input name=\"first_name\" id=\"id_first_name\" class=\"form-control\" type=\"text\" ng-model=\"model.first_name\" placeholder=\"First Name\" />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.first_name\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_last_name\">Last Name</label>\n                <input name=\"last_name\" id=\"id_last_name\" class=\"form-control\" type=\"text\" ng-model=\"model.last_name\" placeholder=\"Last Name\" />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.last_name\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_email\">Email</label>\n                <input name=\"email\" id=\"id_email\" class=\"form-control\" type=\"email\" ng-model=\"model.email\" placeholder=\"Email\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n            <button type=\"submit\" ng-show=\"authenticated\" class=\"btn btn-primary\">Update Profile</button>\n        </form>\n        <div class=\"alert alert-warning\" ng-if=\"authenticated == false\">You need to be logged in to do this.</div>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You have updated your profile.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/auth/views/verifyemail.html", "<div id=\"verifyEmail_view\" ng-controller=\"VerifyemailCtrl\">\n	<div ng-if=\"success\" class=\"alert alert-success\">You have successfully verified your email address.</div>\n	<div ng-if=\"failure\" class=\"alert alert-warning\">Sorry, there\'s been an error.</div>\n</div>\n");
    }]);
