(function () {
    'use strict';

    Education.Student = angular.module('Education.Student', [
        'ui.router',
        'oc.lazyLoad',
        'bsTable',
        'toastr',
        'ui.select',

        'Education.Common'
    ]);

    Education.Student.config(['$stateProvider', function ($stateProvider) {

        $stateProvider

            // Enrollment
            .state('application.enrollment', {
                url: '/student/enrollment',
                templateUrl: 'student/views/enrollment.html?v='+Education.version,
                data: {
                    icon: 'fa fa-university',
                    pageTitle: 'Quản lý đào tạo',
                    link:'#/dashboard/edu',
                    pageSubTitle: 'Đăng ký học sinh viên'
                },
                controller: 'EnrollmentController as vm',
                resolve: {
                    deps: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            name: 'Education.Student',
                            insertBefore: '#ng_load_plugins_before',
                            files: [
                                'student/controllers/EnrollmentController.js?v='+Education.version,
                                'student/business/EnrollmentService.js?v='+Education.version
                            ]
                        });
                    }]
                }
            })
            .state('application.enrollment_new', {
                url: '/student/enrollment_new',
                templateUrl: 'student/views/enrollment_new.html?v='+Education.version,
                data: {
                    icon: 'fa fa-university',
                    pageTitle: 'Quản lý đào tạo',
                    pageSubTitle: 'Đăng ký học sinh viên',
                    link:'#/dashboard/edu'
                },
                controller: 'EnrollmentNewController as vm',
                resolve: {
                    deps: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            name: 'Education.Student',
                            insertBefore: '#ng_load_plugins_before',
                            files: [
                                'student/controllers/EnrollmentNewController.js?v='+Education.version,
                                'student/business/EnrollmentNewService.js?v='+Education.version
                            ]
                        });
                    }]
                }
            })
            .state('application.marks_lookup', {
                url: '/student/mark_lookup',
                templateUrl: 'student/views/mark_lookup.html?v='+Education.version,
                data: {
                    icon: 'fa fa-university',
                    pageTitle: 'Quản lý đào tạo',
                    link:'#/dashboard/edu',
                    pageSubTitle: 'Tra cứu điểm'
                },
                controller: 'MarkLookupController as vm',
                resolve: {
                    deps: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            name: 'Education.Student',
                            insertBefore: '#ng_load_plugins_before',
                            files: [
                                'student/controllers/MarkLookupController.js?v='+Education.version,
                                'student/business/MarkLookupService.js?v='+Education.version
                            ]
                        });
                    }]
                }
            })

            .state('application.profile', {
                url: '/student/profile',
                templateUrl: 'student/views/profile.html?v='+Education.version,
                data: {
                    icon: 'fa fa-university',
                    pageTitle: 'Quản lý đào tạo',
                    link:'#/dashboard/edu',
                    pageSubTitle: 'Kết quả đăng ký học'
                },
                controller: 'ProfileController as vm',
                resolve: {
                    deps: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            name: 'Education.Student',
                            insertBefore: '#ng_load_plugins_before',
                            files: [
                                'student/controllers/ProfileController.js?v='+Education.version,
                                'student/business/ProfileService.js?v='+Education.version
                            ]
                        });
                    }]
                }
            })
            .state('application.student_profile', {
                url: '/student/student_profile',
                templateUrl: 'student/views/student_profile.html?v='+Education.version,
                data: {
                    icon: 'fa fa-university',
                    pageTitle: 'Quản lý đào tạo',
                    link:'#/dashboard/edu',
                    pageSubTitle: 'Hồ sơ học viên, sinh viên'                    
                },
                controller: 'StudentProfileController as vm',
                resolve: {
                    deps: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            name: 'Education.Student',
                            insertBefore: '#ng_load_plugins_before',
                            files: [
                                'student/controllers/StudentProfileController.js?v='+Education.version,
                                'student/business/StudentProfileService.js?v='+Education.version
                            ]
                        });
                    }]
                }
            })
            .state('application.student_semester_behavior_mark_menu_bar', {
                url: '/student_semester_behavior_mark_menu_bar',
                templateUrl: 'student/views/student_profile/student_semester_behavior_mark_menu_bar.html?v='+Education.version,
                data: {
                    icon: 'fa fa-university',
                    pageTitle: 'Quản lý đào tạo',
                    link:'#/dashboard/edu',
                    pageSubTitle: 'Hồ sơ học viên, sinh viên'                    
                },
                controller: 'StudentSemesterBehaviorController as vm',
                resolve: {
                    deps: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            name: 'Education.Student',
                            insertBefore: '#ng_load_plugins_before',
                            files: [
                                'student/controllers/StudentSemesterBehaviorController.js?v='+Education.version,
                                'student/business/StudentProfileService.js?v='+Education.version
                            ]
                        });
                    }]
                }
            });
            

    }]);

})();