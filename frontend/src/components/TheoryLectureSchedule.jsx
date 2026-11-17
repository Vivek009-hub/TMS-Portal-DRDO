import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal } from './common';
import { toast } from 'react-toastify';

const emptyForm = {
  topic: '', sessions: 1, faculty_id: '',
  confirmed_by_faculty: '', alternate_faculty_id: '', reason_for_change: '',
  coordinator_authority_id: '', director_authority_id: '', associate_director_authority_id: '',
};

export default function TheoryLectureSchedule({ courseId }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [associateDirectors, setAssociateDirectors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/lecture-schedule`);
      setTopics(data.data);
    } catch { toast.error('Failed to load lecture schedule'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/faculty', { params: { limit: 100 } }).then((r) => setFaculty(r.data.data));
    api.get('/organization-authorities', { params: { authority_type: 'course_coordinator', course_id: courseId } }).then((r) => setCoordinators(r.data.data));
    api.get('/organization-authorities', { params: { authority_type: 'director', course_id: 'null' } }).then((r) => setDirectors(r.data.data));
    api.get('/organization-authorities', { params: { authority_type: 'associate_director', course_id: 'null' } }).then((r) => setAssociateDirectors(r.data.data));
  }, [courseId]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      topic: t.topic, sessions: t.sessions,
      faculty_id: t.faculty_id || '',
      confirmed_by_faculty: t.confirmed_by_faculty === null || t.confirmed_by_faculty === undefined ? '' : String(Boolean(t.confirmed_by_faculty)),
      alternate_faculty_id: t.alternate_faculty_id || '', reason_for_change: t.reason_for_change || '',
      coordinator_authority_id: t.coordinator_authority_id || '',
      director_authority_id: t.director_authority_id || '', associate_director_authority_id: t.associate_director_authority_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      sessions: Number(form.sessions) || 1,
      faculty_id: form.faculty_id || null,
      confirmed_by_faculty: form.confirmed_by_faculty === '' ? null : form.confirmed_by_faculty === 'true',
      alternate_faculty_id: form.alternate_faculty_id || null,
      reason_for_change: form.reason_for_change || null,
      coordinator_authority_id: form.coordinator_authority_id || null,
      director_authority_id: form.director_authority_id || null,
      associate_director_authority_id: form.associate_director_authority_id || null,
    };
    try {
      if (editingId) {
        await api.put(`/lecture-schedule/${editingId}`, payload);
        toast.success('Lecture topic updated');
      } else {
        await api.post(`/courses/${courseId}/lecture-schedule`, payload);
        toast.success('Lecture topic added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lecture topic');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lecture topic?')) return;
    try {
      await api.delete(`/lecture-schedule/${id}`);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="toolbar">
        <div />
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Topic</button>
      </div>

      {loading ? <LoadingSpinner /> : topics.length === 0 ? <EmptyState message="No lecture topics yet" /> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Topic</th><th>Sessions</th><th>Faculty</th><th>Confirmed</th><th>Alternate Faculty</th>
              <th>Coordinator</th><th>Director</th><th>Associate Director</th><th></th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.topic}</strong></td>
                <td>{t.sessions}</td>
                <td>{t.faculty_name ? `${t.faculty_name}${t.faculty_rank ? ` (${t.faculty_rank})` : ''}` : '—'}</td>
                <td>{t.confirmed_by_faculty === null || t.confirmed_by_faculty === undefined ? '—' : (t.confirmed_by_faculty ? 'Yes' : 'No')}</td>
                <td>{t.alternate_faculty_name || '—'}</td>
                <td>{t.coordinator_name || '—'}</td>
                <td>{t.director_name || '—'}</td>
                <td>{t.associate_director_name || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>Edit</button>{' '}
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Lecture Topic' : 'Add Lecture Topic'}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Topic *</label>
                <input className="form-input" required value={form.topic} onChange={(e) => setField('topic', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Sessions *</label>
                <input type="number" min="1" className="form-input" required value={form.sessions}
                  onChange={(e) => setField('sessions', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Faculty</label>
              <select className="form-select" value={form.faculty_id} onChange={(e) => setField('faculty_id', e.target.value)}>
                <option value="">Select faculty</option>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Confirmation by Faculty</label>
                <select className="form-select" value={form.confirmed_by_faculty} onChange={(e) => setField('confirmed_by_faculty', e.target.value)}>
                  <option value="">Not recorded</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Alternate Faculty</label>
                <select className="form-select" value={form.alternate_faculty_id} onChange={(e) => setField('alternate_faculty_id', e.target.value)}>
                  <option value="">Select alternate faculty</option>
                  {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Change</label>
              <input className="form-input" value={form.reason_for_change} onChange={(e) => setField('reason_for_change', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Coordinator</label>
              <select className="form-select" value={form.coordinator_authority_id} onChange={(e) => setField('coordinator_authority_id', e.target.value)}>
                <option value="">Select course coordinator</option>
                {coordinators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Director</label>
                <select className="form-select" value={form.director_authority_id} onChange={(e) => setField('director_authority_id', e.target.value)}>
                  <option value="">Select director</option>
                  {directors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Associate Director</label>
                <select className="form-select" value={form.associate_director_authority_id} onChange={(e) => setField('associate_director_authority_id', e.target.value)}>
                  <option value="">Select associate director</option>
                  {associateDirectors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Topic'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
