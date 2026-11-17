import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner } from '../components/common';
import { toast } from 'react-toastify';

const emptyForm = {
  distribution_date: '', first_in_merit_participant_id: '', second_in_merit_participant_id: '',
  third_in_merit_participant_id: '', course_senior_participant_id: '',
};

export default function MementoesUtilisationPage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.get('/courses', { params: { limit: 100 } }).then((r) => {
      setCourses(r.data.data);
      if (r.data.data.length > 0) setCourseId(String(r.data.data[0].id));
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [record, roster] = await Promise.all([
        api.get(`/courses/${courseId}/mementoes-utilisation`),
        api.get('/participants', { params: { course_id: courseId, limit: 200 } }),
      ]);
      setParticipants(roster.data.data);
      const d = record.data.data;
      setForm(d ? {
        distribution_date: d.distribution_date?.slice(0, 10) || '',
        first_in_merit_participant_id: d.first_in_merit_participant_id || '',
        second_in_merit_participant_id: d.second_in_merit_participant_id || '',
        third_in_merit_participant_id: d.third_in_merit_participant_id || '',
        course_senior_participant_id: d.course_senior_participant_id || '',
      } : emptyForm);
    } catch { toast.error('Failed to load mementoes utilisation record'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/mementoes-utilisation`, {
        distribution_date: form.distribution_date || null,
        first_in_merit_participant_id: form.first_in_merit_participant_id || null,
        second_in_merit_participant_id: form.second_in_merit_participant_id || null,
        third_in_merit_participant_id: form.third_in_merit_participant_id || null,
        course_senior_participant_id: form.course_senior_participant_id || null,
      });
      toast.success('Mementoes utilisation record saved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const selectedCourse = courses.find((c) => String(c.id) === String(courseId));
  const participantLabel = (p) => `${p.first_name} ${p.last_name} (${p.service_number})`;

  const merits = [
    { field: 'first_in_merit_participant_id', label: 'First in Merit' },
    { field: 'second_in_merit_participant_id', label: 'Second in Merit' },
    { field: 'third_in_merit_participant_id', label: 'Third in Merit' },
    { field: 'course_senior_participant_id', label: 'Course Senior' },
  ];

  return (
    <div>
      <h1 className="page-title">Mementoes Utilisation Certificate</h1>
      <p className="page-subtitle">Record merit rankings and course senior for a course's mementoes distribution</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{selectedCourse ? `${selectedCourse.name} (${selectedCourse.code})` : 'Mementoes Utilisation'}</h3>
        </div>
        <div className="card-body">
          {loading ? <LoadingSpinner /> : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Distribution Date</label>
                <input type="date" className="form-input" value={form.distribution_date}
                  onChange={(e) => setField('distribution_date', e.target.value)} />
              </div>
              {merits.map((m) => (
                <div className="form-group" key={m.field}>
                  <label className="form-label">{m.label}</label>
                  <select className="form-select" value={form[m.field]} onChange={(e) => setField(m.field, e.target.value)}>
                    <option value="">Select participant</option>
                    {participants.map((p) => <option key={p.id} value={p.id}>{participantLabel(p)}</option>)}
                  </select>
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={saving || !courseId}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
