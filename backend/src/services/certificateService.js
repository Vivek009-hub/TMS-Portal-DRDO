import fs from 'fs';
import { ZipArchive } from 'archiver';
import pool from '../config/database.js';
import certificateRepository from '../repositories/certificateRepository.js';
import participantRepository from '../repositories/participantRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import templateRepository from '../repositories/templateRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import notificationRepository from '../repositories/notificationRepository.js';
import userRepository from '../repositories/userRepository.js';
import organizationAuthorityRepository from '../repositories/organizationAuthorityRepository.js';
import leaveRepository from '../repositories/leaveRepository.js';
import facultyRepository from '../repositories/facultyRepository.js';
import { generateCertificatePdf, streamTablePdfToResponse } from './pdfService.js';
import { generateFromDocxTemplate } from './docxCertificateService.js';
import { sendCertificateEmail } from './emailService.js';
import { buildExcelBuffer, formatExportDate, buildFilterSummary } from './exportService.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { parsePagination, buildPaginatedResponse, generateCertificateNumber, sanitizeFilename, slugify } from '../utils/helpers.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const CERTIFICATE_EXPORT_COLUMNS = [
  { key: 'certificate_number', label: 'Certificate No.' },
  { key: 'participant_id', label: 'Participant ID' },
  { key: 'participant_name', label: 'Participant Name' },
  { key: 'course_name', label: 'Course' },
  { key: 'department_name', label: 'Department' },
  { key: 'type', label: 'Certificate Type' },
  { key: 'issued_date', label: 'Issue Date' },
  { key: 'status', label: 'Status' },
];

/**
 * Every authority (director/associate_director/course_director, plus any other built-in
 * or custom authority_type) relevant to this course becomes its own template placeholder —
 * {{<authority_type>_name}} / {{<authority_type>_rank}} / {{<authority_type>_designation}} —
 * instead of a fixed 3-signatory block being hardcoded into the PDF renderer. Template
 * authors pick whichever authority they want by typing that placeholder into the template;
 * nothing renders unless the template actually references it.
 */
async function resolveAuthorityPlaceholders(courseId) {
  const authorities = await organizationAuthorityRepository.findAllForCourse(courseId);
  const byType = new Map();
  authorities.forEach((a) => {
    if (!byType.has(a.authority_type)) byType.set(a.authority_type, []);
    byType.get(a.authority_type).push(a);
  });

  const placeholders = {};
  byType.forEach((list, type) => {
    placeholders[`${type}_name`] = list.map((a) => a.name).join(', ');
    placeholders[`${type}_rank`] = list.map((a) => a.rank_name).filter(Boolean).join(', ');
    placeholders[`${type}_designation`] = list.map((a) => a.designation_name).filter(Boolean).join(', ');
    placeholders[`${type}_mobile`] = list.map((a) => a.mobile).filter(Boolean).join(', ');
  });

  const primary = (type) => byType.get(type)?.[0] || null;
  return {
    placeholders,
    director: primary('director'),
    associateDirector: primary('associate_director'),
    courseDirector: primary('course_director'),
  };
}

async function getPracticalGrade(participantId, courseId) {
  const [rows] = await pool.query(
    "SELECT grade FROM practical_breakups WHERE participant_id = ? AND course_id = ? AND exam_type = 'final'",
    [participantId, courseId]
  );
  return rows[0]?.grade || null;
}

async function getLeaveDetailsText(participantId, courseId) {
  const { data } = await leaveRepository.findAll({ participant_id: participantId, course_id: courseId, limit: 50, offset: 0 });
  if (!data.length) return 'No leave availed during the course';
  return data
    .map((l) => `${l.leave_type} leave: ${l.start_date} to ${l.end_date} (${l.status})`)
    .join('; ');
}

/**
 * The joined {{faculty_name}}/{{faculty_designation}} (all signatories together) keeps
 * working as before. Each individually-assigned course_faculty.role additionally becomes
 * its own placeholder — {{faculty_<role>_name}}/{{faculty_<role>_designation}} — so a
 * template can call out one specific person (e.g. {{faculty_chief_instructor_name}})
 * instead of only ever getting the combined list.
 */
async function getFacultyPlaceholders(courseId) {
  const signatories = await facultyRepository.getCertificateSignatories(courseId);
  const placeholders = {
    faculty_name: signatories.map((f) => f.name).join(', '),
    faculty_designation: signatories.map((f) => f.designation_name || '').join(', '),
    faculty_institute_name: [...new Set(signatories.map((f) => f.institute_name).filter(Boolean))].join(', '),
    faculty_institute_phone: [...new Set(signatories.map((f) => f.institute_phone).filter(Boolean))].join(', '),
    faculty_institute_fax: [...new Set(signatories.map((f) => f.institute_fax).filter(Boolean))].join(', '),
    faculty_institute_email: [...new Set(signatories.map((f) => f.institute_email).filter(Boolean))].join(', '),
    faculty_institute_address: [...new Set(signatories.map((f) => f.institute_address).filter(Boolean))].join(', '),
  };
  signatories.forEach((f) => {
    const slug = slugify(f.role);
    if (!slug) return;
    placeholders[`faculty_${slug}_name`] = f.name;
    placeholders[`faculty_${slug}_designation`] = f.designation_name || '';
    placeholders[`faculty_${slug}_institute_name`] = f.institute_name || '';
    placeholders[`faculty_${slug}_institute_phone`] = f.institute_phone || '';
    placeholders[`faculty_${slug}_institute_fax`] = f.institute_fax || '';
    placeholders[`faculty_${slug}_institute_email`] = f.institute_email || '';
    placeholders[`faculty_${slug}_institute_address`] = f.institute_address || '';
  });
  return placeholders;
}

const certificateService = {
  async list(query, user) {
    const { page, limit, offset } = parsePagination(query);
    const filters = {
      search: query.search,
      type: query.type,
      course_id: query.course_id,
      limit,
      offset,
    };

    if (user.role === 'user') {
      const participant = await participantRepository.findByUserId(user.id);
      if (!participant) throw new ForbiddenError('No participant profile linked');
      filters.participant_id = participant.id;
    } else {
      filters.participant_id = query.participant_id;
    }

    const { data, total } = await certificateRepository.findAll(filters);
    return buildPaginatedResponse(data, total, page, limit);
  },

  async getById(id, user) {
    const cert = await certificateRepository.findById(id);
    if (!cert) throw new NotFoundError('Certificate not found');

    if (user.role === 'user') {
      const participant = await participantRepository.findByUserId(user.id);
      if (!participant || cert.participant_id !== participant.id) {
        throw new ForbiddenError('Access denied');
      }
    }

    return cert;
  },

  async verify(certificateNumber) {
    const cert = await certificateRepository.findByNumber(certificateNumber);
    if (!cert) throw new NotFoundError('Certificate not found or invalid');
    return {
      valid: true,
      certificate_number: cert.certificate_number,
      type: cert.type,
      participant_name: `${cert.first_name} ${cert.last_name}`,
      service_number: cert.service_number,
      course_name: cert.course_name,
      issued_date: cert.issued_date,
    };
  },

  async generate(data, issuedBy) {
    const participant = await participantRepository.findById(data.participant_id);
    if (!participant) throw new NotFoundError('Participant not found');

    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');

    const prefixSetting = await settingsRepository.findByKey('certificate_prefix');
    const prefix = prefixSetting?.setting_value || 'CERT';
    const certificateNumber = await generateCertificateNumber(prefix);

    let template = null;
    if (data.template_id) {
      template = await templateRepository.findById(data.template_id);
    } else {
      template = await templateRepository.findDefault('certificate', data.type);
    }
    if (!template) {
      throw new ValidationError('No certificate template found for this type');
    }

    const qrSetting = await settingsRepository.findByKey('enable_qr_verification');
    const includeQr = qrSetting?.setting_value !== 'false';
    const issuedDate = data.issued_date || new Date().toISOString().split('T')[0];

    // Auto-fill: signatories, leave details, grading and movement order all resolve
    // from existing master data rather than being typed by the operator. Every authority
    // and every named faculty role becomes its own placeholder (see resolveAuthorityPlaceholders/
    // getFacultyPlaceholders) — the template controls which ones actually appear, nothing
    // is hardcoded into the renderer.
    const [authorityData, grading, leaveDetails, facultyPlaceholders] = await Promise.all([
      resolveAuthorityPlaceholders(data.course_id),
      getPracticalGrade(data.participant_id, data.course_id),
      getLeaveDetailsText(data.participant_id, data.course_id),
      getFacultyPlaceholders(data.course_id),
    ]);
    const { director, associateDirector, courseDirector } = authorityData;

    const templateData = {
      participant_name: `${participant.first_name} ${participant.last_name}`,
      rank: participant.rank_name || '',
      military_rank: participant.rank_name || '',
      service_number: participant.service_number,
      department: participant.department_name || '',
      unit: participant.unit_address || '',
      course_name: course.name,
      course_code: course.code,
      start_date: course.start_date || '',
      end_date: course.end_date || '',
      certificate_number: certificateNumber,
      issued_date: issuedDate,
      type: data.type,
      grading: grading || '',
      remarks: data.remarks || '',
      sos_date: course.end_date || '',
      leave_details: leaveDetails,
      movement_order_reference: participant.movement_order_number || '',
      rtu_reason: data.rtu_reason || '',
      // The 3 built-in roles always resolve to at least an empty string — even when no
      // signatory is currently assigned — so a template referencing {{director_name}} never
      // shows a literal unresolved placeholder (replaceTemplatePlaceholders only substitutes
      // keys that are present at all). Any OTHER authority_type (built-in or custom) present
      // for this course, plus any individually-named faculty role (e.g.
      // {{faculty_chief_instructor_name}}), is added on top — see resolveAuthorityPlaceholders/
      // getFacultyPlaceholders. Templates opt into whichever of these they reference; nothing
      // is drawn unless the template's own content calls for it.
      director_name: '', director_rank: '',
      associate_director_name: '', associate_director_rank: '',
      course_director_name: '', course_director_rank: '',
      ...authorityData.placeholders,
      ...facultyPlaceholders,
    };

    const qrData = `${config.app.apiUrl}/api/certificates/verify/${certificateNumber}`;
    templateData.qr_verification_url = qrData;

    let pdfFilePath = null;
    let docxFilePath = null;

    if (template.source_format === 'docx' && template.docx_path) {
      // Master-template pipeline: fill the original .docx (preserving every run's
      // formatting) and convert that exact file to PDF — never rebuilt from HTML.
      const baseName = certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const result = await generateFromDocxTemplate(template.docx_path, templateData, baseName);
      docxFilePath = result.docxPath;
      pdfFilePath = result.pdfPath;
      if (result.pdfError) {
        logger.warn(`Certificate ${certificateNumber}: DOCX generated, PDF conversion unavailable (${result.pdfError})`);
      }
    } else {
      const pdf = await generateCertificatePdf(template.content, templateData, { includeQr, qrData });
      pdfFilePath = pdf.filePath;
    }

    let certificate;
    try {
      certificate = await certificateRepository.create({
        certificate_number: certificateNumber,
        participant_id: data.participant_id,
        course_id: data.course_id,
        type: data.type,
        template_id: template.id,
        issued_date: issuedDate,
        qr_code_data: qrData,
        file_path: pdfFilePath,
        docx_file_path: docxFilePath,
        remarks: data.remarks,
        grading,
        sos_date: course.end_date || null,
        rtu_reason: data.type === 'returned_to_unit' ? (data.rtu_reason || null) : null,
        movement_order_reference: participant.movement_order_number || null,
        director_authority_id: director?.id || null,
        associate_director_authority_id: associateDirector?.id || null,
        course_director_authority_id: courseDirector?.id || null,
        issued_by: issuedBy.id,
      });
    } catch (error) {
      // The DOCX/PDF were already written to permanent storage above; if the DB
      // row fails (e.g. a certificate_number collision), don't leave orphan files behind.
      [pdfFilePath, docxFilePath].forEach((p) => { if (p && fs.existsSync(p)) fs.unlinkSync(p); });
      throw error;
    }

    if (participant.user_id) {
      await notificationRepository.create({
        user_id: participant.user_id,
        title: 'Certificate Issued',
        message: `Your ${data.type} certificate (${certificateNumber}) has been issued.`,
        type: 'success',
        link: '/my-certificates',
      });

      const user = await userRepository.findById(participant.user_id);
      if (user?.email) {
        try {
          await sendCertificateEmail(user, certificate);
        } catch {
          // non-blocking
        }
      }
    }

    return certificate;
  },

  async delete(id) {
    const cert = await certificateRepository.findById(id);
    if (!cert) throw new NotFoundError('Certificate not found');
    await certificateRepository.delete(id);
    if (cert.file_path && fs.existsSync(cert.file_path)) {
      fs.unlinkSync(cert.file_path);
    }
    return { message: 'Certificate deleted successfully' };
  },

  /**
   * Resolves the target participant list for a bulk operation: an explicit
   * participant_ids list wins; otherwise "everyone enrolled in this course"
   * (via course_enrollments — the actual many-to-many relation, not the
   * participants.course_id column, since a participant's course_id can be
   * reassigned independently of their enrollment history), optionally
   * narrowed to one department.
   */
  async resolveBulkParticipants({ course_id, department_id, participant_ids }) {
    if (participant_ids?.length) {
      const uniqueIds = [...new Set(participant_ids)];
      const found = await Promise.all(uniqueIds.map((id) => participantRepository.findById(id)));
      const missingIds = uniqueIds.filter((id, i) => !found[i]);
      return { participants: found.filter(Boolean), missingIds };
    }

    const enrollments = await courseRepository.getEnrollments(course_id);
    const enrolledIds = [...new Set(enrollments.map((e) => e.participant_id))];
    if (!enrolledIds.length) return { participants: [], missingIds: [] };

    const found = await Promise.all(enrolledIds.map((id) => participantRepository.findById(id)));
    let participants = found.filter(Boolean);
    if (department_id) {
      participants = participants.filter((p) => String(p.department_id) === String(department_id));
    }
    return { participants, missingIds: [] };
  },

  async bulkGenerate(data, issuedBy) {
    let participantIds = data.participant_ids;
    const results = { generated: [], failed: [] };
    if (!participantIds?.length) {
      const { participants } = await this.resolveBulkParticipants(data);
      participantIds = participants.map((p) => p.id);
    }

    for (const pid of participantIds) {
      try {
        const cert = await this.generate(
          { ...data, participant_id: pid },
          issuedBy
        );
        results.generated.push(cert);
      } catch (error) {
        results.failed.push({ participant_id: pid, error: error.message });
      }
    }
    return results;
  },

  /**
   * Same DOCX-master pipeline as generate()/bulkGenerate() — this only adds ZIP
   * bundling on top. Certificates are generated first (so failures are known and
   * counted before any response bytes are sent), then streamed as a single ZIP:
   *   CourseCode/001_First_Last.pdf                          (flat)
   *   CourseCode/Department_Name/001_First_Last.pdf          (group_by_department: true)
   * A _summary.txt is included in the archive, and generated/failed counts are also
   * exposed via response headers so the frontend can show them without opening the zip.
   */
  async bulkGenerateZip(data, issuedBy, res) {
    const course = await courseRepository.findById(data.course_id);
    if (!course) throw new NotFoundError('Course not found');

    const { participants, missingIds } = await this.resolveBulkParticipants(data);
    if (!participants.length && !missingIds.length) {
      throw new ValidationError('No participants match the selected course/department/participant list');
    }

    const results = {
      generated: [],
      failed: missingIds.map((id) => ({ participant_id: id, error: 'Participant not found' })),
    };
    const entries = [];
    let seq = 1;
    for (const participant of participants) {
      try {
        const cert = await this.generate({ ...data, participant_id: participant.id }, issuedBy);
        const sourcePath = cert.file_path || cert.docx_file_path;
        const ext = cert.file_path ? 'pdf' : 'docx';
        if (!sourcePath || !fs.existsSync(sourcePath)) {
          throw new Error('Generated certificate file is missing on disk');
        }
        const fileBase = `${String(seq).padStart(3, '0')}_${sanitizeFilename(`${participant.first_name}_${participant.last_name}`)}`;
        const folder = data.group_by_department
          ? `${sanitizeFilename(course.code || course.name)}/${sanitizeFilename(participant.department_name || 'Unassigned')}`
          : sanitizeFilename(course.code || course.name);
        entries.push({ sourcePath, entryName: `${folder}/${fileBase}.${ext}` });
        results.generated.push({ participant_id: participant.id, certificate_number: cert.certificate_number });
        seq += 1;
      } catch (error) {
        results.failed.push({ participant_id: participant.id, error: error.message });
      }
    }

    const summaryLines = [
      `Course: ${course.name} (${course.code})`,
      `Certificate Type: ${data.type}`,
      `Successfully Generated: ${results.generated.length}`,
      `Failed: ${results.failed.length}`,
      '',
      ...results.failed.map((f) => `Participant ${f.participant_id}: ${f.error}`),
    ];

    const zipFolder = sanitizeFilename(course.code || course.name);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFolder}_certificates.zip"`);
    res.setHeader('X-Certificates-Generated', String(results.generated.length));
    res.setHeader('X-Certificates-Failed', String(results.failed.length));
    res.setHeader('Access-Control-Expose-Headers', 'X-Certificates-Generated, X-Certificates-Failed');

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => { logger.error(`ZIP archive error: ${err.message}`); res.destroy(err); });
    archive.pipe(res);
    entries.forEach(({ sourcePath, entryName }) => archive.file(sourcePath, { name: entryName }));
    archive.append(summaryLines.join('\n'), { name: `${zipFolder}/_summary.txt` });

    try {
      await archive.finalize();
    } catch (error) {
      // finalize() rejects on the same underlying error the 'error' listener above
      // already handled (which destroyed the response). Only re-throw (letting
      // asyncHandler/errorHandler write a JSON error) if headers were never sent —
      // otherwise the global error handler would try to write to a dead connection.
      logger.error(`ZIP finalize failed: ${error.message}`);
      if (!res.headersSent) throw error;
      return results;
    }

    return results;
  },

  async exportList(query) {
    const rows = await certificateRepository.findAllForExport({
      search: query.search, type: query.type, course_id: query.course_id, participant_id: query.participant_id,
    });
    return rows.map((r) => ({
      certificate_number: r.certificate_number,
      participant_id: r.participant_id,
      participant_name: `${r.first_name} ${r.last_name}`,
      course_name: r.course_name,
      department_name: r.department_name || '',
      type: r.type,
      issued_date: formatExportDate(r.issued_date),
      status: 'Issued',
    }));
  },

  async exportExcel(query) {
    const rows = await this.exportList(query);
    return buildExcelBuffer({ sheetName: 'Certificates', columns: CERTIFICATE_EXPORT_COLUMNS, rows });
  },

  async exportPdf(query, res) {
    const rows = await this.exportList(query);
    const filterSummaryLines = buildFilterSummary({
      'Certificate Type': query.type, Course: query.course_id ? rows[0]?.course_name : undefined, Search: query.search,
    });
    streamTablePdfToResponse(res, 'Certificate Report', CERTIFICATE_EXPORT_COLUMNS, rows, { filterSummaryLines });
  },
};

export default certificateService;
