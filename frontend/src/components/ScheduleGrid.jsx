import { useEffect, useState, useCallback } from 'react';
import api, { downloadFile } from '../api/client';
import { LoadingSpinner } from './common';
import { toast } from 'react-toastify';

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKS = Array.from({ length: 12 }, (_, i) => i + 1);

function cellKey(day, startTime) {
  return `${day}_${startTime}`;
}

export default function ScheduleGrid({ courseId }) {
  const [timeSlots, setTimeSlots] = useState([]);
  const [week, setWeek] = useState(1);
  const [cells, setCells] = useState({});
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/schedule-slots/time-template').then((r) => setTimeSlots(r.data.data));
    api.get('/faculty', { params: { limit: 100 } }).then((r) => setFaculty(r.data.data));
  }, []);

  const fetchWeek = useCallback(async () => {
    if (timeSlots.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/schedule-slots/${week}`);
      const map = {};
      data.data.forEach((row) => {
        map[cellKey(row.day_number, row.start_time.slice(0, 5))] = {
          topic: row.topic || '', faculty_id: row.faculty_id || '',
        };
      });
      setCells(map);
    } catch { toast.error('Failed to load schedule week'); }
    setLoading(false);
  }, [courseId, week, timeSlots.length]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  const updateCell = (day, startTime, field, value) => {
    const key = cellKey(day, startTime);
    setCells((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async () => {
    const payload = [];
    DAYS.forEach((day) => {
      timeSlots.forEach((slot) => {
        const cell = cells[cellKey(day, slot.start_time)] || {};
        payload.push({
          day_number: day,
          start_time: slot.start_time,
          end_time: slot.end_time,
          topic: cell.topic || '',
          faculty_id: cell.faculty_id || null,
        });
      });
    });
    setSaving(true);
    try {
      await api.put(`/courses/${courseId}/schedule-slots/${week}`, { cells: payload });
      toast.success(`Week ${week} schedule saved`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schedule');
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Week:</label>
        <select className="form-select" style={{ width: 100 }} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : `Save Week ${week}`}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() =>
          downloadFile(`/courses/${courseId}/schedule-slots/export/excel`, `schedule-${courseId}.xlsx`).catch(() => toast.error('Export failed'))
        }>Export Excel</button>
        <button className="btn btn-secondary btn-sm" onClick={() =>
          downloadFile(`/courses/${courseId}/schedule-slots/export/pdf`, `schedule-${courseId}.pdf`).catch(() => toast.error('Export failed'))
        }>Export PDF</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Time</th>
                {DAYS.map((d) => <th key={d}>Day {d}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot.start_time}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{slot.start_time}–{slot.end_time}</td>
                  {DAYS.map((day) => {
                    const cell = cells[cellKey(day, slot.start_time)] || { topic: '', faculty_id: '' };
                    return (
                      <td key={day} style={{ minWidth: 140 }}>
                        <input
                          className="form-input"
                          style={{ fontSize: '0.75rem', padding: '0.3rem', marginBottom: '0.25rem' }}
                          placeholder="Topic / activity"
                          value={cell.topic}
                          onChange={(e) => updateCell(day, slot.start_time, 'topic', e.target.value)}
                        />
                        <select
                          className="form-select"
                          style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                          value={cell.faculty_id}
                          onChange={(e) => updateCell(day, slot.start_time, 'faculty_id', e.target.value)}
                        >
                          <option value="">Faculty...</option>
                          {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
