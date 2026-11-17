import { Router } from 'express';
import * as authCtrl from '../controllers/authController.js';
import * as participantCtrl from '../controllers/participantController.js';
import * as courseCtrl from '../controllers/courseController.js';
import * as certCtrl from '../controllers/certificateController.js';
import * as dashCtrl from '../controllers/dashboardController.js';
import * as miscCtrl from '../controllers/miscController.js';
import * as facultyCtrl from '../controllers/facultyController.js';
import * as authorityCtrl from '../controllers/organizationAuthorityController.js';
import * as lookupCtrl from '../controllers/lookupController.js';
import * as reportingSheetCtrl from '../controllers/reportingSheetController.js';
import * as scheduleSlotCtrl from '../controllers/scheduleSlotController.js';
import * as theoryLectureCtrl from '../controllers/theoryLectureController.js';
import * as examResultCtrl from '../controllers/examResultController.js';
import * as practicalBreakupCtrl from '../controllers/practicalBreakupController.js';
import * as attendanceEvaluationCtrl from '../controllers/attendanceEvaluationController.js';
import * as resultSheetCtrl from '../controllers/resultSheetController.js';
import * as regimentalFundCtrl from '../controllers/regimentalFundController.js';
import * as honorariumCtrl from '../controllers/honorariumController.js';
import * as courseKitReceiptCtrl from '../controllers/courseKitReceiptController.js';
import * as mementoesUtilisationCtrl from '../controllers/mementoesUtilisationController.js';
import * as conductKeennessEvaluationCtrl from '../controllers/conductKeennessEvaluationController.js';
import * as fundManagementCtrl from '../controllers/fundManagementController.js';
import * as reportCtrl from '../controllers/reportController.js';
import * as searchCtrl from '../controllers/searchController.js';
import * as passwordResetCtrl from '../controllers/passwordResetController.js';
import { authenticate, isAdmin, isAnyRole, isSuperAdmin } from '../middleware/auth.js';
import {
  validate, authSchemas, participantSchemas, courseSchemas, certificateSchemas,
  leaveSchemas, feedbackSchemas, templateSchemas, circularSchemas,
  facultySchemas, organizationAuthoritySchemas, lookupSchemas, reportingSheetSchemas,
  scheduleSlotSchemas, theoryLectureSchemas, examResultSchemas, practicalBreakupSchemas,
  attendanceEvaluationSchemas, regimentalFundSchemas, honorariumSchemas,
  courseKitReceiptSchemas, mementoesUtilisationSchemas, conductKeennessEvaluationSchemas,
  fundManagementSchemas, fundExpenditureItemSchemas,
  scheduleSchemas, calendarSchemas, passwordResetSchemas,
} from '../middleware/validate.js';
import { uploadDocument, uploadImport, uploadDocx } from '../middleware/upload.js';

const router = Router();

// Public
router.post('/auth/login', validate(authSchemas.login), authCtrl.login);
router.post('/auth/forgot-password', validate(passwordResetSchemas.forgotPassword), passwordResetCtrl.requestReset);
router.get('/certificates/verify/:number', certCtrl.verify);

// Authenticated
router.use(authenticate);

router.get('/auth/profile', authCtrl.getProfile);
router.post('/auth/change-password', validate(authSchemas.changePassword), authCtrl.changePassword);
router.get('/dashboard', dashCtrl.getDashboard);

// Users (create/list: admin or super_admin; edit/delete/password: super_admin only)
router.post('/users', isAdmin, validate(authSchemas.createUser), authCtrl.createUser);
router.get('/users', isAdmin, miscCtrl.userList);
router.put('/users/:id', isSuperAdmin, validate(authSchemas.updateUser), miscCtrl.userUpdate);
router.delete('/users/:id', isSuperAdmin, miscCtrl.userDelete);
router.patch('/users/:id/password', isSuperAdmin, validate(authSchemas.setPassword), miscCtrl.userSetPassword);

// Password reset requests (super_admin only)
router.get('/password-reset-requests', isSuperAdmin, passwordResetCtrl.list);
router.patch('/password-reset-requests/:id/approve', isSuperAdmin, validate(passwordResetSchemas.approve), passwordResetCtrl.approve);
router.patch('/password-reset-requests/:id/reject', isSuperAdmin, validate(passwordResetSchemas.reject), passwordResetCtrl.reject);

// Participants
router.get('/participants', isAdmin, participantCtrl.list);
router.get('/participants/export', isAdmin, participantCtrl.exportExcel);
router.get('/participants/export/excel', isAdmin, participantCtrl.exportExcel);
router.get('/participants/export/pdf', isAdmin, participantCtrl.exportPdf);
router.get('/participants/units', isAdmin, participantCtrl.getUnits);
router.post('/participants/import', isAdmin, uploadImport.single('file'), participantCtrl.importExcel);
router.get('/participants/:id', isAdmin, participantCtrl.getById);
router.post('/participants', isAdmin, validate(participantSchemas.create), participantCtrl.create);
router.put('/participants/:id', isAdmin, validate(participantSchemas.update), participantCtrl.update);
router.delete('/participants/:id', isAdmin, participantCtrl.remove);

// Courses
router.get('/courses', isAnyRole, courseCtrl.list);
router.get('/courses/financial-years', isAnyRole, courseCtrl.getFinancialYears);
router.get('/courses/export/excel', isAdmin, courseCtrl.exportExcel);
router.get('/courses/export/pdf', isAdmin, courseCtrl.exportPdf);
router.get('/courses/:id', isAnyRole, courseCtrl.getById);
router.post('/courses', isAdmin, validate(courseSchemas.create), courseCtrl.create);
router.put('/courses/:id', isAdmin, validate(courseSchemas.update), courseCtrl.update);
router.delete('/courses/:id', isAdmin, courseCtrl.remove);
router.get('/courses/:id/enrollments', isAdmin, courseCtrl.getEnrollments);
router.get('/courses/:id/enrollments/export/excel', isAdmin, courseCtrl.exportRosterExcel);
router.get('/courses/:id/enrollments/export/pdf', isAdmin, courseCtrl.exportRosterPdf);
router.post('/courses/:id/enroll', isAdmin, courseCtrl.enroll);
router.get('/courses/:courseId/faculty', isAnyRole, facultyCtrl.getCourseAssignments);
router.post('/courses/:courseId/faculty', isAdmin, validate(facultySchemas.assign), facultyCtrl.assignToCourse);
router.put('/courses/:courseId/faculty/:facultyId', isAdmin, facultyCtrl.updateCourseAssignment);
router.delete('/courses/:courseId/faculty/:facultyId', isAdmin, facultyCtrl.unassignFromCourse);

// Faculty
router.get('/faculty', isAnyRole, facultyCtrl.list);
router.get('/faculty/:id', isAnyRole, facultyCtrl.getById);
router.post('/faculty', isAdmin, validate(facultySchemas.create), facultyCtrl.create);
router.put('/faculty/:id', isAdmin, validate(facultySchemas.update), facultyCtrl.update);
router.delete('/faculty/:id', isAdmin, facultyCtrl.remove);

// Organization Authorities
router.get('/organization-authorities', isAnyRole, authorityCtrl.list);
router.get('/organization-authorities/:id', isAnyRole, authorityCtrl.getById);
router.post('/organization-authorities', isAdmin, validate(organizationAuthoritySchemas.create), authorityCtrl.create);
router.put('/organization-authorities/:id', isAdmin, validate(organizationAuthoritySchemas.update), authorityCtrl.update);
router.delete('/organization-authorities/:id', isAdmin, authorityCtrl.remove);

// Lookups (ranks, departments, designations, institutes, medical-categories, document-types)
router.get('/lookups/:type', isAnyRole, lookupCtrl.list);
router.post('/lookups/:type', isAdmin, validate(lookupSchemas.create), lookupCtrl.create);
router.put('/lookups/:type/:id', isAdmin, validate(lookupSchemas.update), lookupCtrl.update);
router.delete('/lookups/:type/:id', isAdmin, lookupCtrl.remove);

// Reporting Sheet (admin-only — no participant-facing view exists for this)
router.get('/reporting-sheet/:courseId', isAdmin, reportingSheetCtrl.listForCourse);
router.post('/reporting-sheet/:courseId', isAdmin, validate(reportingSheetSchemas.create), reportingSheetCtrl.recordReporting);
router.delete('/reporting-sheet/entry/:id', isAdmin, reportingSheetCtrl.remove);

// Course Schedule (structured 12-week grid)
router.get('/schedule-slots/time-template', isAnyRole, scheduleSlotCtrl.getTimeSlotTemplate);
router.get('/courses/:courseId/schedule-slots', isAnyRole, scheduleSlotCtrl.getAll);
router.get('/courses/:courseId/schedule-slots/export/excel', isAdmin, scheduleSlotCtrl.exportExcel);
router.get('/courses/:courseId/schedule-slots/export/pdf', isAdmin, scheduleSlotCtrl.exportPdf);
router.get('/courses/:courseId/schedule-slots/:week', isAnyRole, scheduleSlotCtrl.getWeek);
router.put('/courses/:courseId/schedule-slots/:week', isAdmin, validate(scheduleSlotSchemas.saveWeek), scheduleSlotCtrl.saveWeek);

// Theory Lecture Schedule
router.get('/courses/:courseId/lecture-schedule', isAnyRole, theoryLectureCtrl.listForCourse);
router.post('/courses/:courseId/lecture-schedule', isAdmin, validate(theoryLectureSchemas.create), theoryLectureCtrl.create);
router.put('/lecture-schedule/:id', isAdmin, validate(theoryLectureSchemas.update), theoryLectureCtrl.update);
router.delete('/lecture-schedule/:id', isAdmin, theoryLectureCtrl.remove);

// Result Management — theory exams (admin-only — exposes every participant's marks for a course)
router.get('/courses/:courseId/exam-results', isAdmin, examResultCtrl.listForCourse);
router.post('/courses/:courseId/exam-results', isAdmin, validate(examResultSchemas.save), examResultCtrl.save);
router.delete('/exam-results/:id', isAdmin, examResultCtrl.remove);

// Result Management — practical breakup (admin-only — same rationale)
router.get('/courses/:courseId/practical-breakup', isAdmin, practicalBreakupCtrl.listForCourse);
router.post('/courses/:courseId/practical-breakup', isAdmin, validate(practicalBreakupSchemas.save), practicalBreakupCtrl.save);

// Leave & Attendance evaluation (admin-only — same rationale)
router.get('/courses/:courseId/attendance-evaluation', isAdmin, attendanceEvaluationCtrl.listForCourse);
router.post('/courses/:courseId/attendance-evaluation', isAdmin, validate(attendanceEvaluationSchemas.save), attendanceEvaluationCtrl.save);

// Combined printable result sheet (admin-only — same rationale)
router.get('/courses/:courseId/result-sheet', isAdmin, resultSheetCtrl.getForCourse);

// Regimental Fund (admin-only — finance data, no participant-facing view exists)
router.get('/courses/:courseId/regimental-fund', isAdmin, regimentalFundCtrl.listForCourse);
router.post('/courses/:courseId/regimental-fund', isAdmin, validate(regimentalFundSchemas.create), regimentalFundCtrl.create);
router.put('/regimental-fund/:id', isAdmin, validate(regimentalFundSchemas.update), regimentalFundCtrl.update);
router.delete('/regimental-fund/:id', isAdmin, regimentalFundCtrl.remove);

// Honorarium (admin-only — faculty payment data, no participant-facing view exists)
router.get('/courses/:courseId/honorarium', isAdmin, honorariumCtrl.listForCourse);
router.post('/courses/:courseId/honorarium', isAdmin, validate(honorariumSchemas.create), honorariumCtrl.create);
router.put('/honorarium/:id', isAdmin, validate(honorariumSchemas.update), honorariumCtrl.update);
router.delete('/honorarium/:id', isAdmin, honorariumCtrl.remove);

router.get('/courses/:courseId/course-kit-receipt', isAdmin, courseKitReceiptCtrl.listForCourse);
router.post('/courses/:courseId/course-kit-receipt', isAdmin, validate(courseKitReceiptSchemas.save), courseKitReceiptCtrl.save);

router.get('/courses/:courseId/mementoes-utilisation', isAdmin, mementoesUtilisationCtrl.getForCourse);
router.post('/courses/:courseId/mementoes-utilisation', isAdmin, validate(mementoesUtilisationSchemas.save), mementoesUtilisationCtrl.save);

router.get('/courses/:courseId/conduct-keenness', isAdmin, conductKeennessEvaluationCtrl.listForCourse);
router.post('/courses/:courseId/conduct-keenness', isAdmin, validate(conductKeennessEvaluationSchemas.save), conductKeennessEvaluationCtrl.save);

router.get('/courses/:courseId/fund-management', isAdmin, fundManagementCtrl.getForCourse);
router.post('/courses/:courseId/fund-management', isAdmin, validate(fundManagementSchemas.saveSanction), fundManagementCtrl.saveSanction);
router.post('/courses/:courseId/fund-expenditure-items', isAdmin, validate(fundExpenditureItemSchemas.create), fundManagementCtrl.addItem);
router.put('/fund-expenditure-items/:id', isAdmin, validate(fundExpenditureItemSchemas.update), fundManagementCtrl.updateItem);
router.delete('/fund-expenditure-items/:id', isAdmin, fundManagementCtrl.deleteItem);

// Reports
router.get('/reports', isAdmin, reportCtrl.listTypes);
router.get('/reports/:type', isAdmin, reportCtrl.generate);
router.get('/reports/:type/export/excel', isAdmin, reportCtrl.exportExcel);
router.get('/reports/:type/export/pdf', isAdmin, reportCtrl.exportPdf);

// Global Search (admin-only — result set spans other participants' records)
router.get('/search', isAdmin, searchCtrl.search);

// Certificates
router.get('/certificates', isAnyRole, certCtrl.list);
router.get('/certificates/:id', isAnyRole, certCtrl.getById);
router.get('/certificates/:id/download', isAnyRole, certCtrl.download);
router.get('/certificates/:id/download-docx', isAnyRole, certCtrl.downloadDocx);
router.get('/certificates/:id/preview', isAnyRole, certCtrl.preview);
router.get('/certificates/export/excel', isAdmin, certCtrl.exportExcel);
router.get('/certificates/export/pdf', isAdmin, certCtrl.exportPdf);
router.post('/certificates/generate', isAdmin, validate(certificateSchemas.generate), certCtrl.generate);
router.post('/certificates/bulk-generate', isAdmin, validate(certificateSchemas.bulkGenerate), certCtrl.bulkGenerate);
router.post('/certificates/bulk-generate-zip', isAdmin, validate(certificateSchemas.bulkGenerate), certCtrl.bulkGenerateZip);
router.delete('/certificates/:id', isAdmin, certCtrl.remove);

// Leaves
router.get('/leaves', isAnyRole, miscCtrl.leaveList);
router.get('/leaves/export/excel', isAdmin, miscCtrl.leaveExportExcel);
router.get('/leaves/export/pdf', isAdmin, miscCtrl.leaveExportPdf);
router.get('/leaves/:id', isAnyRole, miscCtrl.leaveGet);
router.post('/leaves', isAnyRole, validate(leaveSchemas.create), miscCtrl.leaveCreate);
router.patch('/leaves/:id/status', isAdmin, validate(leaveSchemas.updateStatus), miscCtrl.leaveUpdateStatus);

// Feedback
router.get('/feedback/analytics', isAdmin, miscCtrl.feedbackAnalytics);
router.get('/feedback/export/excel', isAdmin, miscCtrl.feedbackExportExcel);
router.get('/feedback/export/pdf', isAdmin, miscCtrl.feedbackExportPdf);
router.get('/feedback', isAnyRole, miscCtrl.feedbackList);
router.post('/feedback', isAnyRole, validate(feedbackSchemas.submit), miscCtrl.feedbackSubmit);

// Templates
router.get('/templates', isAdmin, miscCtrl.templateList);
router.get('/templates/:id', isAdmin, miscCtrl.templateGet);
router.post('/templates', isAdmin, validate(templateSchemas.create), miscCtrl.templateCreate);
router.post('/templates/import-docx', isAdmin, uploadDocx.single('file'), miscCtrl.templateImportDocx);
router.post('/templates/:id/replace-docx', isAdmin, uploadDocx.single('file'), miscCtrl.templateReplaceDocx);
router.put('/templates/:id', isAdmin, validate(templateSchemas.update), miscCtrl.templateUpdate);
router.delete('/templates/:id', isAdmin, miscCtrl.templateDelete);

// Circulars
router.get('/circulars', isAnyRole, miscCtrl.circularList);
router.get('/circulars/:id', isAnyRole, miscCtrl.circularGet);
router.get('/circulars/:id/pdf', isAnyRole, miscCtrl.circularPdf);
router.post('/circulars', isAdmin, validate(circularSchemas.create), miscCtrl.circularCreate);
router.post('/circulars/import-docx', isAdmin, uploadDocx.single('file'), miscCtrl.circularImportDocx);
router.put('/circulars/:id', isAdmin, validate(circularSchemas.update), miscCtrl.circularUpdate);
router.delete('/circulars/:id', isAdmin, miscCtrl.circularDelete);

// Schedules
router.get('/schedules', isAnyRole, miscCtrl.scheduleList);
router.get('/schedules/:id', isAnyRole, miscCtrl.scheduleGet);
router.get('/schedules/:id/pdf', isAnyRole, miscCtrl.schedulePdf);
router.post('/schedules', isAdmin, validate(scheduleSchemas.create), miscCtrl.scheduleCreate);
router.post('/schedules/import-docx', isAdmin, uploadDocx.single('file'), miscCtrl.scheduleImportDocx);
router.put('/schedules/:id', isAdmin, validate(scheduleSchemas.update), miscCtrl.scheduleUpdate);
router.delete('/schedules/:id', isAdmin, miscCtrl.scheduleDelete);

// Calendars
router.get('/calendars', isAnyRole, miscCtrl.calendarList);
router.get('/calendars/export/excel', isAdmin, miscCtrl.calendarExportExcel);
router.get('/calendars/export/pdf', isAdmin, miscCtrl.calendarExportPdf);
router.get('/calendars/:id', isAnyRole, miscCtrl.calendarGet);
router.get('/calendars/:id/pdf', isAnyRole, miscCtrl.calendarPdf);
router.post('/calendars', isAdmin, validate(calendarSchemas.create), miscCtrl.calendarCreate);
router.post('/calendars/import-docx', isAdmin, uploadDocx.single('file'), miscCtrl.calendarImportDocx);
router.put('/calendars/:id', isAdmin, validate(calendarSchemas.update), miscCtrl.calendarUpdate);
router.delete('/calendars/:id', isAdmin, miscCtrl.calendarDelete);

// Documents
router.get('/documents', isAnyRole, miscCtrl.documentList);
router.post('/documents', isAdmin, uploadDocument.single('file'), miscCtrl.documentUpload);
router.get('/documents/:id/download', isAnyRole, miscCtrl.documentDownload);
router.delete('/documents/:id', isAdmin, miscCtrl.documentDelete);

// Notifications
router.get('/notifications', isAnyRole, miscCtrl.notificationList);
router.get('/notifications/unread-count', isAnyRole, miscCtrl.notificationUnreadCount);
router.patch('/notifications/:id/read', isAnyRole, miscCtrl.notificationMarkRead);
router.patch('/notifications/read-all', isAnyRole, miscCtrl.notificationMarkAllRead);

// Settings
router.get('/settings', isAdmin, miscCtrl.settingsGet);
router.put('/settings', isAdmin, miscCtrl.settingsUpdate);

// Attendance
router.get('/attendance', isAnyRole, miscCtrl.attendanceList);
router.post('/attendance/bulk', isAdmin, miscCtrl.attendanceBulkMark);

export default router;
