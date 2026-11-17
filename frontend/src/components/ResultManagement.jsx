import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal } from './common';
import { toast } from 'react-toastify';

const INNER_TABS = ['Theory Marks', 'Practical Marks', 'Practical Breakup', 'Conduct & Keenness', 'Attendance & Leave', 'Result Sheet'];
const PRACTICAL_COMPONENTS = [
  { key: 'pump_drill', label: 'Pump Drill' },
  { key: 'ba_set', label: 'BA Set' },
  { key: 'hose', label: 'Hose' },
  { key: 'ert', label: 'ERT' },
  { key: 'viva', label: 'Viva' },
  { key: 'class_notes', label: 'Class Notes' },
  { key: 'station_duty', label: 'Station Duty' },
  { key: 'conduct_keenness', label: 'Conduct & Keenness' },
];

function TheoryMarks({ courseId, examCategory = 'theory' }) {
  const [examType, setExamType] = useState('midterm');
  const [rows, setRows] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/exam-results`, { params: { exam_category: examCategory, exam_type: examType } });
      setRows(data.data);
    } catch { toast.error('Failed to load exam results'); }
    setLoading(false);
  }, [courseId, examCategory, examType]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { api.get('/faculty', { params: { limit: 100 } }).then((r) => setFaculty(r.data.data)); }, []);

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      max_marks: row.max_marks ?? 100, passing_marks: row.passing_marks ?? 40,
      examiner_id: row.examiner_id || '', invigilator_id: row.invigilator_id || '',
      exam_date: row.exam_date?.slice(0, 10) || '', marks_obtained: row.marks_obtained ?? '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/exam-results`, {
        participant_id: editing.participant_id, exam_category: examCategory, exam_type: examType,
        ...form,
        examiner_id: form.examiner_id || null, invigilator_id: form.invigilator_id || null,
        exam_date: form.exam_date || null, marks_obtained: form.marks_obtained === '' ? null : Number(form.marks_obtained),
      });
      toast.success('Marks saved');
      setEditing(null);
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['midterm', 'final'].map((t) => (
          <button key={t} type="button" className={`btn btn-sm ${examType === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setExamType(t)}>{t === 'midterm' ? 'Midterm' : 'Final'}</button>
        ))}
      </div>
      {loading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState message="No participants in this course" /> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Participant</th><th>Max Marks</th><th>Passing Marks</th>
              <th>Examiner</th><th>Invigilator</th><th>Exam Date</th><th>Marks</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.participant_id}>
                <td>{row.service_number} - {row.first_name} {row.last_name}</td>
                <td>{row.max_marks ?? '—'}</td>
                <td>{row.passing_marks ?? '—'}</td>
                <td>{row.examiner_name || '—'}</td>
                <td>{row.invigilator_name || '—'}</td>
                <td>{row.exam_date?.slice(0, 10) || '—'}</td>
                <td>{row.marks_obtained ?? '—'}</td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={`${examType === 'midterm' ? 'Midterm' : 'Final'} Marks`}>
        {editing && (
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{editing.first_name} {editing.last_name} ({editing.service_number})</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Marks</label>
                  <input type="number" className="form-input" value={form.max_marks}
                    onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Passing Marks</label>
                  <input type="number" className="form-input" value={form.passing_marks}
                    onChange={(e) => setForm({ ...form, passing_marks: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Examiner</label>
                  <select className="form-select" value={form.examiner_id} onChange={(e) => setForm({ ...form, examiner_id: e.target.value })}>
                    <option value="">Select examiner</option>
                    {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Invigilator</label>
                  <select className="form-select" value={form.invigilator_id} onChange={(e) => setForm({ ...form, invigilator_id: e.target.value })}>
                    <option value="">Select invigilator</option>
                    {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Exam Date</label>
                  <input type="date" className="form-input" value={form.exam_date}
                    onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Marks Obtained</label>
                  <input type="number" className="form-input" value={form.marks_obtained}
                    onChange={(e) => setForm({ ...form, marks_obtained: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function PracticalBreakup({ courseId }) {
  const [examType, setExamType] = useState('midterm');
  const [rows, setRows] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/practical-breakup`, { params: { exam_type: examType } });
      setRows(data.data);
    } catch { toast.error('Failed to load practical breakup'); }
    setLoading(false);
  }, [courseId, examType]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { api.get('/faculty', { params: { limit: 100 } }).then((r) => setFaculty(r.data.data)); }, []);

  const updateField = (participantId, key, value) => {
    setRows((prev) => prev.map((r) => r.participant_id === participantId ? { ...r, [key]: value } : r));
  };

  const saveRow = async (row) => {
    setSavingId(row.participant_id);
    try {
      const payload = {
        participant_id: row.participant_id, exam_type: examType,
        examiner_id: row.examiner_id || null, invigilator_id: row.invigilator_id || null, invigilator2_id: row.invigilator2_id || null,
      };
      PRACTICAL_COMPONENTS.forEach((c) => { payload[c.key] = Number(row[c.key]) || 0; });
      await api.post(`/courses/${courseId}/practical-breakup`, payload);
      toast.success('Practical marks saved');
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSavingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['midterm', 'final'].map((t) => (
          <button key={t} type="button" className={`btn btn-sm ${examType === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setExamType(t)}>{t === 'midterm' ? 'Midterm' : 'Final'}</button>
        ))}
      </div>
      {loading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState message="No participants in this course" /> : (
        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th>Participant</th><th>Examiner</th><th>Invigilator</th><th>Invigilator 2</th>
                {PRACTICAL_COMPONENTS.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Avg</th><th>Total</th><th>%</th><th>Grade</th><th>Rank</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.participant_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{row.first_name} {row.last_name}</td>
                  <td>
                    <select className="form-select" style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                      value={row.examiner_id || ''} onChange={(e) => updateField(row.participant_id, 'examiner_id', e.target.value)}>
                      <option value="">—</option>
                      {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="form-select" style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                      value={row.invigilator_id || ''} onChange={(e) => updateField(row.participant_id, 'invigilator_id', e.target.value)}>
                      <option value="">—</option>
                      {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="form-select" style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                      value={row.invigilator2_id || ''} onChange={(e) => updateField(row.participant_id, 'invigilator2_id', e.target.value)}>
                      <option value="">—</option>
                      {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </td>
                  {PRACTICAL_COMPONENTS.map((c) => (
                    <td key={c.key}>
                      <input type="number" min="0" max="100" className="form-input" style={{ width: 60, padding: '0.25rem', fontSize: '0.75rem' }}
                        value={row[c.key] ?? ''} onChange={(e) => updateField(row.participant_id, c.key, e.target.value)} />
                    </td>
                  ))}
                  <td>{row.average ?? '—'}</td>
                  <td>{row.total ?? '—'}</td>
                  <td>{row.percentage ?? '—'}</td>
                  <td>{row.grade || '—'}</td>
                  <td>{row.rank_position || '—'}</td>
                  <td>
                    <button className="btn btn-primary btn-sm" disabled={savingId === row.participant_id} onClick={() => saveRow(row)}>
                      {savingId === row.participant_id ? '...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConductKeenness({ courseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/conduct-keenness`);
      setRows(data.data.map((r) => ({ ...r, evaluation_date: r.evaluation_date?.slice(0, 10) || '', max_marks: r.max_marks ?? 20 })));
    } catch { toast.error('Failed to load conduct & keenness evaluation'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const updateField = (participantId, key, value) => {
    setRows((prev) => prev.map((r) => r.participant_id === participantId ? { ...r, [key]: value } : r));
  };

  const saveRow = async (row) => {
    setSavingId(row.participant_id);
    try {
      await api.post(`/courses/${courseId}/conduct-keenness`, {
        participant_id: row.participant_id,
        max_marks: row.max_marks === '' ? null : Number(row.max_marks),
        eval_by_course_director: row.eval_by_course_director === '' || row.eval_by_course_director == null ? null : Number(row.eval_by_course_director),
        eval_by_course_coordinator: row.eval_by_course_coordinator === '' || row.eval_by_course_coordinator == null ? null : Number(row.eval_by_course_coordinator),
        eval_by_ic_practical_drills: row.eval_by_ic_practical_drills === '' || row.eval_by_ic_practical_drills == null ? null : Number(row.eval_by_ic_practical_drills),
        evaluation_date: row.evaluation_date || null,
      });
      toast.success('Conduct & Keenness evaluation saved');
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSavingId(null);
  };

  if (loading) return <LoadingSpinner />;
  if (rows.length === 0) return <EmptyState message="No participants in this course" />;

  return (
    <div className="table-container">
      <table className="data-table" style={{ fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th>Participant</th><th>Max Marks</th>
            <th>Course Director</th><th>Course Coordinator</th><th>I/C Practical Drills</th>
            <th>Average</th><th>Evaluation Date</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.participant_id}>
              <td style={{ whiteSpace: 'nowrap' }}>{row.service_number} - {row.first_name} {row.last_name}</td>
              <td><input type="number" min="0" className="form-input" style={{ width: 70 }}
                value={row.max_marks ?? ''} onChange={(e) => updateField(row.participant_id, 'max_marks', e.target.value)} /></td>
              <td><input type="number" min="0" className="form-input" style={{ width: 80 }}
                value={row.eval_by_course_director ?? ''} onChange={(e) => updateField(row.participant_id, 'eval_by_course_director', e.target.value)} /></td>
              <td><input type="number" min="0" className="form-input" style={{ width: 80 }}
                value={row.eval_by_course_coordinator ?? ''} onChange={(e) => updateField(row.participant_id, 'eval_by_course_coordinator', e.target.value)} /></td>
              <td><input type="number" min="0" className="form-input" style={{ width: 80 }}
                value={row.eval_by_ic_practical_drills ?? ''} onChange={(e) => updateField(row.participant_id, 'eval_by_ic_practical_drills', e.target.value)} /></td>
              <td>{row.average_marks ?? '—'}</td>
              <td><input type="date" className="form-input" value={row.evaluation_date}
                onChange={(e) => updateField(row.participant_id, 'evaluation_date', e.target.value)} /></td>
              <td>
                <button className="btn btn-primary btn-sm" disabled={savingId === row.participant_id} onClick={() => saveRow(row)}>
                  {savingId === row.participant_id ? '...' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceLeave({ courseId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/attendance-evaluation`);
      setRows(data.data.map((r) => ({ ...r, evaluation_date: r.evaluation_date?.slice(0, 10) || '' })));
    } catch { toast.error('Failed to load attendance evaluation'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const updateField = (participantId, key, value) => {
    setRows((prev) => prev.map((r) => r.participant_id === participantId ? { ...r, [key]: value } : r));
  };

  const saveRow = async (row) => {
    setSavingId(row.participant_id);
    try {
      await api.post(`/courses/${courseId}/attendance-evaluation`, {
        participant_id: row.participant_id,
        no_of_leave_days: row.no_of_leave_days === '' ? null : Number(row.no_of_leave_days),
        attendance_marks: row.attendance_marks === '' ? null : Number(row.attendance_marks),
        evaluation_date: row.evaluation_date || null,
      });
      toast.success('Attendance evaluation saved');
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSavingId(null);
  };

  if (loading) return <LoadingSpinner />;
  if (rows.length === 0) return <EmptyState message="No participants in this course" />;

  return (
    <table className="data-table">
      <thead>
        <tr><th>Participant</th><th>No. of Leave Days</th><th>Attendance Marks</th><th>Evaluation Date</th><th></th></tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.participant_id}>
            <td>{row.service_number} - {row.first_name} {row.last_name}</td>
            <td><input type="number" min="0" className="form-input" style={{ width: 90 }}
              value={row.no_of_leave_days ?? ''} onChange={(e) => updateField(row.participant_id, 'no_of_leave_days', e.target.value)} /></td>
            <td><input type="number" min="0" max="100" className="form-input" style={{ width: 90 }}
              value={row.attendance_marks ?? ''} onChange={(e) => updateField(row.participant_id, 'attendance_marks', e.target.value)} /></td>
            <td><input type="date" className="form-input" value={row.evaluation_date}
              onChange={(e) => updateField(row.participant_id, 'evaluation_date', e.target.value)} /></td>
            <td>
              <button className="btn btn-primary btn-sm" disabled={savingId === row.participant_id} onClick={() => saveRow(row)}>
                {savingId === row.participant_id ? '...' : 'Save'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultSheet({ courseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${courseId}/result-sheet`)
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load result sheet'))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <LoadingSpinner />;
  if (!data || data.rows.length === 0) return <EmptyState message="No participants in this course" />;

  return (
    <div>
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => window.print()}>Print Result Sheet</button>
      </div>
      <h3 style={{ marginBottom: '0.5rem' }}>{data.course.name} ({data.course.code}) — Result Sheet</h3>
      <div className="table-container">
        <table className="data-table" style={{ fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th>Participant</th><th>Rank</th>
              <th>Midterm</th><th>Final</th>
              <th>Practical Total</th><th>Practical %</th><th>Grade</th><th>Practical Rank</th>
              <th>Leave Days</th><th>Attendance Marks</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.participant_id}>
                <td>{row.service_number} - {row.first_name} {row.last_name}</td>
                <td>{row.rank_name || '—'}</td>
                <td>{row.midterm_marks != null ? `${row.midterm_marks}/${row.midterm_max}` : '—'}</td>
                <td>{row.final_marks != null ? `${row.final_marks}/${row.final_max}` : '—'}</td>
                <td>{row.practical_total ?? '—'}</td>
                <td>{row.practical_percentage ?? '—'}</td>
                <td><strong>{row.practical_grade || '—'}</strong></td>
                <td>{row.practical_rank ?? '—'}</td>
                <td>{row.no_of_leave_days ?? '—'}</td>
                <td>{row.attendance_marks ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ResultManagement({ courseId }) {
  const [innerTab, setInnerTab] = useState('Theory Marks');

  return (
    <div>
      <div className="tabs">
        {INNER_TABS.map((t) => (
          <button key={t} type="button" className={`tab ${innerTab === t ? 'active' : ''}`} onClick={() => setInnerTab(t)}>{t}</button>
        ))}
      </div>
      {innerTab === 'Theory Marks' && <TheoryMarks courseId={courseId} examCategory="theory" />}
      {innerTab === 'Practical Marks' && <TheoryMarks courseId={courseId} examCategory="practical" />}
      {innerTab === 'Practical Breakup' && <PracticalBreakup courseId={courseId} />}
      {innerTab === 'Conduct & Keenness' && <ConductKeenness courseId={courseId} />}
      {innerTab === 'Attendance & Leave' && <AttendanceLeave courseId={courseId} />}
      {innerTab === 'Result Sheet' && <ResultSheet courseId={courseId} />}
    </div>
  );
}
