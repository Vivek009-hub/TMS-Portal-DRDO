import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState } from '../components/common';
import { toast } from 'react-toastify';

export default function ReportingSheetPage() {
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
      const { data } = await api.get(`/reporting-sheet/${courseId}`);
      setEntries(data.data.map((row) => ({
        ...row,
        reporting_date: row.reporting_date?.slice(0, 10) || '',
        reporting_time: row.reporting_time || '',
      })));
    } catch { toast.error('Failed to load reporting sheet'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const updateRow = (participantId, field, value) => {
    setEntries((rows) => rows.map((r) => r.participant_id === participantId ? { ...r, [field]: value } : r));
  };

  const saveRow = async (row) => {
    if (!row.reporting_date) { toast.error('Reporting date is required'); return; }
    setSavingId(row.participant_id);
    try {
      await api.post(`/reporting-sheet/${courseId}`, {
        participant_id: row.participant_id,
        reporting_date: row.reporting_date,
        reporting_time: row.reporting_time || null,
      });
      toast.success(`Reporting recorded for ${row.first_name} ${row.last_name}`);
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
        <h1 className="page-title">Reporting Sheet</h1>
        <p className="page-subtitle">Record participant reporting date, time and signature for a course</p>

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
          <h3>{selectedCourse ? `${selectedCourse.name} (${selectedCourse.code})` : 'Reporting Sheet'}</h3>
        </div>
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : entries.length === 0 ? <EmptyState message="No participants assigned to this course" /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service No.</th><th>Name</th><th>Rank</th>
                  <th>Reporting Date</th><th>Reporting Time</th><th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.participant_id}>
                    <td>{row.service_number}</td>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.rank_name || '—'}</td>
                    <td>
                      <input type="date" className="form-input no-print" value={row.reporting_date}
                        onChange={(e) => updateRow(row.participant_id, 'reporting_date', e.target.value)} />
                      <span className="print-only">{row.reporting_date || '—'}</span>
                    </td>
                    <td>
                      <input type="time" className="form-input no-print" value={row.reporting_time}
                        onChange={(e) => updateRow(row.participant_id, 'reporting_time', e.target.value)} />
                      <span className="print-only">{row.reporting_time || '—'}</span>
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
