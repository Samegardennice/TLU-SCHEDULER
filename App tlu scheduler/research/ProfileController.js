/**
 * Created by bizic on 28/8/2016.
 */
(function () {
    'use strict';

    angular.module('Education.Student').controller('ProfileController', ProfileController);

    ProfileController.$inject = [
        '$rootScope',
        '$scope',
        '$http',
        '$timeout',
        'settings',
        'toastr',
        'blockUI',
        '$uibModal',
        'ProfileService',
        '$sce',
		'EduConstant'
    ];
    
    function ProfileController ($rootScope, $scope, $http, $timeout,settings, toastr, blockUI, modal, service,$sce,EduConstant) {
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            App.initAjax();
        });

        // set sidebar closed and body solid layout mode
        $rootScope.settings.layout.pageContentWhite = true;
        $rootScope.settings.layout.pageBodySolid = false;
        $rootScope.settings.layout.pageSidebarClosed = false;

        var vm = this;
        vm.currentSchoolYear = {};
        vm.schoolYear = {};
        vm.currentSemester = null;
        vm.isStudentLoggedIn = false;

        vm.currentStudent = {};
        vm.studentCode = null;
        vm.students = [];

        vm.semesters = [];
        vm.enrolledCourseSubjects = [];
        vm.numberOfCredit=0;
        vm.tuitionFeePerCredit=0;
        vm.tuitionFeePerCreditTotal=0;
		vm.courseSubjectStatus= EduConstant.courseSubjectStatus;

        // Get course subjects registered by student
        vm.weeks = [];
        vm.week = null;
        vm.schedules= [];
        vm.getEnrolledCourseSubjects = function () {
            vm.numberOfCredit=0;
            vm.tuitionFeePerCredit=0;
            vm.tuitionFeePerCreditTotal=0;
            blockUI.start();
            service.getEnrolledCourseSubjects(vm.currentSemester).then(function (data) {
                blockUI.stop();

                if (data) {
                    vm.enrolledCourseSubjects = data;
                    getSchedule(vm.enrolledCourseSubjects);
                    if(vm.enrolledCourseSubjects!=null && vm.enrolledCourseSubjects.length>0){
                        for(var i=0;i<vm.enrolledCourseSubjects.length;i++){
                            if(vm.enrolledCourseSubjects[i]!=null && vm.enrolledCourseSubjects[i].courseSubject!=null 
                            		&& vm.enrolledCourseSubjects[i].courseSubject.semesterSubject!=null
                                && vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.subject!=null 
                                && vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.semester!=null
                                && vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.subject.numberOfCredit
                                && vm.enrolledCourseSubjects[i].isParent==true){
                            	//Chỉ tính số tín chỉ của lớp cha                                
                            	vm.numberOfCredit=vm.numberOfCredit+vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.subject.numberOfCredit;
                            	if(vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.semester.tuitionFeePerCredit){
                            		vm.tuitionFeePerCredit=vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.semester.tuitionFeePerCredit;
                            	}                                
                            }
                            /*if(vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.isFeeBySubject==true){
                            	vm.tuitionFeePerCreditTotal+=vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.tuitionFee*vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.subject.numberOfCredit;
                            }
                            else{
                            	vm.tuitionFeePerCreditTotal+=vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.semester.tuitionFeePerCredit*vm.enrolledCourseSubjects[i].courseSubject.semesterSubject.subject.numberOfCredit;
                            }*/
                            //Chỉ tính học phí cho lớp cha
                            if(vm.enrolledCourseSubjects[i].tuitionFee!=null && vm.enrolledCourseSubjects[i].courseSubject.parent==null){
								vm.tuitionFeePerCreditTotal += vm.enrolledCourseSubjects[i].tuitionFee;
							}
                        }
//                        vm.tuitionFeePerCreditTotal=vm.numberOfCredit*vm.tuitionFeePerCredit;
                    }
                }
            });
        };

        blockUI.start();
        service.getCurrentUser().then(function (data) {
            var roles = data.roles;
            // angular.forEach(roles, function(role) {
            //     if (role.authority && role.authority.toLowerCase() == 'role_student') {
            //         vm.isStudentLoggedIn = true;
            //     }
            // });
            if(roles!=null && roles.length>0){
                for(var i=0; i<roles.length;i++){
                    if (roles[i]!=null &&  roles[0].authority && roles[0].authority.toLowerCase() == 'role_student') {
                        vm.isStudentLoggedIn = true;
                    }
                }
            }


            blockUI.stop();
        });

        // Current semester
        blockUI.start();
        service.getCurrentSemesterInfo().then(function (data) {
            //console.log(data);

            vm.currentSemester = data;
            getWeeks(vm.currentSemester.schoolYear.startDate,vm.currentSemester.schoolYear.endDate);
            vm.currentSchoolYear = vm.currentSemester.schoolYear;
            vm.schoolYear = vm.currentSchoolYear;
            blockUI.stop();

            // At page load, load default...
             vm.getEnrolledCourseSubjects();
            // vm.getEligibleCourseSubjects();
        });

        // List of semesters
        blockUI.start();
        service.getSchoolYears().then(function(data) {
            if (!data) {
                blockUI.stop();
            } else {
                // get semesters in these schoolyears
                service.getSemesters().then(function(data) {
                    vm.semesters = data.content;
                    blockUI.stop();
                });
            }
        });

        // When user select a semester
        vm.onSemesterSelected = function (semester) {
            vm.numberOfCredit=0;
            vm.tuitionFeePerCredit=0;
            vm.tuitionFeePerCreditTotal=0;
            if (semester) {
                vm.currentSemester = semester;
                getWeeks(vm.currentSemester.schoolYear.startDate,vm.currentSemester.schoolYear.endDate);
            }

            vm.getEnrolledCourseSubjects();
        };
        //click refresh button
        vm.refreshEnrolledCourseSubjects = function () {
            vm.getEnrolledCourseSubjects();
        };
        // Search students by code
        vm.searchStudents = function () {
            if (!angular.isDefined(vm.studentCode) || vm.studentCode == null || vm.studentCode.trim() == '') {
                toastr.error('Bạn cần nhập mã sinh viên cần tìm.', 'Lỗi');
                return;
            }

            blockUI.start();
            service.findStudents().then(function (data) {

                blockUI.stop();
				vm.currentStudent =data;
				if(vm.currentStudent==null ||(vm.currentStudent!=null && vm.currentStudent.id==null)){
					vm.students = [];
                    vm.currentStudent = {};
				}
                /*if (data && data.content && data.content.length > 0) {
                    vm.students = data.content;
                    vm.currentStudent = vm.students[0];
                } else {
                    vm.students = [];
                    vm.currentStudent = {};
                }*/


                vm.getEnrolledCourseSubjects();
            });
        };
        // Click on a student
        vm.selectStudent = function (student) {

            if (!student) {
                return;
            }

            vm.currentStudent = student;

            vm.getEnrolledCourseSubjects();
        };


        vm.courseHours = [];
        vm.tables = [];
        vm.schedules= [];
        function getSchedule(enrolledCourseSubjects){
            //console.log(enrolledCourseSubjects);
            vm.schedules = [];
            if(enrolledCourseSubjects != null){
                vm.schedules=[];
                for(var i = 0; i<enrolledCourseSubjects.length;i++){
                    if(enrolledCourseSubjects[i] != null
                        && enrolledCourseSubjects[i].courseSubject != null
                        && enrolledCourseSubjects[i].courseSubject.timetables != null) {
                        for (var j = 0; j < enrolledCourseSubjects[i].courseSubject.timetables.length; j++) {
                            vm.schedule = {};
                            vm.schedule = enrolledCourseSubjects[i].courseSubject.timetables[j];
                            vm.schedule.courseSubject = enrolledCourseSubjects[i].courseSubject;
                            //nếu trường hợp hủy rồi không add thêm vào thời khóa biểu
							if(enrolledCourseSubjects[i].subjectStatus==null || (enrolledCourseSubjects[i].subjectStatus!=null && enrolledCourseSubjects[i].subjectStatus!=-4)){
								vm.schedules.push(vm.schedule);
							}  
                            vm.schedule = null;
                        }
                    }
                }
            }

            //set timetable in table
            vm.tables = [];
            var courseHours = [];

            for(var weekIndex = 2; weekIndex < 9; weekIndex++){
                vm.tables[weekIndex] = [];
                courseHours = [];
                for(var courseHourIndex = 0; courseHourIndex < vm.courseHours.length; courseHourIndex++){
                    courseHours[courseHourIndex] = '';
                    for(var scheduleIndex = 0; scheduleIndex < vm.schedules.length; scheduleIndex++){
                        var fromWeek = vm.schedules[scheduleIndex].fromWeek;
                        var toWeek = vm.schedules[scheduleIndex].toWeek;
                        //xét tuần
                        if(vm.week.index >= fromWeek && vm.week.index <= toWeek){
                            //xét ngày
                            if(vm.schedules[scheduleIndex].weekIndex == weekIndex){
                                //set ca thuộc ngày đó
                                var x = vm.courseHours[courseHourIndex].indexNumber;
                                var y1 = vm.schedules[scheduleIndex].startHour.indexNumber;
                                var y2 = vm.schedules[scheduleIndex].endHour.indexNumber;
                                if(y1 == y2){
                                    courseHours[y1-1] = vm.schedules[scheduleIndex];
                                    if(courseHours[y1-1].teacher==null) courseHours[y1-1].teacher = {displayName:""};
                                }
                                if(y1 < y2){
                                    while(y1 <= y2){
                                        courseHours[y1-1] = vm.schedules[scheduleIndex];
                                        if(courseHours[y1-1].teacher==null) courseHours[y1-1].teacher = {displayName:""};
                                        y1 += 1;
                                    }
                                }
                            }
                        }
                    }
                }
//                if(courseHours.teacher==null) courseHours.teacher = {displayName:""};
                vm.tables[weekIndex] = courseHours;
            }
        }

        function formatDate(date) {
            var d = new Date(date);
            var day = d.getDate();
            var month = d.getMonth()+1;
            var year = d.getFullYear();
            return day + '/' + month + '/' + year;
            // console.log(day+'/'+month+'/'+year);
        }

        function getWeeks(startDate,endDate) {
            vm.weeks = [];
            var sDate = new Date(startDate);
            var eDate = new Date(endDate);
            var index = 1;
            while(sDate < eDate){
                var s = new Date(sDate);
                formatDate(s);
                var e = new Date(sDate);
                vm.week = {};
                vm.week.index = index;
                vm.week.startDate = new Date(s);
                vm.week.startDateFormat = formatDate(s);
                vm.week.endDate = new Date(e.setDate(e.getDate() + 6));
                vm.week.endDateFormat = formatDate(e);
                vm.week.name = 'Tuần thứ ' + index.toString();
                vm.weeks.push(vm.week);
                vm.week = null;
                sDate = new Date(e);
                sDate = new Date(sDate.setDate(sDate.getDate()+1));
                index++;
            }
            if(vm.weeks.length > 0){
                vm.week = vm.weeks[0];
            }
        }

        vm.onWeekChange = function () {
            //set timetable in table
            vm.tables = [];
            var courseHours = [];

            //console.log(vm.week);

            var weekOrder = vm.week.index; //tuần thứ mấy ( tuần 1,2,3....)

            for(var weekIndex = 2; weekIndex < 9; weekIndex++){
                //xét ngày
                vm.tables[weekIndex] = []; //cột của bảng này ứng với ngày thứ mấy
                courseHours = []; //để lưu ca
                for(var courseHourIndex = 0; courseHourIndex < vm.courseHours.length; courseHourIndex++){
                    courseHours[courseHourIndex] = ''; //ca thú mấy
                    //xét tất cả các thời khóa biểu sinh viên này đang có
                    for(var scheduleIndex = 0; scheduleIndex < vm.schedules.length; scheduleIndex++){
                        var fromWeek = vm.schedules[scheduleIndex].fromWeek;
                        var toWeek = vm.schedules[scheduleIndex].toWeek;
                        //xét tuần
                        if(weekOrder >= fromWeek && weekOrder <= toWeek){
                            //xét ngày
                            if(vm.schedules[scheduleIndex].weekIndex == weekIndex){
                                //set ca thuộc ngày đó
                                var x = vm.courseHours[courseHourIndex].indexNumber;
                                var y1 = vm.schedules[scheduleIndex].startHour.indexNumber;
                                var y2 = vm.schedules[scheduleIndex].endHour.indexNumber;
                                if(y1 == y2){
                                    var index = 0;
                                    courseHours[y1-1] = vm.schedules[scheduleIndex];
                                    if(courseHours[y1-1].teacher==null) courseHours[y1-1].teacher = {displayName:""};
                                }
                                if(y1 < y2){
                                    var index = 0;
                                    while(y1 <= y2){
                                        courseHours[y1-1] = vm.schedules[scheduleIndex];
                                        if(courseHours[y1-1].teacher==null) courseHours[y1-1].teacher = {displayName:""};
                                        y1 += 1;
                                    }
                                }
                            }
                        }
                    }
                }
                if(courseHours.teacher==null) courseHours.teacher = {displayName:""};
                vm.tables[weekIndex] = courseHours;
            }
        }

        vm.popover = {
            title: "Chi tiết",
            placement: "right"
        };

        var trusted = {};

        $scope.getPopoverContent = function(code, subjectName, teacherName, room) {
            var content = '<strong class="font-green">'+ code +'</strong>' +'<br>'
                + '<strong class="font-blue">'+ subjectName +'</strong>' +'<br>'
                + '<strong class="font-purple">'+ teacherName +'</strong>' +'<br>'
                + '<strong class="font-red">'+ room +'</strong>';
            return trusted[content] || (trusted[content] = $sce.trustAsHtml(content));
        }

        function getListCourseHour(){
            service.getListCourseHour(1,1000).then(function(data) {
                vm.courseHours = data.content;
            });
        }
        getListCourseHour();
    }

})();
