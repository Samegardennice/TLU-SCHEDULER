/**
 * Created by bizic on 30/8/2016.
 */
(function () {
    'use strict';

    angular.module('Education.Student').service('ProfileService', ProfileService);

    ProfileService.$inject = [
        '$http',
        '$q',
        'settings',
        'Utilities'
    ];

    function ProfileService($http, $q, settings, utils) {
        var self = this;
        var baseUrl = settings.api.baseUrl + settings.api.apiPrefix;


        self.getCurrentUser = getCurrentUser;
        self.getSchoolYears = getSchoolYears;
        self.getSemesters = getSemesters;
        self.getCurrentSemesterInfo = getCurrentSemesterInfo;
        self.getEnrolledCourseSubjects = getEnrolledCourseSubjects;
        self.findStudents = findStudents;
        self.getListCourseHour = getListCourseHour;

        function getCurrentUser() {
            var url = baseUrl + 'users/getCurrentUser';
            return utils.resolve(url, 'GET', angular.noop, angular.noop);
        }

        function getSchoolYears() {
            var url = baseUrl + 'schoolyear/1/100';
            return utils.resolve(url, 'GET', angular.noop, angular.noop);
        }

        function getSemesters() {
            var url = baseUrl + 'semester/1/100';
            return utils.resolve(url, 'GET', angular.noop, angular.noop);
        }

        function getCurrentSemesterInfo() {
            var url = baseUrl + 'semester/semester_info';
            return utils.resolve(url, 'GET', angular.noop, angular.noop);
        }


        function getEnrolledCourseSubjects(semester) {
            if (semester && semester.id > 0) {
               /* if (student == null || !student.id) {
                    student = {id: 0};
                }*/

                //var url = baseUrl + 'StudentCourseSubject/student/';
                //url += student.id + '/';
                //url += semester.id;
				var url = baseUrl + 'StudentCourseSubject/studentLoginUser/'+semester.id;
               

                return utils.resolve(url, 'GET', angular.noop, angular.noop);
            } else {
                return $q.when(null);
            }
        }
        function findStudents() {
			var url = baseUrl + 'student/getstudentbylogin' ;
            return utils.resolve(url, 'GET', angular.noop, angular.noop);
            /*if (!angular.isDefined(code) || code == null || code.trim() == '') {
                return $q.when(null);
            }

            var url = baseUrl + 'student/studentCode/' + code + '/1/100';
            return utils.resolve(url, 'GET', angular.noop, angular.noop);*/
        }
        function getListCourseHour(pageIndex, pageSize) {
            var url = baseUrl + 'coursehour/' + pageIndex + '/' + pageSize;
            return utils.resolve(url, 'GET', angular.noop, angular.noop);
        }
    }

})();