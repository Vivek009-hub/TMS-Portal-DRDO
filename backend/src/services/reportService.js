import XLSX from 'xlsx';
import reportRepository from '../repositories/reportRepository.js';
import { streamTablePdfToResponse } from './pdfService.js';
import { ValidationError } from '../utils/errors.js';

export const REPORT_DEFINITIONS = {
  'participant-list': {
    label: 'Participant List',
    fetch: (q) => reportRepository.participantList(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'rank_name', label: 'Rank' },
      { key: 'department_name', label: 'Department' }, { key: 'course_name', label: 'Course' },
      { key: 'mobile_number', label: 'Mobile' }, { key: 'eligible', label: 'Eligible' },
    ],
  },
  'department-wise': {
    label: 'Department-wise List',
    fetch: () => reportRepository.departmentWiseSummary(),
    columns: [
      { key: 'department_name', label: 'Department' }, { key: 'total_participants', label: 'Total Participants' },
      { key: 'eligible_count', label: 'Eligible' },
    ],
  },
  'eligible-participants': {
    label: 'Eligible Participants',
    fetch: (q) => reportRepository.eligibleParticipants(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'rank_name', label: 'Rank' },
      { key: 'department_name', label: 'Department' }, { key: 'course_name', label: 'Course' },
    ],
  },
  'pending-documents': {
    label: 'Pending Documents',
    fetch: (q) => reportRepository.pendingDocuments(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'course_name', label: 'Course' },
      { key: 'pending_document', label: 'Pending Document' },
    ],
  },
  'attendance-report': {
    label: 'Attendance Report',
    fetch: (q) => reportRepository.attendanceReport(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'course_name', label: 'Course' },
      { key: 'present_days', label: 'Present' }, { key: 'absent_days', label: 'Absent' },
      { key: 'late_days', label: 'Late' }, { key: 'excused_days', label: 'Excused' },
      { key: 'total_marked', label: 'Total Marked' },
    ],
  },
  'leave-report': {
    label: 'Leave Report',
    fetch: (q) => reportRepository.leaveReport(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'leave_type', label: 'Leave Type' },
      { key: 'start_date', label: 'Start Date' }, { key: 'end_date', label: 'End Date' },
      { key: 'no_of_days', label: 'No. of Days' }, { key: 'status', label: 'Status' },
    ],
  },
  'certificate-report': {
    label: 'Certificate Report',
    fetch: (q) => reportRepository.certificateReport(q),
    columns: [
      { key: 'certificate_number', label: 'Certificate No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'service_number', label: 'Service No.' },
      { key: 'course_name', label: 'Course' }, { key: 'type', label: 'Type' }, { key: 'issued_date', label: 'Issued Date' },
    ],
  },
  'faculty-report': {
    label: 'Faculty Report',
    fetch: () => reportRepository.facultyReport(),
    columns: [
      { key: 'name', label: 'Name' }, { key: 'rank_name', label: 'Rank' }, { key: 'designation_name', label: 'Designation' },
      { key: 'institute_name', label: 'Institute' }, { key: 'status', label: 'Status' },
      { key: 'courses_assigned', label: 'Courses Assigned' },
    ],
  },
  'honorarium-report': {
    label: 'Honorarium Report',
    fetch: (q) => reportRepository.honorariumReport(q),
    columns: [
      { key: 'faculty_name', label: 'Faculty' }, { key: 'course_name', label: 'Course' },
      { key: 'paper_setting', label: 'Paper Setting' }, { key: 'theory_exam', label: 'Theory Exam' },
      { key: 'practical_exam', label: 'Practical Exam' }, { key: 'evaluation', label: 'Evaluation' },
      { key: 'transport', label: 'Transport' }, { key: 'total', label: 'Total' },
    ],
  },
  'course-report': {
    label: 'Course Report',
    fetch: (q) => reportRepository.courseReport(q),
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'financial_year', label: 'Financial Year' },
      { key: 'start_date', label: 'Start Date' }, { key: 'end_date', label: 'End Date' },
      { key: 'total_seats', label: 'Total Seats' }, { key: 'enrolled_count', label: 'Enrolled' }, { key: 'status', label: 'Status' },
    ],
  },
  'result-sheet': {
    label: 'Result Sheet',
    requiresCourse: true,
    fetch: (q) => reportRepository.resultSheetReport(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'midterm_marks', label: 'Midterm' },
      { key: 'final_marks', label: 'Final' }, { key: 'practical_total', label: 'Practical Total' },
      { key: 'practical_percentage', label: 'Practical %' }, { key: 'practical_grade', label: 'Grade' },
      { key: 'practical_rank', label: 'Rank' },
    ],
  },
  'practical-breakup': {
    label: 'Practical Breakup',
    fetch: (q) => reportRepository.practicalBreakupReport(q),
    columns: [
      { key: 'service_number', label: 'Service No.' }, { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' }, { key: 'course_name', label: 'Course' },
      { key: 'pump_drill', label: 'Pump Drill' }, { key: 'ba_set', label: 'BA Set' }, { key: 'hose', label: 'Hose' },
      { key: 'ert', label: 'ERT' }, { key: 'viva', label: 'Viva' }, { key: 'class_notes', label: 'Class Notes' },
      { key: 'station_duty', label: 'Station Duty' }, { key: 'conduct_keenness', label: 'Conduct & Keenness' },
      { key: 'average', label: 'Average' }, { key: 'total', label: 'Total' }, { key: 'percentage', label: '%' },
      { key: 'grade', label: 'Grade' }, { key: 'rank_position', label: 'Rank' },
    ],
  },
  'fund-report': {
    label: 'Regimental Fund Report',
    fetch: (q) => reportRepository.fundReport(q),
    columns: [
      { key: 'course_name', label: 'Course' }, { key: 'deposit_date', label: 'Deposit Date' },
      { key: 'amount_per_week', label: 'Amount/Week' }, { key: 'duration_weeks', label: 'Duration (weeks)' },
      { key: 'strength', label: 'Strength' }, { key: 'total_collection', label: 'Total Collection' },
    ],
  },
};

function getDefinition(type) {
  const def = REPORT_DEFINITIONS[type];
  if (!def) throw new ValidationError(`Unknown report type: ${type}`);
  return def;
}

const reportService = {
  listTypes() {
    return Object.entries(REPORT_DEFINITIONS).map(([key, def]) => ({
      key, label: def.label, requiresCourse: Boolean(def.requiresCourse),
    }));
  },

  async generate(type, query) {
    const def = getDefinition(type);
    if (def.requiresCourse && !query.course_id) {
      throw new ValidationError(`${def.label} requires a course_id filter`);
    }
    const rows = await def.fetch(query);
    return { columns: def.columns, rows };
  },

  async exportExcel(type, query) {
    const { columns, rows } = await this.generate(type, query);
    const exportData = rows.map((row) => {
      const record = {};
      columns.forEach((col) => { record[col.label] = row[col.key] ?? ''; });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, getDefinition(type).label.slice(0, 31));
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  },

  async exportPdf(type, query, res) {
    const def = getDefinition(type);
    const { columns, rows } = await this.generate(type, query);
    streamTablePdfToResponse(res, def.label, columns, rows);
  },
};

export default reportService;
