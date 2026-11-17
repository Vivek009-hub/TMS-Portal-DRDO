import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal } from '../components/common';
import { toast } from 'react-toastify';

const emptyForm = { deposit_date: '', amount_per_week: '', duration_weeks: '', strength: '' };

export default function RegimentalFundPage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
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
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/regimental-fund`);
      setEntries(data.data);
    } catch { toast.error('Failed to load regimental fund entries'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      deposit_date: entry.deposit_date?.slice(0, 10) || '',
      amount_per_week: entry.amount_per_week, duration_weeks: entry.duration_weeks, strength: entry.strength,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      deposit_date: form.deposit_date,
      amount_per_week: Number(form.amount_per_week),
      duration_weeks: Number(form.duration_weeks),
      strength: Number(form.strength),
    };
    try {
      if (editingId) {
        await api.put(`/regimental-fund/${editingId}`, payload);
        toast.success('Entry updated');
      } else {
        await api.post(`/courses/${courseId}/regimental-fund`, payload);
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
      await api.delete(`/regimental-fund/${id}`);
      fetchEntries();
    } catch { toast.error('Failed to delete entry'); }
  };

  return (
    <div>
      <h1 className="page-title">Regimental Fund</h1>
      <p className="page-subtitle">Track weekly regimental fund collections per course</p>

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
                  <th>Deposit Date</th><th>Amount/Week</th><th>Duration (weeks)</th>
                  <th>Strength</th><th>Total Collection</th><th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.deposit_date?.slice(0, 10)}</td>
                    <td>{e.amount_per_week}</td>
                    <td>{e.duration_weeks}</td>
                    <td>{e.strength}</td>
                    <td><strong>{e.total_collection}</strong></td>
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
              <label className="form-label">Deposit Date *</label>
              <input type="date" className="form-input" required value={form.deposit_date}
                onChange={(e) => setField('deposit_date', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount per Week *</label>
                <input type="number" min="0" className="form-input" required value={form.amount_per_week}
                  onChange={(e) => setField('amount_per_week', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (weeks) *</label>
                <input type="number" min="1" className="form-input" required value={form.duration_weeks}
                  onChange={(e) => setField('duration_weeks', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Strength *</label>
              <input type="number" min="0" className="form-input" required value={form.strength}
                onChange={(e) => setField('strength', e.target.value)} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              Total Collection is calculated automatically as Amount/Week × Duration × Strength.
            </p>
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
