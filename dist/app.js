/// <reference path="../../../typings/main.d.ts" />
var app = angular.module('ebagis', [
    'app.templates',
    'ui.bootstrap',
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ui.router',
]);
app.directive('header', ['$rootScope', 'UserProfile', function ($rootScope, UserProfile) {
        var linkFn = function (scope, element, attrs) {
            scope.authenticated = false;
            scope.user = UserProfile.data;
            $rootScope.$on('UserProfile.authenticated', function () {
                scope.$apply(function () {
                    scope.authenticated = true;
                    scope.user = UserProfile.data;
                    console.log("user after login: ", scope.user);
                });
            });
            $rootScope.$on('UserProfile.unauthenticated', function () {
                scope.$apply(function () {
                    scope.authenticated = false;
                    scope.user = UserProfile.data;
                    console.log("user after logout: ", scope.user);
                });
            });
        };
        return {
            restrict: 'E',
            templateUrl: 'app-templates/app/partial/header/header.html',
            link: linkFn
        };
    }]);
app.directive('headerAccount', function () {
    return {
        restrict: 'E',
        templateUrl: 'app-templates/app/partial/header/account.html'
    };
});
app.config(["$stateProvider", '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {
        // standard auth types
        var auth = {
            anon: ["Auth", function (Auth) { return Auth.isAnonymous(true); }],
            auth: ["Auth", function (Auth) { return Auth.isAuthenticated(true); }],
            admin: ["Auth", function (Auth) { return Auth.hasRole("ROLE_ADMIN"); }]
        };
        // remove the # from urls where supported
        $locationProvider.html5Mode(true);
        // set the default route -> redirect requests to unrecognized pages
        // might consider making a 404 page and redirecting to that
        $urlRouterProvider.otherwise('404');
        // setup the states (routes) on the stateProvider
        $stateProvider
            .state("forbidden", {})
            .state("404", {
            url: '/404',
            templateUrl: 'app-templates/app/partial/main/404.html'
        })
            .state("login", {
            url: '/account/login',
            templateUrl: 'app-templates/app/partial/account/login.html',
            controller: 'LoginController',
            resolve: {
                auth: auth.anon,
                userProfile: "UserProfile"
            }
        })
            .state("register", {
            url: '/account/register',
            templateUrl: 'app-templates/app/partial/account/register.html',
            controller: 'RegisterController',
            resolve: {
                auth: auth.anon,
                userProfile: "UserProfile"
            }
        })
            .state("forgot", {
            url: '/account/reset',
            templateUrl: 'app-templates/app/partial/account/passwordreset.html',
            controller: 'PasswordResetController',
            resolve: {
                auth: auth.anon,
                userProfile: "UserProfile"
            }
        })
            .state("resetConfirm", {
            url: '/account/resetConfirm/{userToken:[0-9A-Za-z_\-]+}/{passwordResetToken:[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20}}',
            //url: '/account/resetConfirm/:userToken/:passwordResetToken',
            templateUrl: 'app-templates/app/partial/account/passwordresetconfirm.html',
            controller: 'PasswordResetConfirmController',
            resolve: {
                auth: auth.anon,
                userProfile: "UserProfile"
            }
        })
            .state("verifyEmail", {
            url: '/account/verifyEmail/{emailVerificationToken:[0-9A-Za-z]{1,65}}',
            templateUrl: 'app-templates/app/partial/account/verifyemail.html',
            controller: 'VerifyEmailController',
            resolve: {
                auth: auth.anon,
                userProfile: "UserProfile"
            }
        })
            .state("logout", {
            url: '/account/logout',
            templateUrl: 'app-templates/app/partial/account/logout.html',
            controller: 'LogoutController',
            resolve: {
                auth: auth.auth,
                userProfile: "UserProfile"
            }
        })
            .state("account", {
            url: '/account/',
            templateUrl: 'app-templates/app/partial/account/account.html',
            resolve: {
                auth: auth.auth,
                userProfile: "UserProfile"
            }
        })
            .state("root", {
            url: '/',
            controller: 'RootController',
            resolve: {
                auth: auth.auth,
                userProfile: "UserProfile"
            }
        })
            .state("home", {
            url: '/map',
            templateUrl: 'app-templates/app/partial/map/map.html',
            controller: 'MapController',
            resolve: {
                auth: auth.auth,
                userProfile: "UserProfile"
            }
        })
            .state("admin", {
            /* ... */
            resolve: {
                auth: auth.admin
            }
        });
    }]);
app.factory("Auth", ["UserProfile", function (UserProfile) {
        var Auth = {
            OK: 200,
            // "we don't know who you are, so we can't say if you're authorized to access
            // this resource or not yet, please sign in first"
            UNAUTHORIZED: 401,
            // "we know who you are, and your profile does not allow you to access this resource"
            FORBIDDEN: 403,
            NOTFOUND: 404,
            hasRole: function (role) {
                return new Promise(function (resolve, reject) {
                    if (UserProfile.hasRole(role)) {
                        resolve(Auth.OK);
                    }
                    else if (UserProfile.isAnonymous()) {
                        reject(Auth.UNAUTHORIZED);
                    }
                    else {
                        reject(Auth.FORBIDDEN);
                    }
                });
            },
            hasAnyRole: function (roles) {
                return new Promise(function (resolve, reject) {
                    if (UserProfile.hasAnyRole(roles)) {
                        resolve(Auth.OK);
                    }
                    else if (UserProfile.isAnonymous()) {
                        reject(Auth.UNAUTHORIZED);
                    }
                    else {
                        reject(Auth.FORBIDDEN);
                    }
                });
            },
            isAnonymous: function (force) {
                return new Promise(function (resolve, reject) {
                    UserProfile.isAnonymous(force).then(function () {
                        resolve(Auth.OK);
                    }).catch(function (err) {
                        reject(Auth.FORBIDDEN);
                    });
                });
            },
            isAuthenticated: function (force) {
                return new Promise(function (resolve, reject) {
                    UserProfile.isAuthenticated(force).then(function () {
                        resolve(Auth.OK);
                    }).catch(function (err) {
                        reject(Auth.UNAUTHORIZED);
                    });
                });
            }
        };
        return Auth;
    }]);
var UserProfileClass = (function () {
    function UserProfileClass(api, rootScope) {
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
    UserProfileClass.prototype.initialize = function () {
        // setup our API service
        // first arg is the base URL of the server API
        // second arg is a boolean of whether to use django sessions or not
        this.api.initialize('https://test.ebagis.geog.pdx.edu/api/rest/account', false);
        // run authenticationStatus the first time to determine initial
        // value for this.authenticated
        this.authenticationStatus(true).then(function () {
            console.log("user is logged in on profile initialization");
        }).catch(function (err) {
            console.log("profile error on initialization: ", err);
        });
    };
    UserProfileClass.prototype.setAuthenticated = function (val) {
        if (this.authenticated != val) {
            this.authenticated = val;
            if (val) {
                this.$rootScope.$broadcast("UserProfile.authenticated");
            }
            else {
                this.$rootScope.$broadcast("UserProfile.unauthenticated");
            }
        }
    };
    UserProfileClass.prototype.getAuthenticated = function () {
        return this.authenticated;
    };
    UserProfileClass.prototype.refresh = function () {
        up = this;
        up.authPromise = new Promise(function (resolve, reject) {
            //return new Promise(function(resolve, reject) {
            up.api.profile().then(function (response) {
                up.data = response;
                up.setAuthenticated(true);
                resolve(response);
            }).catch(function (err) {
                up.setAuthenticated(false);
                // destroy any cached login tokens
                up.api.clearUserToken();
                reject(err);
            });
        });
        return up.authPromise;
    };
    UserProfileClass.prototype.hasRole = function (role) {
        return this.data.roles.indexOf(role) >= 0;
    };
    UserProfileClass.prototype.hasAnyRole = function (roles) {
        return !!this.data.roles.filter(function (role) {
            return roles.indexOf(role) >= 0;
        }).length;
    };
    UserProfileClass.prototype.isAnonymous = function (force) {
        up = this;
        return new Promise(function (resolve, reject) {
            up.authenticationStatus(force).then(function () {
                reject();
            }).catch(function (err) {
                resolve(err);
            });
        });
    };
    UserProfileClass.prototype.isAuthenticated = function (force) {
        up = this;
        return new Promise(function (resolve, reject) {
            up.authenticationStatus(force).then(function () {
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    UserProfileClass.prototype.authenticationStatus = function (force) {
        // Set force to true to ignore stored value and query API
        force = force || false;
        var up = this;
        return new Promise(function (resolve, reject) {
            if (up.authPromise != null && !force) {
                // we have a stored promise
                promise = up.authPromise;
            }
            else {
                // we don't have a strored promise, or we're forcing a
                // request back to the API to verify the authentication status
                promise = up.refresh();
            }
            promise.then(function () {
                resolve();
            }).catch(function (err) {
                reject("User is not logged in.", err);
            });
        });
    };
    UserProfileClass.prototype.login = function (username, password) {
        up = this;
        return up.api.login(username, password).then(function () {
            return up.authenticationStatus(true).then(function () {
                up.$rootScope.$broadcast("UserProfile.logged_in", data);
            }).catch(function (err) {
                console.log(err);
            });
        }).catch(function (err) {
            console.log(err);
        });
    };
    UserProfileClass.prototype.logout = function () {
        up = this;
        return up.api.logout().then(function () {
            up.data = null;
            up.authPromise = null;
            up.setAuthenticated(false);
            up.$rootScope.$broadcast("UserProfile.logged_out");
        }).catch(function (err) {
            console.log(err);
        });
    };
    return UserProfileClass;
}());
app.service("UserProfile", ["ebagisAPI", "$rootScope", UserProfileClass]);
app.run(["$rootScope", "Auth", "$state", "UserProfile", function ($rootScope, Auth, $state, UserProfile) {
        // if a user trys to go to a page they can't access, redirect them
        $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
            console.log("caught an auth error: request to ", toState, " with params ", toParams, " returned ", error);
            if (error == Auth.UNAUTHORIZED) {
                console.log("unauthed: go to login");
                $state.go("login");
            }
            else if (error == Auth.FORBIDDEN) {
                console.log("forbidden: go home");
                $state.go("root");
            }
            else if (error == Auth.NOTFOUND) {
                console.log("not found: go 404");
                $state.go("404");
            }
        });
    }]);
app.controller('RootController', ['$scope', '$state', function ($scope, $state) {
        $state.go("home");
    }]);
app.controller('UserProfileController', ['$scope', 'ebagisAPI', 'Validate', 'UserProfile', function ($scope, ebagisAPI, Validate, UserProfile) {
        $scope.model = { 'first_name': '', 'last_name': '', 'email': '' };
        $scope.complete = false;
        console.log(UserProfile.data);
        $scope.model = UserProfile.data;
        $scope.updateProfile = function (formData, model) {
            $scope.errors = [];
            Validate.form_validation(formData, $scope.errors);
            if (!formData.$invalid) {
                ebagisAPI.updateProfile(model)
                    .then(function (data) {
                    // success case
                    $scope.complete = true;
                }, function (data) {
                    // error case
                    $scope.error = data;
                });
            }
        };
    }]);
app.controller('AuthrequiredCtrl', function ($scope) {
    $scope.awesomeThings = [
        'HTML5 Boilerplate',
        'AngularJS',
        'Karma'
    ];
});
var ebagisAPI = (function () {
    function ebagisAPI(http, cookies, state) {
        this.$http = http;
        this.$cookies = cookies;
        this.$state = state;
        // Change this to point to your Django REST Auth API
        // e.g. /api/rest-auth  (DO NOT INCLUDE ENDING SLASH)
        this.API_URL = 'https://test.ebagis.geog.pdx.edu/api/rest/account',
            // Set use_session to true to use Django sessions to store security token.
            // Set use_session to false to store the security token locally and transmit it as a custom header.
            this.use_session = false;
    }
    ebagisAPI.prototype.request = function (args) {
        // uncomment next line for request tracing
        console.trace();
        // Let's retrieve the token from the cookie, if available
        if (this.$cookies.get('token')) {
            this.$http.defaults.headers.common.Authorization = 'Token ' + this.$cookies.get('token');
        }
        // Continue
        params = args.params || {};
        args = args || {};
        url = this.API_URL + args.url,
            method = args.method || "GET",
            params = params,
            data = args.data || {};
        api = this;
        return new Promise(function (resolve, reject) {
            // Fire the request, as configured.
            api.$http({
                url: url,
                withCredentials: api.use_session,
                method: method.toUpperCase(),
                headers: { 'X-CSRFToken': api.$cookies['csrftoken'] },
                params: params,
                data: data
            })
                .success(angular.bind(api, function (data, status, headers, config) {
                resolve(data, status);
            }))
                .error(angular.bind(api, function (data, status, headers, config) {
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
    };
    ebagisAPI.prototype.clearUserToken = function () {
        var api = this;
        api.$cookies.remove('token');
    };
    ebagisAPI.prototype.register = function (username, password1, password2, email, more) {
        var data = {
            'username': username,
            'password1': password1,
            'password2': password2,
            'email': email,
            'activation_url': this.$state.href('verifyEmail').replace(/\/+/g, "/")
        };
        data = angular.extend(data, more);
        return this.request({
            'method': "POST",
            'url': "/registration/",
            'data': data
        });
    };
    ebagisAPI.prototype.login = function (username, password) {
        var api = this;
        delete api.$http.defaults.headers.common.Authorization;
        api.$cookies.remove('token');
        return api.request({
            'method': "POST",
            'url': "/login/",
            'data': {
                'username': username,
                'password': password
            }
        }).then(function (data) {
            if (!api.use_session) {
                api.$http.defaults.headers.common.Authorization = 'Token ' + data.key;
                api.$cookies.put("token", data.key);
            }
        });
    };
    ebagisAPI.prototype.logout = function () {
        var api = this;
        return api.request({
            'method': "POST",
            'url': "/logout/"
        }).then(function (data) {
            delete api.$http.defaults.headers.common.Authorization;
            api.clearUserToken();
        });
    };
    ebagisAPI.prototype.changePassword = function (password1, password2) {
        return this.request({
            'method': "POST",
            'url': "/password/change/",
            'data': {
                'new_password1': password1,
                'new_password2': password2
            }
        });
    };
    ebagisAPI.prototype.resetPassword = function (email) {
        return this.request({
            'method': "POST",
            'url': "/password/reset/",
            'data': {
                'email': email,
                'reset_url': this.$state.href('resetConfirm').replace(/\/+/g, "/"),
                'site_name': 'ebagis'
            }
        });
    };
    ebagisAPI.prototype.profile = function () {
        return this.request({
            'method': "GET",
            'url': "/user/"
        });
    };
    ebagisAPI.prototype.updateProfile = function (data) {
        return this.request({
            'method': "PATCH",
            'url': "/user/",
            'data': data
        });
    };
    ebagisAPI.prototype.verify = function (key) {
        return this.request({
            'method': "POST",
            'url': "/registration/verify-email/",
            'data': { 'key': key }
        });
    };
    ebagisAPI.prototype.confirmReset = function (uid, token, password1, password2) {
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
    };
    ebagisAPI.prototype.initialize = function (url, sessions) {
        this.API_URL = url;
        this.use_session = sessions;
    };
    return ebagisAPI;
}());
app.service('ebagisAPI', ['$http', '$cookies', '$state', ebagisAPI]);
app.controller('LoginController', ['$scope', '$state', 'Validate', 'UserProfile', function ($scope, $state, Validate, UserProfile) {
        $scope.model = {
            'username': '',
            'password': ''
        };
        $scope.complete = false;
        $scope.login = function (formData) {
            $scope.errors = [];
            Validate.form_validation(formData, $scope.errors);
            if (!formData.$invalid) {
                UserProfile.login($scope.model.username, $scope.model.password)
                    .then(function () {
                    // successful login so redirect to the home page
                    $state.go('home');
                }).catch(function (err) {
                    // error case
                    $scope.errors = err;
                });
            }
        };
    }]);
app.controller('LogoutController', ['$scope', '$state', 'UserProfile', function ($scope, $state, UserProfile) {
        UserProfile.logout().then(function () {
            $state.go('login');
        }).catch(function (err) {
            console.log(err);
        });
    }]);
app.controller('MainController', ['$scope', '$cookies', '$location', 'ebagisAPI', 'UserProfile', function ($scope, $cookies, $location, ebagisAPI, UserProfile) {
        $scope.login = function () {
            UserProfile.login(prompt('Username'), prompt('password'))
                .then(function (data) {
                handleSuccess(data);
            }, handleError);
        };
        $scope.logout = function () {
            UserProfile.logout()
                .then(handleSuccess, handleError);
        };
        $scope.resetPassword = function () {
            ebagisAPI.resetPassword(prompt('Email'))
                .then(handleSuccess, handleError);
        };
        $scope.register = function () {
            ebagisAPI.register(prompt('Username'), prompt('Password'), prompt('Email'))
                .then(handleSuccess, handleError);
        };
        $scope.verify = function () {
            ebagisAPI.verify(prompt("Please enter verification code"))
                .then(handleSuccess, handleError);
        };
        $scope.goVerify = function () {
            $location.path("/verifyEmail/" + prompt("Please enter verification code"));
        };
        $scope.changePassword = function () {
            ebagisAPI.changePassword(prompt("Password"), prompt("Repeat Password"))
                .then(handleSuccess, handleError);
        };
        $scope.profile = function () {
            ebagisAPI.profile()
                .then(handleSuccess, handleError);
        };
        $scope.updateProfile = function () {
            ebagisAPI.updateProfile({ 'first_name': prompt("First Name"), 'last_name': prompt("Last Name"), 'email': prompt("Email") })
                .then(handleSuccess, handleError);
        };
        $scope.confirmReset = function () {
            ebagisAPI.confirmReset(prompt("Code 1"), prompt("Code 2"), prompt("Password"), prompt("Repeat Password"))
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
        $scope.$on("UserProfile.logged_in", function (data) {
            $scope.show_login = false;
        });
        $scope.$on("UserProfile.logged_out", function (data) {
            $scope.show_login = true;
        });
    }]);
var MapClass = (function () {
    function MapClass() {
        this.map = L.map('map').setView([40, -99], 4);
    }
    return MapClass;
}());
app.service("Map", [MapClass]);
app.controller('MapController', ['$scope', 'UserProfile', 'Map', function ($scope, UserProfile, Map) {
        $scope.user = UserProfile.data;
        var aoi_names;
        var geojson_layer;
        var tokenval = UserProfile.api.$cookies.get('token');
        var sortState = "ascending";
        var map = Map.map;
        // from http://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript
        function insensitive(s1, s2) {
            var s1lower = s1.toLowerCase();
            var s2lower = s2.toLowerCase();
            return s1lower > s2lower ? 1 : (s1lower < s2lower ? -1 : 0);
        }
        function addFeatureRows() {
            if (sortState === 'ascending') {
                aoi_names.sort(insensitive);
            }
            else if (sortState === 'descending') {
                (aoi_names.sort(insensitive)).reverse();
            }
            $("#feature-list tbody").empty();
            for (var i in aoi_names) {
                var toAdd = '<tr class="feature-row" value="' + aoi_names[i] + '"><td style="vertical-align: middle;"><img width="16px" height="18px" src="water.png"></td><td class="feature-name">' + aoi_names[i] + '</td><td style="vertical-align: middle;"</td></tr>';
                $("#feature-list tbody").append(toAdd);
            }
        }
        function formatJSON(obj, currKey) {
            var content = "<div id=\"bar_content\">";
            function recurse(obj, indent) {
                var content2 = '';
                if (obj) {
                    for (var key in obj) {
                        if (typeof obj[key] === "object") {
                            var value;
                            if (obj[key] === null || obj[key] === "")
                                value = "none";
                            else
                                value = '';
                            //console.log('key: ' + key + ' is of type ' + typeof key + '\n' + 'obj: ' + obj + '\n' + 'obj[key] ' + obj[key]);
                            content2 += "<div>" + String.fromCharCode(160).repeat(indent) + key + ':  ' + value + "</div>";
                            content2 += recurse(obj[key], indent += 4);
                        }
                        else if (typeof obj[key] !== "function") {
                            var value;
                            //console.log('key: ' + key + ' is of type ' + typeof key + '\n' + 'obj: ' + obj + '\n' + 'obj[key] ' + obj[key]);
                            if ((typeof obj[key] === 'Array' && obj[key].length === 0) || obj[key] === "" || obj[key] === null) {
                                value = "none";
                            }
                            else {
                                value = obj[key];
                            }
                            content2 += "<div>" + String.fromCharCode(160).repeat(indent) + key + ':  ' + value + "</div>";
                        }
                    }
                }
                return content2;
            }
            content += recurse(obj, 0);
            return content + "</div>";
        }
        // add control layer
        var controlBar = L.control.bar('bar', {
            position: 'bottom',
            visible: false
        });
        map.addControl(controlBar);
        // load a tile layer
        var baselayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Tiles by <a href="http://mapc.org">MAPC</a>'
        }).addTo(map);
        var defaultStyle = {
            "color": "#b20000",
            "weight": 0,
            "fillOpacity": .75
        };
        var highlightStyle = {
            "fillColor": "#0000b2",
            "fillOpacity": "8"
        };
        // request for the aoi names
        jQuery.ajax({
            'type': 'GET',
            'url': 'https://test.ebagis.geog.pdx.edu/api/rest/aois/?format=geojson',
            'datatype': 'json',
            'headers': { 'Authorization': 'Token ' + tokenval },
            'success': function (data) {
                aoi_names = new Array();
                geojson_layer = L.geoJson(data, {
                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(feature.properties.name);
                    },
                    style: defaultStyle
                }).addTo(map);
                //console.log(geojson_layer.getBounds());
                map.fitBounds(geojson_layer.getBounds(), { "animate": true });
                L.control.scale().addTo(map);
                // console.log(data.features); 
            }
        });
        $(document).on("click", ".feature-row", function (event) {
            var value = this.getAttribute('value');
            var aoiname = ' ';
            geojson_layer.eachLayer(function (layer) {
                //console.log('this.value ' + value);
                if (layer.feature.properties.name == value) {
                    //console.log('if: ' + layer.feature.properties.name); 
                    layer.setStyle(highlightStyle);
                    layer.bringToFront();
                    //console.log(layer.feature.properties);
                    aoiname = layer.feature.properties.url;
                    aoiname = aoiname.substring(0, aoiname.indexOf('?'));
                    //console.log(aoiname);
                    map.fitBounds(layer.getBounds(), {
                        "maxZoom": 9,
                        "animate": true
                    });
                }
                else {
                    geojson_layer.resetStyle(layer);
                    controlBar.hide();
                }
            });
            // request for the detailed view data
            jQuery.ajax({
                'type': 'GET',
                'url': aoiname,
                'datatype': 'json',
                'headers': { 'Authorization': 'Token ' + tokenval },
                'success': function (data) {
                    //console.log(data);
                    controlBar.setContent(formatJSON(data));
                    // console.log(r(data));
                    setTimeout(function () { controlBar.show(); }, 500);
                }
            });
        });
        map.on('moveend', function (event) {
            aoi_names = new Array();
            $("#feature-list tbody").empty();
            geojson_layer.eachLayer(function (layer) {
                if (map.getBounds().intersects(layer.getLatLngs())) {
                    aoi_names.push(layer.feature.properties.name);
                }
            });
            addFeatureRows();
        });
        $('#sort-btn').on('click', function (event) {
            sortState = 'descending';
            addFeatureRows();
            $('.panel-body').empty();
            $('.panel-body').append('<div class="row"><input type="text" class="form-control search" placeholder="Filter" /><button type="button" class="btn sort asc" data-sort="feature-name" id="sort-btndesc"><i class="fa fa-sort-alpha-desc" aria-hidden="true"></i> Sort</button></div>');
        });
        $(document).on('click', '#sort-btndesc', function () {
            sortState = 'ascending';
            addFeatureRows();
            $('.panel-body').empty();
            $('.panel-body').append('<div class="row"><input type="text" class="form-control search" placeholder="Filter" /><button type="button" class="btn sort" data-sort="feature-name" id="sort-btnasc"><i class="fa fa-sort-alpha-asc" aria-hidden="true"></i> Sort</button></div>');
        });
        $(document).on('click', '#sort-btnasc', function () {
            sortState = 'descending';
            addFeatureRows();
            $('.panel-body').empty();
            $('.panel-body').append('<div class="row"><input type="text" class="form-control search" placeholder="Filter" /><button type="button" class="btn sort" data-sort="feature-name" id="sort-btndesc"><i class="fa fa-sort-alpha-desc" aria-hidden="true"></i> Sort</button></div>');
        });
    }]);
app.controller('PasswordChangeController', function ($scope, ebagisAPI, Validate) {
    $scope.model = { 'new_password1': '', 'new_password2': '' };
    $scope.complete = false;
    $scope.changePassword = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            ebagisAPI.changePassword($scope.model.new_password1, $scope.model.new_password2)
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
app.controller('PasswordResetController', function ($scope, $state, $timeout, ebagisAPI, Validate) {
    $scope.processForm = function (email) {
        //$scope.errors = [];
        //Validate.form_validation(email, $scope.errors);
        //if (!$scope.email.$invalid) {
        console.log($scope.email);
        ebagisAPI.resetPassword($scope.email)
            .then(function (data) {
            // success case
            console.log(data);
            $scope.$apply(function () {
                $scope.message = data.success;
            });
            $timeout(function () { $state.go("login"); }, 3000);
        }, function (data) {
            // error case
            console.log(data);
            $scope.$apply(function () {
                $scope.errors = data;
            });
        });
        //}
    };
});
/*
app.controller('PasswordResetController', function ($scope, $state, $timeout, ebagisAPI, Validate) {
    $scope.model = {'email': ''};
    $scope.complete = false;
    $scope.resetPassword = function(formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            ebagisAPI.resetPassword($scope.model.email)
            .then(function(data) {
                // success case
                $scope.$apply(function() {
                    $scope.complete = true;
                });
                $timeout(function(){$state.go("login");}, 3000);
            },function(data){
                // error case
                $scope.$apply(function() {
                    $scope.errors = data;
                });
            });
        }
    }
});
*/
app.controller('PasswordResetConfirmController', function ($scope, $stateParams, $state, $timeout, ebagisAPI, Validate) {
    $scope.model = { 'new_password1': '', 'new_password2': '' };
    $scope.complete = false;
    $scope.confirmReset = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            ebagisAPI.confirmReset($stateParams['userToken'], $stateParams['passwordResetToken'], $scope.model.new_password1, $scope.model.new_password2)
                .then(function (data) {
                // success case
                $scope.$apply(function () {
                    $scope.complete = true;
                });
                $timeout(function () { $state.go("login"); }, 3000);
            }, function (data) {
                // error case
                $scope.$apply(function () {
                    $scope.errors = data;
                });
            });
        }
    };
});
app.controller('RestrictedController', function ($scope, $location) {
    $scope.$on('UserProfile.logged_in', function () {
        $location.path('/');
    });
});
app.controller('RegisterController', function ($scope, ebagisAPI, Validate) {
    $scope.model = { 'username': '', 'password': '', 'email': '' };
    $scope.complete = false;
    $scope.register = function (formData) {
        $scope.errors = [];
        Validate.form_validation(formData, $scope.errors);
        if (!formData.$invalid) {
            ebagisAPI.register($scope.model.username, $scope.model.password1, $scope.model.password2, $scope.model.email)
                .then(function (data) {
                // success case
                $scope.$apply(function () {
                    $scope.complete = true;
                });
            }, function (data) {
                // error case
                $scope.$apply(function () {
                    $scope.errors = data;
                });
            });
        }
    };
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
app.controller('VerifyEmailController', function ($scope, $stateParams, ebagisAPI) {
    ebagisAPI.verify($stateParams["emailVerificationToken"]).then(function (data) {
        $scope.success = true;
    }, function (data) {
        $scope.failure = false;
    });
});
angular.module("app.templates", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("app-templates/app/authrequired.html", "<p>This is a restricted view.  You must be authenticated to view it.</p>\n");
        $templateCache.put("app-templates/app/restricted.html", "<p>You have attempted to access a restricted page.  Please login to continue.</p>\n<div ng-include=\"\'app-templates/app/login.html\'\"></div>\n");
        $templateCache.put("app-templates/app/partial/account/account.html", "<div id=\"userProfile_view\" ng-controller=\"UserProfileController\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated\" name=\"userProfileForm\" ng-submit=\"updateProfile(userProfileForm, model)\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_first_name\">First Name</label>\n                <input name=\"first_name\" id=\"id_first_name\" class=\"form-control\" type=\"text\" ng-model=\"model.first_name\" placeholder=\"First Name\" />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.first_name\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_last_name\">Last Name</label>\n                <input name=\"last_name\" id=\"id_last_name\" class=\"form-control\" type=\"text\" ng-model=\"model.last_name\" placeholder=\"Last Name\" />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.last_name\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_email\">Email</label>\n                <input name=\"email\" id=\"id_email\" class=\"form-control\" type=\"email\" ng-model=\"model.email\" placeholder=\"Email\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n            <button type=\"submit\" ng-show=\"authenticated\" class=\"btn btn-primary\">Update Profile</button>\n        </form>\n        <div class=\"alert alert-warning\" ng-if=\"authenticated == false\">You need to be logged in to do this.</div>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You have updated your profile.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/app/partial/account/login.html", "<div id=\"login_view\" ng-controller=\"LoginController\">\n    <div class=\"header\">\n        <h3 class=\"text-muted\">Please login using your eBAGIS user credentials</h3>\n    </div>\n    <form role=\"form\" ng-submit=\"login(loginForm)\" name=\"loginForm\" novalidate>\n        <div class=\"form-group\">\n            <label for=\"id_username\">Username</label>\n            <input name=\"username\" id=\"id_username\" type=\"text\" ng-model=\"model.username\" placeholder=\"Username\" class=\"form-control\" required />\n        </div>\n        <div class=\"alert alert-danger\" ng-repeat=\"error in errors.username\">{{error}}</div>\n        <div class=\"form-group\">\n            <label for=\"id_password\">Password</label>\n            <input name=\"password\" id=\"id_password\" type=\"password\" ng-model=\"model.password\" placeholder=\"Password\" class=\"form-control\" required />\n        </div>\n        <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password\">{{error}}</div>\n        <div class=\"alert alert-danger\" ng-repeat=\"error in errors.non_field_errors\">{{error}}</div>\n        <div class=\"alert alert-danger\" ng-if=\"error\">{{error}}</div>\n        <button type=\"submit\" class=\"btn btn-primary\">Login</button>\n        <a ui-sref=\"forgot\">Trouble logging in?</a>\n    </form>\n</div>\n");
        $templateCache.put("app-templates/app/partial/account/logout.html", "<div id=\"logout_view\" ng-controller=\"LogoutController\">\n	<div class=\"alert alert-info\">You have logged out.</div>\n</div>\n");
        $templateCache.put("app-templates/app/partial/account/passwordchange.html", "<div id=\"passwordChange_view\" ng-controller=\"PasswordChangeController\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-submit=\"changePassword(changePasswordForm)\" name=\"changePasswordForm\" ng-if=\"authenticated\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_password1\">New Password</label>\n                <input name=\"new_password1\" id=\"id_password1\" type=\"password\" ng-model=\"model.new_password1\" placeholder=\"New Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.new_password1\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password2\">Repeat Password</label>\n                <input name=\"new_password2\" id=\"id_password2\" type=\"password\" ng-model=\"model.new_password2\" placeholder=\"Repeat Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.new_password2\">{{error}}</div>\n            <button ng-show=\"authenticated\" type=\"submit\" class=\"btn btn-primary\">Change Password</button>\n        </form>\n        <div class=\"alert alert-warning\" ng-if=\"authenticated != true\">You need to be logged in to do this!</div>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You have changed your password.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/app/partial/account/passwordreset.html", "<div id=\"passwordReset_view\" ng-controller=\"PasswordResetController\">\n    <div class=header>\n        <h3 class=\"text-muted\">Reset your password</h3>\n    </div>\n\n    <!-- SHOW ERROR/SUCCESS MESSAGES --> \n    <div class=\"alert alert-success\" ng-show=\"message\">You should receive an email shortly with instructions on how to reset your account password.</div>\n\n    <!-- FORM --> \n    <form name=\"resetPassword\" ng-hide=\"message\" ng-submit=\"processForm(resetPassword.$valid)\"> \n      <!-- NAME --> \n      <div id=\"email-group\" class=\"form-group\" ng-class=\"{ \'has-error\' : errorEmail }\"> \n        <label>Email</label> \n        <input type=\"text\" name=\"email\" ng-model=\"email\" class=\"form-control\" placeholder=\"Email\"> \n        <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n      </div>\n\n      <!-- SUBMIT BUTTON -->\n      <button type=\"submit\" class=\"btn btn-success btn-lg btn-block\">\n          <span class=\"glyphicon glyphicon-flash\"></span> Reset Your Password\n      </button>\n    </form>\n\n    <!--\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated != true\" name=\"passwordResetForm\" ng-submit=\"resetPassword(passwordResetForm)\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_email\">Email</label>\n                <input name=\"email\" id=\"id_email\" type=\"text\" ng-model=\"model.email\" placeholder=\"Email\" class=\"form-control\" required></input>\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n            <button ng-hide=\"authenticated\" type=\"submit\" class=\"btn btn-primary\">Reset Password</button>\n        </form>\n        <p ng-if=\"authenticated\">You are already logged in!  You don\'t need to reset your password.</p>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You should receive an email shortly with instructions on how to reset your account password.</div>\n    </div>\n</div>\n-->\n");
        $templateCache.put("app-templates/app/partial/account/passwordresetconfirm.html", "<div id=\"passwordResetConfirm_view\" ng-controller=\"PasswordResetConfirmController\">\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated != true\" ng-submit=\"confirmReset(confirmResetForm)\" name=\"confirmResetForm\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_password1\">New Password</label>\n                <input name=\"password1\" id=\"id_password1\" type=\"password\" ng-model=\"model.new_password1\" placeholder=\"New Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password1\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password2\">Repeat Password</label>\n                <input name=\"password2\" id=\"id_password2\" type=\"password\" ng-model=\"model.new_password2\" placeholder=\"Repeat Password\" class=\"form-control\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password2\">{{error}}</div>\n            <button type=\"submit\" ng-hide=\"authenticated\" class=\"btn btn-primary\">Reset Password</button>\n        </form>\n        <p ng-if=\"authenticated\">You are already logged in!  You don\'t need to reset your password.</p>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">You have changed your password.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/app/partial/account/register.html", "<div id=\"register_view\" ng-controller=\"RegisterController\">\n    <div class=header>\n        <h3 class=\"text-muted\">Create an eBAGIS user account</h3>\n    </div>\n\n    <div ng-if=\"complete == false\">\n        <form role=\"form\" ng-if=\"authenticated != true\" name=\"registerForm\" ng-submit=\"register(registerForm)\" novalidate>\n            <div class=\"form-group\">\n                <label for=\"id_username\">Username</label>\n                <input name=\"username\" id=\"id_username\" class=\"form-control\" type=\"text\" ng-model=\"model.username\" placeholder=\"Username\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.username\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password\">Password</label>\n                <input name=\"password1\" id=\"id_password1\" class=\"form-control\" type=\"password\" ng-model=\"model.password1\" placeholder=\"Password\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password1\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_password\">Repeat Password</label>\n                <input name=\"password\" id=\"id_password2\" class=\"form-control\" type=\"password\" ng-model=\"model.password2\" placeholder=\"Repeat Password\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.password2\">{{error}}</div>\n            <div class=\"form-group\">\n                <label for=\"id_email\">Email</label>\n                <input name=\"email\" id=\"id_email\" class=\"form-control\" type=\"email\" ng-model=\"model.email\" placeholder=\"Email\" required />\n            </div>\n            <div class=\"alert alert-danger\" ng-repeat=\"error in errors.email\">{{error}}</div>\n            <button ng-hide=\"authenticated\" type=\"submit\" class=\"btn btn-primary\">Register</button>\n        </form>\n        <p ng-if=\"authenticated\">You are already logged in!  You don\'t need to register.</p>\n    </div>\n    <div ng-if=\"complete == true\">\n        <div class=\"alert alert-success\">Great!  You\'ve just registered.  You should receive an email shortly with instructions on how to activate your account.</div>\n    </div>\n</div>\n");
        $templateCache.put("app-templates/app/partial/account/verifyemail.html", "<div id=\"verifyEmail_view\" ng-controller=\"VerifyEmailController\">\n	<div ng-if=\"success\" class=\"alert alert-success\">You have successfully verified your email address.</div>\n	<div ng-if=\"failure\" class=\"alert alert-warning\">Sorry, there\'s been an error.</div>\n</div>\n");
        $templateCache.put("app-templates/app/partial/header/account.html", "<li><a ng-hide=\"authenticated\" ng-href=\"#/register\">Register</a></li>\n<li><a ng-hide=\"authenticated\" href=\"#/login\">Login</a></li>\n<li class=\"dropdown\" dropdown=\"\" ng-show=\"authenticated\"\n    <a href=\"#\" class=\"dropdown-toggle\" dropdown-toggle=\"\" data-toggle=\"dropdown\">Dropdown               <b class=\"caret\"></b></a>\n    <ul class=\"dropdown-menu\" role=\"menu\">\n        <li role=\"menuitem\"><a href=\"#/account\">User Account</a></li>\n        <li class=\"divider\"></li>\n        <li role=\"menuitem\"><a href=\"#/logout\">Sign Out</a></li>\n    </ul>\n</li>\n\n\n<!-- Single button with keyboard nav\n<li><a ng-hide=\"authenticated\" ng-href=\"#/register\">Register</a></li>\n<li><a ng-hide=\"authenticated\" href=\"#/login\">Login</a></li>\n<li>\n    <div class=\"btn-group\" uib-dropdown keyboard-nav ng-show=\"authenticated\">\n        <button id=\"simple-btn-keyboard-nav\" type=\"button\" class=\"btn btn-primary\" uib-dropdown-toggle>\n            Dropdown with keyboard navigation <span class=\"caret\"></span>\n        </button>\n        <ul class=\"dropdown-menu\" uib-dropdown-menu role=\"menu\" aria-labelledby=\"simple-btn-keyboard-nav\">\n            <li role=\"menuitem\"><a href=\"#/account\">User Account</a></li>\n            <li class=\"divider\"></li>\n            <li role=\"menuitem\"><a href=\"#/logout\">Sign Out</a></li>\n        </ul>\n    </div>\n</li>\n<p>\n    <a ng-hide=\"authenticated\" href=\"#/login\" class=\"btn btn-primary\">Login</a>\n    <a ng-hide=\"authenticated\" href=\"#/passwordReset\" class=\"btn btn-primary\">Send Password Reset</a>\n    <a ng-hide=\"authenticated\" ng-click=\"goConfirmReset()\" class=\"btn btn-primary\">Confirm Password Reset</a>\n</p>\n<p>\n    <a ng-show=\"authenticated\" href=\"#/logout\" class=\"btn btn-primary\">Logout</a>\n    <a ng-hide=\"authenticated\" ng-href=\"#/register\" class=\"btn btn-primary\">Register</a>\n    <a ng-click=\"goVerify()\" class=\"btn btn-primary\">Verify Email</a>\n    <a ng-show=\"authenticated\" href=\"#/passwordChange\" class=\"btn btn-primary\">Change Password</a>\n    <a ng-show=\"authenticated\" href=\"#/userProfile\" class=\"btn btn-primary\">Profile</a>\n    <a href=\"#/authRequired\" class=\"btn btn-primary\">Restricted Page</a>\n</p>\n-->\n");
        $templateCache.put("app-templates/app/partial/header/header.html", "<nav class=\"navbar navbar-inverse navbar-fixed-top\" role=\"navigation\">\n  <!-- Brand and toggle get grouped for better mobile display -->\n  <div class=\"navbar-header\">\n    <button type=\"button\" class=\"navbar-toggle\" ng-init=\"navCollapsed = true\" ng-click=\"navCollapsed = !navCollapsed\">\n      <span class=\"sr-only\">Toggle navigation</span>\n      <span class=\"icon-bar\"></span>\n      <span class=\"icon-bar\"></span>\n      <span class=\"icon-bar\"></span>\n    </button>\n    <a class=\"navbar-brand\" ui-sref=\"home\">NRCS NWCC eBAGIS</a>\n  </div>\n  <!-- Collect the nav links, forms, and other content for toggling -->\n  <div class=\"collapse navbar-collapse\" collapse=\"navCollapsed\">\n    <ul class=\"nav navbar-nav navbar-right\">\n        <li><a ng-hide=\"authenticated\" ui-sref=\"register\">Register</a></li>\n        <li><a ng-hide=\"authenticated\" ui-sref=\"login\">Login</a></li>\n        <li>\n            <a ng-show=\"authenticated\" class=\"dropdown-toggle\" data-toggle=\"dropdown\" role=\"button\" aria-haspopup=\"true\" aria-expanded=\"false\">\n                Hello {{user.first_name}}<span class=\"caret\"></span>\n            </a>\n            <ul class=\"dropdown-menu\">\n           <!-- <div class=\"btn-group\" uib-dropdown keyboard-nav ng-show=\"authenticated\">\n                Dropdown with keyboard navigation <span class=\"caret\"></span>\n                <ul class=\"dropdown-menu\" uib-dropdown-menu role=\"menu\" aria-labelledby=\"simple-btn-keyboard-nav\">-->\n                    <li role=\"menuitem\"><a ui-sref=\"account\">Your Account</a></li>\n                    <li class=\"divider\"></li>\n                    <li role=\"menuitem\"><a ui-sref=\"logout\">Sign Out</a></li>\n                </ul>\n            </div>\n        </li>\n    </ul>\n  </div>\n  <!-- /.navbar-collapse -->\n</nav>\n\n\n<!--\n<nav class=\"navbar navbar-inverse navbar-fixed-top\">\n    <div class=\"navbar-header\">\n      <a class=\"navbar-brand\" href=\"#\">NRCS NWCC eBAIGS</a>\n    </div>\n    <ul class=\"nav navbar-nav navbar-right\">\n      <header-account></header-account>\n    </ul>\n</nav>\n\n<p>\n    <a ng-hide=\"authenticated\" href=\"#/login\" class=\"btn btn-primary\">Login</a>\n    <a ng-hide=\"authenticated\" href=\"#/passwordReset\" class=\"btn btn-primary\">Send Password Reset</a>\n    <a ng-hide=\"authenticated\" ng-click=\"goConfirmReset()\" class=\"btn btn-primary\">Confirm Password Reset</a>\n</p>\n<p>\n    <a ng-show=\"authenticated\" href=\"#/logout\" class=\"btn btn-primary\">Logout</a>\n    <a ng-hide=\"authenticated\" ng-href=\"#/register\" class=\"btn btn-primary\">Register</a>\n    <a ng-click=\"goVerify()\" class=\"btn btn-primary\">Verify Email</a>\n    <a ng-show=\"authenticated\" href=\"#/passwordChange\" class=\"btn btn-primary\">Change Password</a>\n    <a ng-show=\"authenticated\" href=\"#/userProfile\" class=\"btn btn-primary\">Profile</a>\n    <a href=\"#/authRequired\" class=\"btn btn-primary\">Restricted Page</a>\n</p>\n-->\n");
        $templateCache.put("app-templates/app/partial/main/404.html", "<p>\n    The resource you are attempting to access could not be found. If you feel you reached this page in error, please contact the site administrator.\n</p>\n");
        $templateCache.put("app-templates/app/partial/main/home.html", "<!--\n<p>\n    <a ng-hide=\"authenticated\" href=\"#/login\" class=\"btn btn-primary\">Login</a>\n    <a ng-hide=\"authenticated\" href=\"#/passwordReset\" class=\"btn btn-primary\">Send Password Reset</a>\n    <a ng-hide=\"authenticated\" ng-click=\"goConfirmReset()\" class=\"btn btn-primary\">Confirm Password Reset</a>\n</p>\n<p>\n    <a ng-show=\"authenticated\" href=\"#/logout\" class=\"btn btn-primary\">Logout</a>\n    <a ng-hide=\"authenticated\" ng-href=\"#/register\" class=\"btn btn-primary\">Register</a>\n    <a ng-click=\"goVerify()\" class=\"btn btn-primary\">Verify Email</a>\n    <a ng-show=\"authenticated\" href=\"#/passwordChange\" class=\"btn btn-primary\">Change Password</a>\n    <a ng-show=\"authenticated\" href=\"#/userProfile\" class=\"btn btn-primary\">Profile</a>\n    <a href=\"#/authRequired\" class=\"btn btn-primary\">Restricted Page</a>\n</p>\n-->\n");
        $templateCache.put("app-templates/app/partial/map/map.html", "<div id=\"map_view\" ng-controller=\"MapController\">\n    <link rel=\"stylesheet\" property=\"stylesheet\" href=\"css/map.css\">\n    <div class=\"uk-grid uk-margin-remove uk-grid-collapse\" id=\"main\">\n        <!--SIDEBAR-->\n        <div class =\"overlay uk-width-1-5\">\n            <div id=\"sidebar\">\n                <div class=\"sidebar-wrapper\">\n                    <div class=\"panel panel-default\" id=\"features\">\n                        <div class=\"panel-heading\">\n                            <h3 class=\"panel-title\">Areas of Interest</h3>\n                        </div>\n                        <div class=\"panel-body\" id=\'#panel-body\'>\n                            <div class=\"row\">\n                                <input type=\"text\" class=\"form-control search\" placeholder=\"Filter\" />\n                                <button type=\"button\" class=\"btn sort\" data-sort=\"feature-name\" id=\"sort-btn\"><i class=\"fa fa-sort-alpha-desc\" aria-hidden=\"true\"></i> Sort</button>\n                            </div>\n                        </div>\n                        <div class=\"sidebar-table\">\n                            <table class=\"table table-hover\" id=\"feature-list\">\n                                <thead class=\"hidden\">\n                                    <tr>\n                                        <th>Icon</th>\n                                    <tr>\n                                    <tr>\n                                        <th>Name</th>\n                                    <tr>\n                                </thead>\n                                <tbody class=\"list\"></tbody>\n                            </table>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        </div>\n        <!-- END OF SIDEBAR-->\n\n        <!--MAP AND bottom bar-->\n        <div class=\"uk-width-4-5\">\n            <div id=\"map\"></div>\n            <div id=\"bar\"></div>\n\n        </div>\n    </div>\n</div>\n");
    }]);
