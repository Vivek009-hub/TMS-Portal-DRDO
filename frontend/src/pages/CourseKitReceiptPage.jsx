import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState } from '../components/common';
import { toast } from 'react-toastify';

export default function CourseKitReceiptPage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

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
      const { data } = await api.get(`/courses/${courseId}/course-kit-receipt`);
      setEntries(data.data.map((row) => ({
        ...row,
        distribution_date: row.distribution_date?.slice(0, 10) || '',
        course_material: Boolean(row.course_material),
        course_kit: Boolean(row.course_kit),
        group_photo: Boolean(row.group_photo),
        remarks: row.remarks || '',
      })));
    } catch { toast.error('Failed to load course kit receipts'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const updateRow = (participantId, field, value) => {
    setEntries((rows) => rows.map((r) => r.participant_id === participantId ? { ...r, [field]: value } : r));
  };

  const saveRow = async (row) => {
    setSavingId(row.participant_id);
    try {
      await api.post(`/courses/${courseId}/course-kit-receipt`, {
        participant_id: row.participant_id,
        distribution_date: row.distribution_date || null,
        course_material: row.course_material,
        course_kit: row.course_kit,
        group_photo: row.group_photo,
        remarks: row.remarks || null,
      });
      toast.success(`Receipt saved for ${row.first_name} ${row.last_name}`);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSavingId(null);
  };

  const selectedCourse = courses.find((c) => String(c.id) === String(courseId));

  return (
    <div>
      <div className="no-print">
        <h1 className="page-title">Receipt of Course Kit</h1>
        <p className="page-subtitle">Track distribution of course material, kit and group photo per participant</p>

        <div className="toolbar">
          <div className="toolbar-left">
            <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-secondary" onClick={() => window.print()} disabled={!courseId}>Print</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{selectedCourse ? `${selectedCourse.name} (${selectedCourse.code})` : 'Receipt of Course Kit'}</h3>
        </div>
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : entries.length === 0 ? <EmptyState message="No participants assigned to this course" /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service No.</th><th>Name</th><th>Distribution Date</th>
                  <th>Course Material</th><th>Course Kit</th><th>Group Photo</th>
                  <th>Remarks</th><th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.participant_id}>
                    <td>{row.service_number}</td>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>
                      <input type="date" className="form-input no-print" value={row.distribution_date}
                        onChange={(e) => updateRow(row.participant_id, 'distribution_date', e.target.value)} />
                      <span className="print-only">{row.distribution_date || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={row.course_material}
                        onChange={(e) => updateRow(row.participant_id, 'course_material', e.target.checked)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={row.course_kit}
                        onChange={(e) => updateRow(row.participant_id, 'course_kit', e.target.checked)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={row.group_photo}
                        onChange={(e) => updateRow(row.participant_id, 'group_photo', e.target.checked)} />
                    </td>
                    <td>
                      <input className="form-input no-print" style={{ minWidth: 120 }} value={row.remarks}
                        onChange={(e) => updateRow(row.participant_id, 'remarks', e.target.value)} />
                      <span className="print-only">{row.remarks || '—'}</span>
                    </td>
                    <td className="no-print">
                      <button className="btn btn-primary btn-sm" disabled={savingId === row.participant_id}
                        onClick={() => saveRow(row)}>
                        {savingId === row.participant_id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
