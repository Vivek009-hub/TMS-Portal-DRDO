import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal } from '../components/common';
import { toast } from 'react-toastify';

const emptyForm = { faculty_id: '', paper_setting: 0, theory_exam: 0, practical_exam: 0, evaluation: 0, transport: 0 };

export default function HonorariumPage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [faculty, setFaculty] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.get('/courses', { params: { limit: 100 } }).then((r) => {
      setCourses(r.data.data);
      if (r.data.data.length > 0) setCourseId(String(r.data.data[0].id));
    });
    api.get('/faculty', { params: { limit: 100 } }).then((r) => setFaculty(r.data.data));
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/honorarium`);
      setEntries(data.data);
    } catch { toast.error('Failed to load honorarium entries'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      faculty_id: entry.faculty_id, paper_setting: entry.paper_setting, theory_exam: entry.theory_exam,
      practical_exam: entry.practical_exam, evaluation: entry.evaluation, transport: entry.transport,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      faculty_id: Number(form.faculty_id),
      paper_setting: Number(form.paper_setting) || 0,
      theory_exam: Number(form.theory_exam) || 0,
      practical_exam: Number(form.practical_exam) || 0,
      evaluation: Number(form.evaluation) || 0,
      transport: Number(form.transport) || 0,
    };
    try {
      if (editingId) {
        await api.put(`/honorarium/${editingId}`, payload);
        toast.success('Entry updated');
      } else {
        await api.post(`/courses/${courseId}/honorarium`, payload);
        toast.success('Entry created');
      }
      setShowModal(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save entry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/honorarium/${id}`);
      fetchEntries();
    } catch { toast.error('Failed to delete entry'); }
  };

  return (
    <div>
      <h1 className="page-title">Honorarium</h1>
      <p className="page-subtitle">Faculty payment records per course</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={openCreate} disabled={!courseId}>+ Add Entry</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : entries.length === 0 ? <EmptyState message="No entries yet" /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faculty</th><th>Paper Setting</th><th>Theory Exam</th><th>Practical Exam</th>
                  <th>Evaluation</th><th>Transport</th><th>Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.faculty_name}</td>
                    <td>{e.paper_setting}</td>
                    <td>{e.theory_exam}</td>
                    <td>{e.practical_exam}</td>
                    <td>{e.evaluation}</td>
                    <td>{e.transport}</td>
                    <td><strong>{e.total}</strong></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)}>Edit</button>{' '}
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(e.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Entry' : 'Add Entry'}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Faculty *</label>
              <select className="form-select" required disabled={Boolean(editingId)} value={form.faculty_id}
                onChange={(e) => setField('faculty_id', e.target.value)}>
                <option value="">Select faculty</option>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Paper Setting</label>
                <input type="number" min="0" className="form-input" value={form.paper_setting}
                  onChange={(e) => setField('paper_setting', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Theory Exam</label>
                <input type="number" min="0" className="form-input" value={form.theory_exam}
                  onChange={(e) => setField('theory_exam', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Practical Exam</label>
                <input type="number" min="0" className="form-input" value={form.practical_exam}
                  onChange={(e) => setField('practical_exam', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Evaluation</label>
                <input type="number" min="0" className="form-input" value={form.evaluation}
                  onChange={(e) => setField('evaluation', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Transport</label>
              <input type="number" min="0" className="form-input" value={form.transport}
                onChange={(e) => setField('transport', e.target.value)} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total is calculated automatically.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Entry'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
