import { useEffect, useState, useCallback } from 'react';
import api, { downloadFile } from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import RichTextEditor from '../components/RichTextEditor';
import { toast } from 'react-toastify';

function DocumentListPage({ title, subtitle, endpoint, fields, templateType = null, participantView = false, courseId = null, embedded = false }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/${endpoint}`, { params: { page, limit: 10, course_id: courseId || undefined } });
      setItems(data.data);
      setPagination(data.pagination);
    } catch { toast.error(`Failed to load ${endpoint}`); }
    setLoading(false);
  }, [endpoint, page, courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!participantView && !courseId) {
      api.get('/courses', { params: { limit: 100 } }).then((r) => setCourses(r.data.data));
    }
  }, [participantView, courseId]);

  const visibleFields = courseId ? fields.filter((f) => f.name !== 'course_id') : fields;

  const initForm = async () => {
    const f = {};
    fields.forEach((field) => { f[field.name] = field.default || ''; });
    if (courseId) f.course_id = courseId;

    if (templateType && fields.some((field) => field.name === 'content')) {
      try {
        const { data } = await api.get('/templates', { params: { type: templateType } });
        const defaultTemplate = data.data.find((t) => t.is_default) || data.data[0];
        if (defaultTemplate) f.content = defaultTemplate.content;
      } catch {
        // no default template configured — fall back to blank content
      }
    }

    setForm(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/${endpoint}`, form);
      toast.success('Created successfully');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const handlePdf = (id, name) => {
    downloadFile(`/${endpoint}/${id}/pdf`, `${name}.pdf`).catch(() => toast.error('Download failed'));
  };

  const importFields = visibleFields.filter((f) => f.type !== 'richtext');

  const openImportModal = () => {
    const f = {};
    importFields.forEach((field) => { f[field.name] = field.default || ''; });
    if (courseId) f.course_id = courseId;
    setImportForm(f);
    setImportFile(null);
    setShowImportModal(true);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please select a .docx file');
      return;
    }
    const formData = new FormData();
    Object.entries(importForm).forEach(([key, value]) => formData.append(key, value));
    formData.append('file', importFile);
    setImporting(true);
    try {
      await api.post(`/${endpoint}/import-docx`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Imported successfully');
      setShowImportModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import document');
    }
    setImporting(false);
  };

  return (
    <div>
      {!embedded && <h1 className="page-title">{title}</h1>}
      {!embedded && <p className="page-subtitle">{subtitle}</p>}

      {!participantView && (
        <div className="toolbar">
          <div />
          <div className="toolbar-right">
            {endpoint === 'calendars' && (
              <>
                <button className={`btn btn-secondary ${embedded ? 'btn-sm' : ''}`}
                  onClick={() => downloadFile('/calendars/export/excel', 'calendars.xlsx', { params: { course_id: courseId || undefined } }).catch(() => toast.error('Export failed'))}>
                  Export Excel
                </button>
                <button className={`btn btn-secondary ${embedded ? 'btn-sm' : ''}`}
                  onClick={() => downloadFile('/calendars/export/pdf', 'calendars.pdf', { params: { course_id: courseId || undefined } }).catch(() => toast.error('Export failed'))}>
                  Export PDF
                </button>
              </>
            )}
            <button className={`btn btn-secondary ${embedded ? 'btn-sm' : ''}`} onClick={openImportModal}>
              Import from Word
            </button>
            <button className={`btn btn-primary ${embedded ? 'btn-sm' : ''}`} onClick={async () => { await initForm(); setShowModal(true); }}>
              + Create New
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : items.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    {endpoint !== 'circulars' && !courseId && <th>Course</th>}
                    {endpoint === 'circulars' && <th>Reference</th>}
                    {endpoint === 'circulars' && <th>Status</th>}
                    {endpoint === 'calendars' && <th>Year</th>}
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong></td>
                      {endpoint !== 'circulars' && !courseId && <td>{item.course_name}</td>}
                      {endpoint === 'circulars' && <td>{item.reference_number || '—'}</td>}
                      {endpoint === 'circulars' && <td><StatusBadge status={item.status} /></td>}
                      {endpoint === 'calendars' && <td>{item.year}</td>}
                      <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePdf(item.id, item.title)}>
                          Download PDF
                        </button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Create ${title}`} size="modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {visibleFields.map((field) => (
              <div className="form-group" key={field.name}>
                <label className="form-label">{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'select' ? (
                  <select className="form-select" required={field.required} value={form[field.name]}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}>
                    <option value="">Select...</option>
                    {(field.options || courses).map((opt) => (
                      <option key={opt.id || opt.value} value={opt.id || opt.value}>
                        {opt.name || opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'richtext' ? (
                  <RichTextEditor value={form[field.name]} onChange={(v) => setForm({ ...form, [field.name]: v })} />
                ) : field.type === 'textarea' ? (
                  <textarea className="form-textarea" required={field.required} value={form[field.name]}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
                ) : (
                  <input className="form-input" required={field.required} type={field.type || 'text'}
                    value={form[field.name]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title={`Import ${title} from Word`} size="modal-lg">
        <form onSubmit={handleImportSubmit}>
          <div className="modal-body">
            <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
              Upload a .docx file — its content will be converted and used as the {title.toLowerCase()} content.
            </p>
            {importFields.map((field) => (
              <div className="form-group" key={field.name}>
                <label className="form-label">{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'select' ? (
                  <select className="form-select" required={field.required} value={importForm[field.name] || ''}
                    onChange={(e) => setImportForm({ ...importForm, [field.name]: e.target.value })}>
                    <option value="">Select...</option>
                    {(field.options || courses).map((opt) => (
                      <option key={opt.id || opt.value} value={opt.id || opt.value}>
                        {opt.name || opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="form-input" required={field.required} type={field.type || 'text'}
                    value={importForm[field.name] || ''} onChange={(e) => setImportForm({ ...importForm, [field.name]: e.target.value })} />
                )}
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Word Document (.docx) *</label>
              <input className="form-input" type="file" accept=".docx" required
                onChange={(e) => setImportFile(e.target.files[0])} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={importing}>{importing ? 'Importing…' : 'Import'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function CircularsPage({ participantView, courseId, embedded }) {
  return (
    <DocumentListPage
      title={participantView ? 'My Circulars' : 'Course Circulars'}
      subtitle="Official circulars and announcements"
      endpoint="circulars"
      templateType="course_circular"
      participantView={participantView}
      courseId={courseId}
      embedded={embedded}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'reference_number', label: 'Reference Number' },
        { name: 'course_id', label: 'Course', type: 'select' },
        { name: 'content', label: 'Content', type: 'richtext', required: true },
        { name: 'status', label: 'Status', type: 'select', options: [
          { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' },
        ], default: 'draft' },
      ]}
    />
  );
}

export function SchedulesPage({ participantView }) {
  return (
    <DocumentListPage
      title={participantView ? 'My Schedules' : 'Course Schedules'}
      subtitle="Training schedules and session plans"
      endpoint="schedules"
      templateType="course_schedule"
      participantView={participantView}
      fields={[
        { name: 'course_id', label: 'Course', type: 'select', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'content', label: 'Schedule Content', type: 'richtext', required: true },
      ]}
    />
  );
}

export function CalendarsPage({ participantView, courseId, embedded }) {
  return (
    <DocumentListPage
      title={participantView ? 'My Calendars' : 'Course Calendars'}
      subtitle="Training calendars and timelines"
      endpoint="calendars"
      templateType="course_calendar"
      participantView={participantView}
      courseId={courseId}
      embedded={embedded}
      fields={[
        { name: 'course_id', label: 'Course', type: 'select', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'year', label: 'Year', type: 'number', default: new Date().getFullYear() },
        { name: 'content', label: 'Calendar Content', type: 'richtext', required: true },
      ]}
    />
  );
}

export default DocumentListPage;
