import { useEffect, useState, useCallback } from 'react';
import api, { downloadFile } from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal, RatingInput } from '../components/common';
import { toast } from 'react-toastify';

// "Feedback by Participants" spec: named categories, each scored out of 10
const FEEDBACK_CATEGORIES = [
  { key: 'classroom_arrangements', label: 'Classroom Arrangements' },
  { key: 'course_content_kit', label: 'Course Content and Kit' },
  { key: 'practical_learning', label: 'Practical Learning' },
  { key: 'faculty_score', label: 'Faculty' },
  { key: 'overall_learning', label: 'Overall Learning from Course' },
  { key: 'hostel_stay', label: 'Hostel Stay' },
  { key: 'food', label: 'Food' },
  { key: 'other_facilities', label: 'Other Facilities' },
];

const emptyCategoryScores = Object.fromEntries(FEEDBACK_CATEGORIES.map((c) => [c.key, '']));

export default function FeedbackPage({ submitMode = false }) {
  const [feedback, setFeedback] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    course_id: '', overall_rating: 0, content_rating: 0, instructor_rating: 0,
    facility_rating: 0, comments: '', suggestions: '', is_anonymous: false,
    ...emptyCategoryScores,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/feedback', { params: { page, limit: 10 } });
      setFeedback(data.data);
      setPagination(data.pagination);
      if (!submitMode) {
        const analyticsRes = await api.get('/feedback/analytics');
        setAnalytics(analyticsRes.data.data);
      }
    } catch { toast.error('Failed to load feedback'); }
    setLoading(false);
  }, [page, submitMode]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (submitMode) {
      api.get('/courses', { params: { limit: 100 } }).then((r) => setCourses(r.data.data));
    }
  }, [submitMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.overall_rating) { toast.error('Please provide an overall rating'); return; }
    const payload = { ...form };
    FEEDBACK_CATEGORIES.forEach((c) => {
      payload[c.key] = form[c.key] === '' ? null : Number(form[c.key]);
    });
    try {
      await api.post('/feedback', payload);
      toast.success('Feedback submitted');
      setForm({
        ...form, course_id: '', overall_rating: 0, content_rating: 0, instructor_rating: 0,
        facility_rating: 0, comments: '', suggestions: '', ...emptyCategoryScores,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  const handleExport = (format) => {
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    downloadFile(`/feedback/export/${format}`, `feedback.${ext}`).catch(() => toast.error('Export failed'));
  };

  if (submitMode) {
    return (
      <div>
        <h1 className="page-title">Submit Course Feedback</h1>
        <p className="page-subtitle">Share your training experience through structured feedback</p>
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-select" required value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <RatingInput label="Overall Rating *" value={form.overall_rating}
                onChange={(v) => setForm({ ...form, overall_rating: v })} />
              <RatingInput label="Content Quality" value={form.content_rating}
                onChange={(v) => setForm({ ...form, content_rating: v })} />
              <RatingInput label="Instructor Rating" value={form.instructor_rating}
                onChange={(v) => setForm({ ...form, instructor_rating: v })} />
              <RatingInput label="Facility Rating" value={form.facility_rating}
                onChange={(v) => setForm({ ...form, facility_rating: v })} />

              <h4 style={{ margin: '1rem 0 0.5rem' }}>Feedback Points (score each out of 10)</h4>
              {FEEDBACK_CATEGORIES.map((c) => (
                <div className="form-row" key={c.key}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">{c.label}</label>
                    <input type="number" min="0" max="10" className="form-input" value={form[c.key]}
                      onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} placeholder="0–10" />
                  </div>
                </div>
              ))}

              <div className="form-group">
                <label className="form-label">Comments</label>
                <textarea className="form-textarea" value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Suggestions</label>
                <textarea className="form-textarea" value={form.suggestions}
                  onChange={(e) => setForm({ ...form, suggestions: e.target.value })} />
              </div>
              <div className="form-checkbox">
                <input type="checkbox" checked={form.is_anonymous}
                  onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
                <label>Submit anonymously</label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Feedback</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Feedback Management</h1>
      <p className="page-subtitle">Review course feedback and ratings</p>

      <div className="toolbar">
        <div />
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => handleExport('excel')}>Export Excel</button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>Export PDF</button>
        </div>
      </div>

      {analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">⭐</div>
            <div>
              <div className="stat-value">{analytics.avgRatings?.avg_overall || '—'}</div>
              <div className="stat-label">Overall Rating</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📚</div>
            <div>
              <div className="stat-value">{analytics.avgRatings?.avg_content || '—'}</div>
              <div className="stat-label">Content Rating</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">👨‍🏫</div>
            <div>
              <div className="stat-value">{analytics.avgRatings?.avg_instructor || '—'}</div>
              <div className="stat-label">Instructor Rating</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">🏢</div>
            <div>
              <div className="stat-value">{analytics.avgRatings?.total_feedback || 0}</div>
              <div className="stat-label">Total Responses</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : feedback.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Participant</th><th>Course</th><th>Overall</th><th>Content</th>
                    <th>Instructor</th><th>Points Avg (/10)</th><th>Comments</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f) => {
                    const scores = FEEDBACK_CATEGORIES.map((c) => f[c.key]).filter((v) => v !== null && v !== undefined);
                    const pointsAvg = scores.length
                      ? (scores.reduce((s, v) => s + Number(v), 0) / scores.length).toFixed(1) : null;
                    return (
                    <tr key={f.id}>
                      <td>{f.first_name} {f.last_name}</td>
                      <td>{f.course_name}</td>
                      <td>{'★'.repeat(f.overall_rating)}</td>
                      <td>{f.content_rating ? '★'.repeat(f.content_rating) : '—'}</td>
                      <td>{f.instructor_rating ? '★'.repeat(f.instructor_rating) : '—'}</td>
                      <td>{pointsAvg ?? '—'}</td>
                      <td>{f.comments?.substring(0, 40) || '—'}</td>
                      <td>{new Date(f.submitted_at).toLocaleDateString()}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
