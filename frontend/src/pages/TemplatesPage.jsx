import { useEffect, useState } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal } from '../components/common';
import RichTextEditor from '../components/RichTextEditor';
import { toast } from 'react-toastify';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'course_calendar', name: '', content: '', certificate_type: '' });
  const [importForm, setImportForm] = useState({ type: 'certificate', name: '', certificate_type: '' });
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(data.data);
    } catch { toast.error('Failed to load templates'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (template) => {
    setEditing(template);
    setForm({
      type: template.type,
      name: template.name,
      content: template.content,
      certificate_type: template.certificate_type || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ type: 'course_calendar', name: '', content: '', certificate_type: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, certificate_type: form.type === 'certificate' ? (form.certificate_type || null) : null };
    try {
      if (editing) {
        await api.put(`/templates/${editing.id}`, payload);
        toast.success('Template updated');
      } else {
        await api.post('/templates', payload);
        toast.success('Template created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Template deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const typeLabels = {
    course_calendar: 'Course Calendar',
    course_schedule: 'Course Schedule',
    course_circular: 'Course Circular',
    certificate: 'Certificate',
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) { toast.error('Select a .docx file first'); return; }
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('type', importForm.type);
    formData.append('name', importForm.name);
    if (importForm.type === 'certificate' && importForm.certificate_type) {
      formData.append('certificate_type', importForm.certificate_type);
    }
    setImporting(true);
    try {
      await api.post('/templates/import-docx', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Template imported from Word document — review and refine it below');
      setShowImportModal(false);
      setImportFile(null);
      setImportForm({ type: 'certificate', name: '', certificate_type: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
    setImporting(false);
  };

  return (
    <div>
      <h1 className="page-title">Document Templates</h1>
      <p className="page-subtitle">Editable templates for calendars, schedules, circulars, and certificates</p>

      <div className="toolbar">
        <div />
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>Import from Word (.docx)</button>
          <button className="btn btn-primary" onClick={openCreate}>+ New Template</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <LoadingSpinner /> : templates.length === 0 ? <EmptyState /> : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Default</th><th>Updated</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td>{typeLabels[t.type] || t.type}</td>
                      <td>{t.is_default ? 'Yes' : 'No'}</td>
                      <td>{new Date(t.updated_at).toLocaleDateString()}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
        Certificate templates auto-fill from participant, course and organization records — use placeholders like{' '}
        {'{{participant_name}}'}, {'{{military_rank}}'}, {'{{course_name}}'}, {'{{certificate_number}}'}, {'{{issued_date}}'},{' '}
        {'{{grading}}'}, {'{{leave_details}}'}, {'{{movement_order_reference}}'}, {'{{director_name}}'},{' '}
        {'{{associate_director_name}}'}, {'{{course_director_name}}'}, {'{{rtu_reason}}'}, {'{{sos_date}}'}. Nothing needs to be typed manually.
      </p>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Template' : 'New Template'} size="modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Template Type *</label>
                <select className="form-select" value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            {form.type === 'certificate' && (
              <div className="form-group">
                <label className="form-label">Certificate Type</label>
                <select className="form-select" value={form.certificate_type}
                  onChange={(e) => setForm({ ...form, certificate_type: e.target.value })}>
                  <option value="">All types</option>
                  <option value="completion">Completion</option>
                  <option value="participation">Participation</option>
                  <option value="detention">Detention</option>
                  <option value="returned_to_unit">Returned To Unit</option>
                  <option value="appreciation">Appreciation</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Template Content *</label>
              <RichTextEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Template from Word (.docx)">
        <form onSubmit={handleImportSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
              Upload a .docx file — its formatting is converted into an editable template. You can then refine wording,
              placeholders and layout in the rich-text editor before it's used for generation.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Template Type *</label>
                <select className="form-select" value={importForm.type}
                  onChange={(e) => setImportForm({ ...importForm, type: e.target.value })}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" required value={importForm.name}
                  onChange={(e) => setImportForm({ ...importForm, name: e.target.value })} />
              </div>
            </div>
            {importForm.type === 'certificate' && (
              <div className="form-group">
                <label className="form-label">Certificate Type</label>
                <select className="form-select" value={importForm.certificate_type}
                  onChange={(e) => setImportForm({ ...importForm, certificate_type: e.target.value })}>
                  <option value="">All types</option>
                  <option value="completion">Completion</option>
                  <option value="participation">Participation</option>
                  <option value="detention">Detention</option>
                  <option value="returned_to_unit">Returned To Unit</option>
                  <option value="appreciation">Appreciation</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Word Document (.docx) *</label>
              <input type="file" className="form-input" accept=".docx" required
                onChange={(e) => setImportFile(e.target.files[0])} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={importing}>{importing ? 'Importing...' : 'Import'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
