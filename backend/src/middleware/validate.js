import Joi from 'joi';

export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    req[property] = value;
    next();
  };
}

export const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    role: Joi.string().valid('admin', 'user').required(),
  }),
  updateUser: Joi.object({
    email: Joi.string().email(),
    first_name: Joi.string().max(100),
    last_name: Joi.string().max(100),
    role: Joi.string().valid('admin', 'user'),
    is_active: Joi.boolean(),
  }),
  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).required(),
  }),
  setPassword: Joi.object({
    new_password: Joi.string().min(8).required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

export const passwordResetSchemas = {
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  approve: Joi.object({
    new_password: Joi.string().min(8).required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
  reject: Joi.object({
    reason: Joi.string().max(1000).allow('', null),
  }),
};

const documentChecklistItem = Joi.object({
  document_type_id: Joi.number().integer().positive().required(),
  submitted: Joi.boolean().default(false),
  file_path: Joi.string().max(500).allow('', null),
});

export const participantSchemas = {
  create: Joi.object({
    service_number: Joi.string().max(50).required(),
    rank_id: Joi.number().integer().positive().allow(null),
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    mobile_number: Joi.string().max(20).allow('', null),
    email: Joi.string().email().allow('', null),
    date_of_birth: Joi.date().iso().allow(null),
    educational_qualification: Joi.string().max(255).allow('', null),
    qualifying_essential_education: Joi.boolean().allow(null),
    date_of_appointment: Joi.date().iso().allow(null),
    date_of_retirement: Joi.date().iso().allow(null),
    unit_address: Joi.string().allow('', null),
    pin_code: Joi.string().max(10).allow('', null),
    medical_category_id: Joi.number().integer().positive().allow(null),
    date_of_reporting: Joi.date().iso().allow(null),
    reporting_time_session: Joi.string().valid('FN', 'AN').allow(null),
    movement_order_number: Joi.string().max(100).allow('', null),
    movement_order_date: Joi.date().iso().allow(null),
    department_id: Joi.number().integer().positive().allow(null),
    remarks: Joi.string().allow('', null),
    signature_path: Joi.string().max(500).allow('', null),
    eligible: Joi.boolean().allow(null),
    actual_participation: Joi.boolean().allow(null),
    reallocation_reason: Joi.string().max(500).allow('', null),
    course_id: Joi.number().integer().positive().allow(null),
    documents: Joi.array().items(documentChecklistItem),
    create_user_account: Joi.boolean().default(false),
    user_password: Joi.string().min(8).allow('', null).when('create_user_account', {
      is: true,
      then: Joi.string().min(8).required(),
      otherwise: Joi.optional(),
    }),
  }),
  update: Joi.object({
    rank_id: Joi.number().integer().positive().allow(null),
    first_name: Joi.string().max(100),
    last_name: Joi.string().max(100),
    mobile_number: Joi.string().max(20).allow('', null),
    email: Joi.string().email().allow('', null),
    date_of_birth: Joi.date().iso().allow(null),
    educational_qualification: Joi.string().max(255).allow('', null),
    qualifying_essential_education: Joi.boolean().allow(null),
    date_of_appointment: Joi.date().iso().allow(null),
    date_of_retirement: Joi.date().iso().allow(null),
    unit_address: Joi.string().allow('', null),
    pin_code: Joi.string().max(10).allow('', null),
    medical_category_id: Joi.number().integer().positive().allow(null),
    date_of_reporting: Joi.date().iso().allow(null),
    reporting_time_session: Joi.string().valid('FN', 'AN').allow(null),
    movement_order_number: Joi.string().max(100).allow('', null),
    movement_order_date: Joi.date().iso().allow(null),
    department_id: Joi.number().integer().positive().allow(null),
    remarks: Joi.string().allow('', null),
    signature_path: Joi.string().max(500).allow('', null),
    eligible: Joi.boolean().allow(null),
    actual_participation: Joi.boolean().allow(null),
    reallocation_reason: Joi.string().max(500).allow('', null),
    course_id: Joi.number().integer().positive().allow(null),
    documents: Joi.array().items(documentChecklistItem),
    is_active: Joi.boolean(),
  }),
};

const seatAllocationItem = Joi.object({
  department_id: Joi.number().integer().positive().required(),
  allocated_seats: Joi.number().integer().min(0).required(),
});

export const courseSchemas = {
  create: Joi.object({
    code: Joi.string().max(50).required(),
    name: Joi.string().max(255).required(),
    description: Joi.string().allow('', null),
    instructor: Joi.string().max(255).allow('', null),
    venue: Joi.string().max(255).allow('', null),
    duration_days: Joi.number().integer().min(0),
    start_date: Joi.date().iso().allow(null),
    end_date: Joi.date().iso().allow(null),
    financial_year: Joi.string().max(9).allow('', null),
    authorized_seats: Joi.number().integer().min(1).allow(null),
    total_seats: Joi.number().integer().min(1),
    status: Joi.string().valid('draft', 'scheduled', 'running', 'completed', 'cancelled'),
    seat_allocations: Joi.array().items(seatAllocationItem),
  }),
  update: Joi.object({
    code: Joi.string().max(50),
    name: Joi.string().max(255),
    description: Joi.string().allow('', null),
    instructor: Joi.string().max(255).allow('', null),
    venue: Joi.string().max(255).allow('', null),
    duration_days: Joi.number().integer().min(0),
    start_date: Joi.date().iso().allow(null),
    end_date: Joi.date().iso().allow(null),
    financial_year: Joi.string().max(9).allow('', null),
    authorized_seats: Joi.number().integer().min(1).allow(null),
    total_seats: Joi.number().integer().min(1),
    status: Joi.string().valid('draft', 'scheduled', 'running', 'completed', 'cancelled'),
    seat_allocations: Joi.array().items(seatAllocationItem),
  }),
};

export const facultySchemas = {
  create: Joi.object({
    name: Joi.string().max(255).required(),
    rank_id: Joi.number().integer().positive().allow(null),
    designation_id: Joi.number().integer().positive().allow(null),
    institute_id: Joi.number().integer().positive().allow(null),
    mobile: Joi.string().max(20).allow('', null),
    email: Joi.string().email().allow('', null),
    address: Joi.string().allow('', null),
    expertise: Joi.string().max(500).allow('', null),
    status: Joi.string().valid('active', 'inactive'),
  }),
  update: Joi.object({
    name: Joi.string().max(255),
    rank_id: Joi.number().integer().positive().allow(null),
    designation_id: Joi.number().integer().positive().allow(null),
    institute_id: Joi.number().integer().positive().allow(null),
    mobile: Joi.string().max(20).allow('', null),
    email: Joi.string().email().allow('', null),
    address: Joi.string().allow('', null),
    expertise: Joi.string().max(500).allow('', null),
    status: Joi.string().valid('active', 'inactive'),
  }),
  assign: Joi.object({
    faculty_id: Joi.number().integer().positive().required(),
    role: Joi.string().max(100).allow('', null),
  }),
};

// Free-form slug: lowercase letters/digits/underscores, so admins can add authority
// types beyond the built-in set (director/associate_director/course_director remain
// semantically special to certificate generation; everything else is descriptive).
const authorityTypeSlug = Joi.string().max(50).pattern(/^[a-z0-9_]+$/);

export const organizationAuthoritySchemas = {
  create: Joi.object({
    authority_type: authorityTypeSlug.required(),
    name: Joi.string().max(255).required(),
    rank_id: Joi.number().integer().positive().allow(null),
    designation_id: Joi.number().integer().positive().allow(null),
    mobile: Joi.string().max(20).allow('', null),
    course_id: Joi.number().integer().positive().allow(null),
  }),
  update: Joi.object({
    authority_type: authorityTypeSlug,
    name: Joi.string().max(255),
    rank_id: Joi.number().integer().positive().allow(null),
    designation_id: Joi.number().integer().positive().allow(null),
    mobile: Joi.string().max(20).allow('', null),
    course_id: Joi.number().integer().positive().allow(null),
  }),
};

export const lookupSchemas = {
  create: Joi.object({
    name: Joi.string().max(255).required(),
  }),
  // Only 'institutes' currently has fields beyond `name` (see lookupService.UPDATABLE_FIELDS);
  // this schema stays generic so other lookup types can grow extra fields later.
  update: Joi.object({
    name: Joi.string().max(255),
    phone: Joi.string().max(50).allow('', null),
    fax: Joi.string().max(50).allow('', null),
    email: Joi.string().email().max(255).allow('', null),
    address: Joi.string().max(2000).allow('', null),
  }),
};

const scheduleCell = Joi.object({
  day_number: Joi.number().integer().min(1).max(7).required(),
  start_time: Joi.string().required(),
  end_time: Joi.string().required(),
  topic: Joi.string().max(255).allow('', null),
  faculty_id: Joi.number().integer().positive().allow(null),
  remarks: Joi.string().max(255).allow('', null),
});

export const scheduleSlotSchemas = {
  saveWeek: Joi.object({
    cells: Joi.array().items(scheduleCell).min(1).required(),
  }),
};

export const theoryLectureSchemas = {
  create: Joi.object({
    topic: Joi.string().max(255).required(),
    sessions: Joi.number().integer().min(1).default(1),
    faculty_id: Joi.number().integer().positive().allow(null),
    confirmed_by_faculty: Joi.boolean().allow(null),
    alternate_faculty_id: Joi.number().integer().positive().allow(null),
    reason_for_change: Joi.string().max(500).allow('', null),
    coordinator_authority_id: Joi.number().integer().positive().allow(null),
    director_authority_id: Joi.number().integer().positive().allow(null),
    associate_director_authority_id: Joi.number().integer().positive().allow(null),
  }),
  update: Joi.object({
    topic: Joi.string().max(255),
    sessions: Joi.number().integer().min(1),
    faculty_id: Joi.number().integer().positive().allow(null),
    confirmed_by_faculty: Joi.boolean().allow(null),
    alternate_faculty_id: Joi.number().integer().positive().allow(null),
    reason_for_change: Joi.string().max(500).allow('', null),
    coordinator_authority_id: Joi.number().integer().positive().allow(null),
    director_authority_id: Joi.number().integer().positive().allow(null),
    associate_director_authority_id: Joi.number().integer().positive().allow(null),
  }),
};

export const examResultSchemas = {
  save: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    exam_category: Joi.string().valid('theory', 'practical'),
    exam_type: Joi.string().valid('midterm', 'final').required(),
    max_marks: Joi.number().min(0).default(100),
    passing_marks: Joi.number().min(0).default(40),
    examiner_id: Joi.number().integer().positive().allow(null),
    invigilator_id: Joi.number().integer().positive().allow(null),
    invigilator2_id: Joi.number().integer().positive().allow(null),
    exam_date: Joi.date().iso().allow(null),
    marks_obtained: Joi.number().min(0).allow(null),
  }),
};

export const practicalBreakupSchemas = {
  save: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    exam_type: Joi.string().valid('midterm', 'final'),
    examiner_id: Joi.number().integer().positive().allow(null),
    invigilator_id: Joi.number().integer().positive().allow(null),
    invigilator2_id: Joi.number().integer().positive().allow(null),
    pump_drill: Joi.number().min(0).max(100).default(0),
    ba_set: Joi.number().min(0).max(100).default(0),
    hose: Joi.number().min(0).max(100).default(0),
    ert: Joi.number().min(0).max(100).default(0),
    viva: Joi.number().min(0).max(100).default(0),
    class_notes: Joi.number().min(0).max(100).default(0),
    station_duty: Joi.number().min(0).max(100).default(0),
    conduct_keenness: Joi.number().min(0).max(100).default(0),
    result_date: Joi.date().iso().allow(null),
  }),
};

export const attendanceEvaluationSchemas = {
  save: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    no_of_leave_days: Joi.number().integer().min(0).allow(null),
    attendance_marks: Joi.number().min(0).max(100).allow(null),
    evaluation_date: Joi.date().iso().allow(null),
  }),
};

export const courseKitReceiptSchemas = {
  save: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    distribution_date: Joi.date().iso().allow(null),
    course_material: Joi.boolean(),
    course_kit: Joi.boolean(),
    group_photo: Joi.boolean(),
    remarks: Joi.string().max(255).allow('', null),
  }),
};

export const mementoesUtilisationSchemas = {
  save: Joi.object({
    distribution_date: Joi.date().iso().allow(null),
    first_in_merit_participant_id: Joi.number().integer().positive().allow(null),
    second_in_merit_participant_id: Joi.number().integer().positive().allow(null),
    third_in_merit_participant_id: Joi.number().integer().positive().allow(null),
    course_senior_participant_id: Joi.number().integer().positive().allow(null),
  }),
};

export const conductKeennessEvaluationSchemas = {
  save: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    max_marks: Joi.number().min(0).allow(null),
    eval_by_course_director: Joi.number().min(0).allow(null),
    eval_by_course_coordinator: Joi.number().min(0).allow(null),
    eval_by_ic_practical_drills: Joi.number().min(0).allow(null),
    evaluation_date: Joi.date().iso().allow(null),
  }),
};

export const regimentalFundSchemas = {
  create: Joi.object({
    deposit_date: Joi.date().iso().required(),
    amount_per_week: Joi.number().min(0).required(),
    duration_weeks: Joi.number().integer().min(1).required(),
    strength: Joi.number().integer().min(0).required(),
  }),
  update: Joi.object({
    deposit_date: Joi.date().iso(),
    amount_per_week: Joi.number().min(0),
    duration_weeks: Joi.number().integer().min(1),
    strength: Joi.number().integer().min(0),
  }),
};

export const honorariumSchemas = {
  create: Joi.object({
    faculty_id: Joi.number().integer().positive().required(),
    paper_setting: Joi.number().min(0).default(0),
    theory_exam: Joi.number().min(0).default(0),
    practical_exam: Joi.number().min(0).default(0),
    evaluation: Joi.number().min(0).default(0),
    transport: Joi.number().min(0).default(0),
  }),
  update: Joi.object({
    paper_setting: Joi.number().min(0),
    theory_exam: Joi.number().min(0),
    practical_exam: Joi.number().min(0),
    evaluation: Joi.number().min(0),
    transport: Joi.number().min(0),
  }),
};

export const reportingSheetSchemas = {
  create: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    reporting_date: Joi.date().iso().required(),
    reporting_time: Joi.string().allow('', null),
    signature_path: Joi.string().max(500).allow('', null),
  }),
};

export const certificateSchemas = {
  generate: Joi.object({
    participant_id: Joi.number().integer().positive().required(),
    course_id: Joi.number().integer().positive().required(),
    type: Joi.string().valid('completion', 'participation', 'detention', 'returned_to_unit', 'appreciation').required(),
    template_id: Joi.number().integer().positive().allow(null),
    remarks: Joi.string().allow('', null),
    issued_date: Joi.date().iso(),
    rtu_reason: Joi.string().allow('', null),
  }),
  bulkGenerate: Joi.object({
    course_id: Joi.number().integer().positive().required(),
    type: Joi.string().valid('completion', 'participation', 'detention', 'returned_to_unit', 'appreciation').required(),
    participant_ids: Joi.array().items(Joi.number().integer().positive()).min(1),
    department_id: Joi.number().integer().positive().allow(null),
    group_by_department: Joi.boolean(),
    template_id: Joi.number().integer().positive().allow(null),
    rtu_reason: Joi.string().allow('', null),
  }),
};

export const leaveSchemas = {
  create: Joi.object({
    course_id: Joi.number().integer().positive().allow(null),
    leave_type: Joi.string().valid('casual', 'medical', 'emergency', 'official', 'other').required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
    reason: Joi.string().required(),
  }),
  updateStatus: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'cancelled').required(),
    admin_remarks: Joi.string().allow('', null),
  }),
};

const feedbackCategoryScore = Joi.number().integer().min(0).max(10).allow(null);

export const feedbackSchemas = {
  submit: Joi.object({
    course_id: Joi.number().integer().positive().required(),
    overall_rating: Joi.number().integer().min(1).max(5).required(),
    content_rating: Joi.number().integer().min(1).max(5),
    instructor_rating: Joi.number().integer().min(1).max(5),
    facility_rating: Joi.number().integer().min(1).max(5),
    // "Feedback by Participants" spec: 8 named categories scored out of 10
    classroom_arrangements: feedbackCategoryScore,
    course_content_kit: feedbackCategoryScore,
    practical_learning: feedbackCategoryScore,
    faculty_score: feedbackCategoryScore,
    overall_learning: feedbackCategoryScore,
    hostel_stay: feedbackCategoryScore,
    food: feedbackCategoryScore,
    other_facilities: feedbackCategoryScore,
    comments: Joi.string().allow('', null),
    suggestions: Joi.string().allow('', null),
    is_anonymous: Joi.boolean().default(false),
  }),
};

export const templateSchemas = {
  create: Joi.object({
    type: Joi.string().valid('course_calendar', 'course_schedule', 'course_circular', 'certificate').required(),
    name: Joi.string().max(255).required(),
    content: Joi.string().required(),
    certificate_type: Joi.string().valid('completion', 'participation', 'detention', 'returned_to_unit', 'appreciation').allow(null, ''),
    is_default: Joi.boolean(),
  }),
  update: Joi.object({
    name: Joi.string().max(255),
    content: Joi.string(),
    certificate_type: Joi.string().valid('completion', 'participation', 'detention', 'returned_to_unit', 'appreciation').allow(null, ''),
    is_default: Joi.boolean(),
  }),
};

export const scheduleSchemas = {
  create: Joi.object({
    course_id: Joi.number().integer().positive().required(),
    title: Joi.string().max(255).required(),
    content: Joi.string().required(),
    template_id: Joi.number().integer().positive().allow(null),
  }),
  update: Joi.object({
    course_id: Joi.number().integer().positive(),
    title: Joi.string().max(255),
    content: Joi.string(),
    template_id: Joi.number().integer().positive().allow(null),
  }),
};

export const calendarSchemas = {
  create: Joi.object({
    course_id: Joi.number().integer().positive().required(),
    title: Joi.string().max(255).required(),
    content: Joi.string().required(),
    template_id: Joi.number().integer().positive().allow(null),
    year: Joi.number().integer().min(2000).max(2100).allow(null),
  }),
  update: Joi.object({
    course_id: Joi.number().integer().positive(),
    title: Joi.string().max(255),
    content: Joi.string(),
    template_id: Joi.number().integer().positive().allow(null),
    year: Joi.number().integer().min(2000).max(2100).allow(null),
  }),
};

export const circularSchemas = {
  create: Joi.object({
    course_id: Joi.number().integer().positive().allow(null),
    title: Joi.string().max(255).required(),
    reference_number: Joi.string().max(100).allow('', null),
    content: Joi.string().required(),
    template_id: Joi.number().integer().positive().allow(null),
    status: Joi.string().valid('draft', 'published', 'archived'),
  }),
  update: Joi.object({
    course_id: Joi.number().integer().positive().allow(null),
    title: Joi.string().max(255),
    reference_number: Joi.string().max(100).allow('', null),
    content: Joi.string(),
    template_id: Joi.number().integer().positive().allow(null),
    status: Joi.string().valid('draft', 'published', 'archived'),
  }),
};

export const fundManagementSchemas = {
  saveSanction: Joi.object({
    course_material: Joi.number().min(0).default(0),
    hospitality: Joi.number().min(0).default(0),
    honorarium: Joi.number().min(0).default(0),
    transport: Joi.number().min(0).default(0),
    mementoes: Joi.number().min(0).default(0),
    consumables: Joi.number().min(0).default(0),
    miscellaneous: Joi.number().min(0).default(0),
    cash_drawn_amount: Joi.number().min(0).allow(null),
    cash_drawn_date: Joi.date().iso().allow(null),
    balance_returned_date: Joi.date().iso().allow(null),
    bills_submission_date: Joi.date().iso().allow(null),
  }),
};

export const fundExpenditureItemSchemas = {
  create: Joi.object({
    bill_no: Joi.string().max(100).allow('', null),
    expenditure_date: Joi.date().iso().allow(null),
    details: Joi.string().max(500).allow('', null),
    mode_of_payment: Joi.string().max(100).allow('', null),
    expenditure_head: Joi.string().max(100).allow('', null),
    amount: Joi.number().min(0).required(),
  }),
  update: Joi.object({
    bill_no: Joi.string().max(100).allow('', null),
    expenditure_date: Joi.date().iso().allow(null),
    details: Joi.string().max(500).allow('', null),
    mode_of_payment: Joi.string().max(100).allow('', null),
    expenditure_head: Joi.string().max(100).allow('', null),
    amount: Joi.number().min(0),
  }),
};
