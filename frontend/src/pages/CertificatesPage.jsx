import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { downloadFile, extractErrorMessage } from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import { toast } from 'react-toastify';

const CERT_TYPES = [
  { value: 'completion', label: 'Completion' },
  { value: 'participation', label: 'Participation' },
  { value: 'detention', label: 'Detention' },
  { value: 'returned_to_unit', label: 'Returned To Unit' },
  { value: 'appreciation', label: 'Appreciation' },
];

const emptyBulkForm = {
  course_id: '', type: 'completion', template_id: '', department_id: '', group_by_department: false,
};

export default function CertificatesPage({ participantView = false, courseId = null, embedded = false }) {
  const [searchParams] = useSearchParams();
  const [certificates, setCertificates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [showModal, setShowModal] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [viewingCert, setViewingCert] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    participant_id: '', course_id: courseId || '', type: 'completion', template_id: '', remarks: '', rtu_reason: '',
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTokenRef = useRef(0);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ ...emptyBulkForm, course_id: courseId || '' });
  const [bulkParticipants, setBulkParticipants] = useState([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/certificates', {
        params: { page, limit: 10, course_id: courseId || undefined, search: search || undefined, type: typeFilter || undefined },
      });
      setCertificates(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load certificates'); }
    setLoading(false);
  }, [page, courseId, search, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!participantView) {
      api.get('/participants', { params: { limit: 500, course_id: courseId || undefined } }).then((r) => setParticipants(r.data.data));
      if (!courseId) api.get('/courses', { params: { limit: 100 } }).then((r) => setCourses(r.data.data));
      api.get('/templates', { params: { type: 'certificate' } }).then((r) => setTemplates(r.data.data));
      api.get('/lookups/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    }
  }, [participantView, courseId]);

  const templatesForType = templates.filter((t) => !t.certificate_type || t.certificate_type === form.type);
  const bulkTemplatesForType = templates.filter((t) => !t.certificate_type || t.certificate_type === bulkForm.type);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const payload = { ...form, template_id: form.template_id || undefined };
    try {
      await api.post('/certificates/generate', payload);
      toast.success('Certificate generated');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    }
  };

  const handleDownload = (id, number) => {
    downloadFile(`/certificates/${id}/download`, `${number}.pdf`).catch(() => toast.error('Download failed'));
  };

  const handleDownloadDocx = (id, number) => {
    downloadFile(`/certificates/${id}/download-docx`, `${number}.docx`).catch(() => toast.error('DOCX download failed'));
  };

  const handlePreview = async (id) => {
    const token = ++previewTokenRef.current;
    setPreviewLoading(true);
    try {
      const response = await api.get(`/certificates/${id}/preview`, { responseType: 'blob' });
      if (previewTokenRef.current !== token) return; // closed (or a newer preview started) while this was in flight
      const blob = new Blob([response.data], { type: 'application/pdf' });
      setPreviewUrl(window.URL.createObjectURL(blob));
    } catch {
      if (previewTokenRef.current === token) toast.error('Failed to load certificate preview');
    }
    if (previewTokenRef.current === token) setPreviewLoading(false);
  };

  const closePreview = () => {
    previewTokenRef.current += 1; // invalidate any in-flight preview fetch
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };

  const handleView = async (id) => {
    try {
      const { data } = await api.get(`/certificates/${id}`);
      setViewingCert(data.data);
    } catch { toast.error('Failed to load certificate details'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this certificate? This cannot be undone.')) return;
    try {
      await api.delete(`/certificates/${id}`);
      toast.success('Certificate deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete certificate');
    }
  };

  const handleListExport = async (format) => {
    try {
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const params = { search: search || undefined, type: typeFilter || undefined, course_id: courseId || undefined };
      await downloadFile(`/certificates/export/${format}`, `certificates.${ext}`, { params });
    } catch {
      toast.error('Export failed');
    }
  };

  // --- Bulk generation ---

  const openBulkModal = () => {
    setBulkForm({ ...emptyBulkForm, course_id: courseId || '' });
    setSelectedParticipantIds([]);
    setBulkResult(null);
    setShowBulkModal(true);
  };

  useEffect(() => {
    if (!showBulkModal || !bulkForm.course_id) { setBulkParticipants([]); return; }
    api.get('/participants', {
      params: { limit: 1000, course_id: bulkForm.course_id, department_id: bulkForm.department_id || undefined },
    }).then((r) => setBulkParticipants(r.data.data)).catch(() => setBulkParticipants([]));
  }, [showBulkModal, bulkForm.course_id, bulkForm.department_id]);

  const toggleParticipant = (id) => {
    setSelectedParticipantIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };
  const selectAllParticipants = () => setSelectedParticipantIds(bulkParticipants.map((p) => p.id));
  const deselectAllParticipants = () => setSelectedParticipantIds([]);

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    if (!bulkForm.course_id) { toast.error('Select a course'); return; }
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const payload = {
        course_id: Number(bulkForm.course_id),
        type: bulkForm.type,
        template_id: bulkForm.template_id || undefined,
        department_id: !selectedParticipantIds.length && bulkForm.department_id ? Number(bulkForm.department_id) : undefined,
        participant_ids: selectedParticipantIds.length ? selectedParticipantIds : undefined,
        group_by_department: bulkForm.group_by_department,
      };
      const course = courses.find((c) => String(c.id) === String(bulkForm.course_id)) || { code: 'certificates' };
      const response = await downloadFile(
        '/certificates/bulk-generate-zip',
        `${course.code || 'certificates'}.zip`,
        { method: 'post', data: payload, params: undefined }
      );
      const generated = Number(response.headers?.['x-certificates-generated'] || 0);
      const failed = Number(response.headers?.['x-certificates-failed'] || 0);
      setBulkResult({ generated, failed });
      toast.success(`Successfully Generated: ${generated} | Failed: ${failed}`);
      fetchData();
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'Bulk generation failed'));
    }
    setBulkSubmitting(false);
  };

  const bulkTargetLabel = useMemo(() => {
    if (selectedParticipantIds.length) return `${selectedParticipantIds.length} selected participant(s)`;
    if (bulkForm.department_id) {
      const dept = departments.find((d) => String(d.id) === String(bulkForm.department_id));
      return `All participants in ${dept?.name || 'department'}`;
    }
    return 'All participants enrolled in the course';
  }, [selectedParticipantIds, bulkForm.department_id, departments]);

  return (
    <div>
      {!embedded && <h1 className="page-title">{participantView ? 'My Certificates' : 'Certificate Management'}</h1>}
      {!embedded && (
        <p className="page-subtitle">
          {participantView ? 'View and download your certificates' : 'Generate and manage training certificates'}
        </p>
      )}

      {!participantView && (
        <div className="toolbar">
          <div className="toolbar-left">
            <input className="search-input" placeholder="Search certificate no., participant, service no..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select className="form-select" style={{ maxWidth: 180 }} value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {CERT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-secondary" onClick={() => handleListExport('excel')}>Export Excel</button>
            <button className="btn btn-secondary" onClick={() => handleListExport('pdf')}>Export PDF</button>
            <button className="btn btn-secondary" onClick={openBulkModal}>Bulk Generate</button>
            <button className={`btn btn-primary ${embedded ? 'btn-sm' : ''}`} onClick={() => setShowModal(true)}>+ Generate Certificate</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : certificates.length === 0 ? <EmptyState message="No certificates found" /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Certificate No.</th><th>Participant</th>{!courseId && <th>Course</th>}
                    <th>Type</th><th>Issued Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.certificate_number}</strong></td>
                      <td>{c.first_name} {c.last_name}</td>
                      {!courseId && <td>{c.course_name}</td>}
                      <td><StatusBadge status={c.type} /></td>
                      <td>{c.issued_date}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleView(c.id)}>Details</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePreview(c.id)}>Preview</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(c.id, c.certificate_number)}>
                          Download PDF
                        </button>{' '}
                        {c.docx_file_path && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadDocx(c.id, c.certificate_number)}>
                            Download DOCX
                          </button>
                        )}{' '}
                        {!participantView && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Certificate">
        <form onSubmit={handleGenerate}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Participant *</label>
              <select className="form-select" required value={form.participant_id}
                onChange={(e) => setForm({ ...form, participant_id: e.target.value })}>
                <option value="">Select participant</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.service_number} - {p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            {!courseId && (
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-select" required value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Certificate Type *</label>
              <select className="form-select" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, template_id: '' })}>
                {CERT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Template</label>
              <select className="form-select" value={form.template_id}
                onChange={(e) => setForm({ ...form, template_id: e.target.value })}>
                <option value="">Use default template</option>
                {templatesForType.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}{t.source_format === 'docx' ? ' [Word]' : ''}</option>
                ))}
              </select>
            </div>
            {form.type === 'returned_to_unit' && (
              <div className="form-group">
                <label className="form-label">Reason for RTU *</label>
                <textarea className="form-textarea" required value={form.rtu_reason}
                  onChange={(e) => setForm({ ...form, rtu_reason: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              Grading, leave record, movement order reference, assigned faculty, and Director / Associate Director /
              Course Director signatories are auto-filled from existing records — nothing else to type here.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Generate</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Generate Certificates" size="modal-lg">
        <form onSubmit={handleBulkGenerate}>
          <div className="modal-body">
            {!courseId && (
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-select" required value={bulkForm.course_id}
                  onChange={(e) => { setBulkForm({ ...bulkForm, course_id: e.target.value }); setSelectedParticipantIds([]); }}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Certificate Type *</label>
                <select className="form-select" value={bulkForm.type}
                  onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value, template_id: '' })}>
                  {CERT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Template</label>
                <select className="form-select" value={bulkForm.template_id}
                  onChange={(e) => setBulkForm({ ...bulkForm, template_id: e.target.value })}>
                  <option value="">Use default template</option>
                  {bulkTemplatesForType.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}{t.source_format === 'docx' ? ' [Word]' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department (optional)</label>
                <select className="form-select" value={bulkForm.department_id}
                  onChange={(e) => { setBulkForm({ ...bulkForm, department_id: e.target.value }); setSelectedParticipantIds([]); }}>
                  <option value="">All departments</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400 }}>
                  <input type="checkbox" checked={bulkForm.group_by_department}
                    onChange={(e) => setBulkForm({ ...bulkForm, group_by_department: e.target.checked })} />
                  Group ZIP folders by department
                </label>
              </div>
            </div>

            {bulkForm.course_id && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Participants ({bulkParticipants.length}) — leave none selected to include all
                  </label>
                  <div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={selectAllParticipants}>Select All</button>{' '}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={deselectAllParticipants}>Deselect All</button>
                  </div>
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 6, marginTop: '0.5rem' }}>
                  {bulkParticipants.length === 0 ? (
                    <div style={{ padding: '0.75rem', color: 'var(--gray-500)' }}>No participants found for this course/department</div>
                  ) : bulkParticipants.map((p) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid var(--gray-100)' }}>
                      <input type="checkbox" checked={selectedParticipantIds.includes(p.id)} onChange={() => toggleParticipant(p.id)} />
                      {p.service_number} - {p.first_name} {p.last_name} {p.department_name ? `(${p.department_name})` : ''}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
              Target: <strong>{bulkTargetLabel}</strong>. Certificates are generated one by one using the same Word
              template pipeline as single generation, then bundled into a ZIP for download. If a certificate fails,
              the rest continue processing.
            </p>

            {bulkResult && (
              <div className="alert" style={{ background: 'var(--gray-50)', padding: '0.75rem', borderRadius: 6, marginTop: '0.5rem' }}>
                Successfully Generated: <strong>{bulkResult.generated}</strong> &nbsp;|&nbsp; Failed: <strong>{bulkResult.failed}</strong>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Close</button>
            <button type="submit" className="btn btn-primary" disabled={bulkSubmitting}>
              {bulkSubmitting ? 'Generating...' : 'Generate & Download ZIP'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(viewingCert)} onClose={() => setViewingCert(null)} title="Certificate Details">
        {viewingCert && (
          <div className="modal-body">
            <div className="form-row">
              <div><strong>Certificate No:</strong> {viewingCert.certificate_number}</div>
              <div><strong>Type:</strong> <StatusBadge status={viewingCert.type} /></div>
            </div>
            <div className="form-row">
              <div><strong>Participant:</strong> {viewingCert.first_name} {viewingCert.last_name} ({viewingCert.service_number})</div>
              <div><strong>Course:</strong> {viewingCert.course_name}</div>
            </div>
            <div className="form-row">
              <div><strong>Grading:</strong> {viewingCert.grading || '—'}</div>
              <div><strong>SOS Date:</strong> {viewingCert.sos_date || '—'}</div>
            </div>
            <div className="form-row">
              <div><strong>Movement Order Ref:</strong> {viewingCert.movement_order_reference || '—'}</div>
              <div><strong>Issued Date:</strong> {viewingCert.issued_date}</div>
            </div>
            {viewingCert.type === 'returned_to_unit' && (
              <div><strong>Reason for RTU:</strong> {viewingCert.rtu_reason || '—'}</div>
            )}
            <hr style={{ margin: '1rem 0' }} />
            <div className="form-row">
              <div><strong>Course Director:</strong> {viewingCert.course_director_name || '—'} {viewingCert.course_director_rank ? `(${viewingCert.course_director_rank})` : ''}</div>
              <div><strong>Associate Director:</strong> {viewingCert.associate_director_name || '—'} {viewingCert.associate_director_rank ? `(${viewingCert.associate_director_rank})` : ''}</div>
              <div><strong>Director:</strong> {viewingCert.director_name || '—'} {viewingCert.director_rank ? `(${viewingCert.director_rank})` : ''}</div>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setViewingCert(null)}>Close</button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(previewUrl) || previewLoading} onClose={closePreview} title="Certificate Preview" size="modal-lg">
        <div className="modal-body" style={{ minHeight: 400 }}>
          {previewLoading ? <LoadingSpinner /> : previewUrl ? (
            <iframe title="Certificate preview" src={previewUrl} style={{ width: '100%', height: '70vh', border: 'none' }} />
          ) : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closePreview}>Close</button>
        </div>
      </Modal>
    </div>
  );
}
