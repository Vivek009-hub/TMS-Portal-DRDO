import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { StatCard, LoadingSpinner, EmptyState, StatusBadge } from '../components/common';
import DashboardHero from '../components/DashboardHero';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const QUICK_ACTIONS = [
  { label: '+ Add Participant', path: '/participants' },
  { label: '+ Add Course', path: '/courses' },
  { label: '+ Generate Certificate', path: '/certificates' },
  { label: 'View Reports', path: '/reports' },
];

const ACTIVITY_ICONS = { certificate: '📜', participant: '👤', leave: '📋' };

const TABS = ['Overview', 'Courses', 'Certificates', 'Leaves & Departments'];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

/** Reads the app's actual CSS custom properties instead of hard-coding hex values, so the
 * chart palette can't silently drift from the design system defined in styles/index.css. */
function useThemeColors() {
  return useMemo(() => {
    if (typeof window === 'undefined') return [];
    const style = getComputedStyle(document.documentElement);
    const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return [
      read('--primary-800', '#1e3a8a'), read('--primary-600', '#2563eb'), read('--primary-500', '#3b82f6'),
      read('--primary-400', '#60a5fa'), read('--primary-300', '#93c5fd'),
      read('--success', '#059669'), read('--warning', '#d97706'), read('--danger', '#dc2626'),
    ];
  }, []);
}

function ChartCard({ title, loading, empty, height = 280, children }) {
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body">
        {loading ? (
          <div className="chart-loading"><LoadingSpinner /></div>
        ) : empty ? (
          <div className="chart-empty">No data for the selected period</div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [range, setRange] = useState(() => ({
    start: toISODate(new Date(Date.now() - 29 * 86400000)),
    end: toISODate(new Date()),
  }));
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const COLORS = useThemeColors();

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    api.get('/dashboard', { params: { start_date: range.start, end_date: range.end } }).then((res) => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [range.start, range.end]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading && !data) return <LoadingSpinner />;

  if (!isAdmin) {
    return <ParticipantDashboard data={data} />;
  }

  const courseStatusData = data?.courseStatuses?.map((s) => ({ name: s.status, value: s.count })) || [];
  const certTypeData = data?.certificateTypes?.map((s) => ({ name: s.type, value: s.count })) || [];
  const leaveData = data?.leaveStatuses?.map((s) => ({ name: s.status, value: s.count })) || [];
  const trendData = data?.certificateTrends?.map((t) => ({ month: t.month, certificates: t.count })) || [];
  const enrollmentData = data?.monthlyEnrollments?.map((e) => ({ month: e.month, enrollments: e.count })) || [];
  const departmentData = data?.departmentStatistics?.map((d) => ({
    name: d.department_name, value: d.participant_count, department_id: d.department_id,
  })) || [];

  const setQuickRange = (days) => setRange({ start: toISODate(new Date(Date.now() - (days - 1) * 86400000)), end: toISODate(new Date()) });

  return (
    <div>
      <h1 className="page-title">Analytics Dashboard</h1>
      <p className="page-subtitle">Overview of training operations and key metrics</p>

      <DashboardHero />

      <div className="toolbar" style={{ marginBottom: '1rem' }}>
        <div className="toolbar-left" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <input type="date" className="form-input" value={range.start} max={range.end}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
          <span style={{ color: 'var(--gray-400)' }}>to</span>
          <input type="date" className="form-input" value={range.end} min={range.start} max={toISODate(new Date())}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
          <button className="btn btn-secondary btn-sm" onClick={() => setQuickRange(7)}>7d</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setQuickRange(30)}>30d</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setQuickRange(90)}>90d</button>
        </div>
        <div className="toolbar-right">
          {QUICK_ACTIONS.map((qa) => (
            <button key={qa.path} className="btn btn-secondary btn-sm" onClick={() => navigate(qa.path)}>{qa.label}</button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="📚" label="Total Courses" value={data?.totalCourses || 0} color="blue" />
        <StatCard icon="🏃" label="Active Courses" value={data?.runningCourses || 0} color="green" />
        <StatCard icon="👥" label="Total Participants" value={data?.participants || 0} color="blue"
          delta={data?.newParticipantsDelta} deltaNote="new" />
        <StatCard icon="🎓" label="Total Faculty" value={data?.totalFaculty || 0} color="green" />
        <StatCard icon="📜" label="Certificates Issued" value={data?.totalCertificates || 0} color="orange"
          delta={data?.certificatesIssuedDelta} deltaNote="vs prior period" />
        <StatCard icon="📄" label="Pending Documents" value={data?.pendingDocuments || 0} color="red" />
        <StatCard icon="✅" label="Attendance %" value={data?.attendancePercent != null ? `${data.attendancePercent}%` : 'N/A'} color="green"
          delta={data?.attendancePercentDelta} deltaUnit="pts" deltaNote="vs prior period" />
        <StatCard icon="⏳" label="Pending Leaves" value={data?.pendingLeaves || 0} color="red" />
      </div>

      <div className="tabs" style={{ marginTop: '1.5rem' }}>
        {TABS.map((t) => (
          <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="chart-grid" style={{ marginTop: '1rem' }}>
          <div className="card">
            <div className="card-header"><h3>Upcoming Courses</h3></div>
            <div className="card-body table-container">
              {data?.upcomingCourses?.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Course</th><th>Start</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.upcomingCourses.map((c) => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/courses?search=${encodeURIComponent(c.code)}`)}>
                        <td>{c.name} ({c.code})</td>
                        <td>{c.start_date?.slice(0, 10)}</td>
                        <td><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState message="No upcoming courses" />}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Recent Activity</h3></div>
            <div className="card-body">
              {data?.recentActivity?.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {data.recentActivity.map((a, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.85rem' }}>
                      <span>{ACTIVITY_ICONS[a.activity_type] || '•'}</span>
                      <span style={{ flex: 1 }}>{a.description}</span>
                      <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState message="No recent activity" />}
            </div>
          </div>
        </div>
      )}

      {tab === 'Courses' && (
        <div className="chart-grid" style={{ marginTop: '1rem' }}>
          <ChartCard title="Course Status" loading={loading} empty={courseStatusData.length === 0}>
            <PieChart>
              <Pie data={courseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label
                onClick={(entry) => navigate(`/courses?status=${entry.name}`)} style={{ cursor: 'pointer' }}>
                {courseStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartCard>

          <ChartCard title="Monthly Enrollments" loading={loading} empty={enrollmentData.length === 0}>
            <BarChart data={enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="enrollments" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {tab === 'Certificates' && (
        <div className="chart-grid" style={{ marginTop: '1rem' }}>
          <ChartCard title="Certificate Trends" loading={loading} empty={trendData.length === 0}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="certificates" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ChartCard>

          <ChartCard title="Certificate Types" loading={loading} empty={certTypeData.length === 0}>
            <PieChart>
              <Pie data={certTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label
                onClick={(entry) => navigate(`/certificates?type=${entry.name}`)} style={{ cursor: 'pointer' }}>
                {certTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartCard>
        </div>
      )}

      {tab === 'Leaves & Departments' && (
        <div className="chart-grid" style={{ marginTop: '1rem' }}>
          <ChartCard title="Leave Summary" loading={loading} empty={leaveData.length === 0}>
            <BarChart data={leaveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS[6]} radius={[4, 4, 0, 0]}
                onClick={(entry) => navigate(`/leaves?status=${entry.name}`)} style={{ cursor: 'pointer' }} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Department Statistics" loading={loading} empty={departmentData.length === 0}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS[5]} radius={[4, 4, 0, 0]}
                onClick={(entry) => navigate(`/participants?department_id=${entry.department_id}`)} style={{ cursor: 'pointer' }} />
            </BarChart>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ParticipantDashboard({ data }) {
  const p = data?.participant;
  return (
    <div>
      <h1 className="page-title">Welcome, {p?.first_name} {p?.last_name}</h1>
      <p className="page-subtitle">Your training portal overview</p>

      <div className="stats-grid">
        <StatCard icon="📜" label="My Certificates" value={data?.certificates?.length || 0} color="blue" />
        <StatCard icon="📚" label="Enrolled Courses" value={data?.enrollments?.length || 0} color="green" />
        <StatCard icon="📋" label="Leave Requests" value={data?.leaves?.length || 0} color="orange" />
        <StatCard icon="⭐" label="Feedback Submitted" value={data?.feedback?.length || 0} color="green" />
      </div>

      {p && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><h3>Profile Information</h3></div>
          <div className="card-body">
            <div className="form-row">
              <div><strong>Service No:</strong> {p.service_number}</div>
              <div><strong>Rank:</strong> {p.rank_name || '—'}</div>
              <div><strong>Department:</strong> {p.department_name || '—'}</div>
              <div><strong>Unit Address:</strong> {p.unit_address || '—'}</div>
              <div><strong>Course:</strong> {p.course_name || '—'}</div>
              <div><strong>Reporting Date:</strong> {p.date_of_reporting || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {data?.enrollments?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>My Courses</h3></div>
          <div className="card-body table-container">
            <table className="data-table">
              <thead>
                <tr><th>Course</th><th>Code</th><th>Status</th><th>Start</th><th>End</th></tr>
              </thead>
              <tbody>
                {data.enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.code}</td>
                    <td>{e.status}</td>
                    <td>{e.start_date || '—'}</td>
                    <td>{e.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
