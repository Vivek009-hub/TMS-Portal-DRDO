import { Fragment, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { downloadFile } from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import { toast } from 'react-toastify';
import ScheduleGrid from '../components/ScheduleGrid';
import TheoryLectureSchedule from '../components/TheoryLectureSchedule';
import ResultManagement from '../components/ResultManagement';
import FundsManagement from '../components/FundsManagement';
import { CalendarsPage, CircularsPage } from './DocumentsPage';
import CertificatesPage from './CertificatesPage';

const emptyForm = {
  code: '', name: '', description: '', instructor: '', venue: '', duration_days: '',
  start_date: '', end_date: '', financial_year: '', authorized_seats: '', total_seats: 50,
  status: 'draft', seat_allocations: [],
};

const DETAIL_TABS = ['Participants', 'Faculty', 'Schedules', 'Calendar', 'Circular', 'Lecture Schedule', 'Results', 'Attendance', 'Certificates', 'Funds', 'Reports'];
const AVAILABLE_DETAIL_TABS = ['Participants', 'Faculty', 'Schedules', 'Calendar', 'Circular', 'Lecture Schedule', 'Results', 'Certificates', 'Funds'];

function CourseDetailPanel({ course, departments }) {
  const [tab, setTab] = useState('Participants');
  const [enrollments, setEnrollments] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [assignFacultyId, setAssignFacultyId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [loading, setLoading] = useState(false);

  const [rosterError, setRosterError] = useState(null);

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    setRosterError(null);
    try {
      const { data } = await api.get(`/courses/${course.id}/enrollments`);
      setEnrollments(data.data || []);
    } catch (err) {
      console.error('Failed to load course roster:', err);
      setRosterError(err.response?.data?.message || 'Unable to load participants. Please try again.');
      toast.error('Unable to load participants. Please try again.');
    }
    setLoading(false);
  }, [course.id]);

  const loadFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${course.id}/faculty`);
      setFacultyAssignments(data.data);
      if (allFaculty.length === 0) {
        const res = await api.get('/faculty', { params: { limit: 100 } });
        setAllFaculty(res.data.data);
      }
    } catch { toast.error('Failed to load faculty'); }
    setLoading(false);
  }, [course.id, allFaculty.length]);

  useEffect(() => {
    if (tab === 'Participants') loadEnrollments();
    if (tab === 'Faculty') loadFaculty();
  }, [tab, loadEnrollments, loadFaculty]);

  const handleAssignFaculty = async (e) => {
    e.preventDefault();
    if (!assignFacultyId) return;
    try {
      await api.post(`/courses/${course.id}/faculty`, { faculty_id: assignFacultyId, role: assignRole });
      toast.success('Faculty assigned');
      setAssignFacultyId(''); setAssignRole('');
      loadFaculty();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign faculty');
    }
  };

  const handleUnassign = async (facultyId) => {
    try {
      await api.delete(`/courses/${course.id}/faculty/${facultyId}`);
      loadFaculty();
    } catch { toast.error('Failed to remove assignment'); }
  };

  const handleToggleCertificate = async (facultyId, showOnCertificate) => {
    try {
      await api.put(`/courses/${course.id}/faculty/${facultyId}`, { show_on_certificate: showOnCertificate });
      loadFaculty();
    } catch { toast.error('Failed to update certificate visibility'); }
  };

  return (
    <div className="course-detail-panel" style={{ padding: '1rem', background: 'var(--gray-50)' }}>
      <div className="tabs">
        {DETAIL_TABS.map((t) => (
          <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {!AVAILABLE_DETAIL_TABS.includes(tab) && (
        <EmptyState message={`${tab} is coming in a later phase`} />
      )}

      {tab === 'Participants' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(
              `/courses/${course.id}/enrollments/export/excel`, `course-${course.code}-roster.xlsx`
            ).catch(() => toast.error('Failed to export roster'))}>Export Excel</button>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(
              `/courses/${course.id}/enrollments/export/pdf`, `course-${course.code}-roster.pdf`
            ).catch(() => toast.error('Failed to export roster'))}>Export PDF</button>
          </div>
          {loading ? <LoadingSpinner /> : rosterError ? <EmptyState message={rosterError} /> : enrollments.length === 0 ? <EmptyState message="No participants enrolled" /> : (
            <table className="data-table">
              <thead><tr><th>Service No.</th><th>Name</th><th>Rank</th><th>Department</th><th>Status</th></tr></thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>{e.service_number}</td>
                    <td>{e.first_name} {e.last_name}</td>
                    <td>{e.military_rank || '—'}</td>
                    <td>{e.department || '—'}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'Faculty' && (
        <>
          <form onSubmit={handleAssignFaculty} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label">Assign Faculty</label>
              <select className="form-select" value={assignFacultyId} onChange={(e) => setAssignFacultyId(e.target.value)}>
                <option value="">Select faculty</option>
                {allFaculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label">Role</label>
              <input className="form-input" placeholder="e.g. Lead Instructor" value={assignRole} onChange={(e) => setAssignRole(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Assign</button>
          </form>
          {loading ? <LoadingSpinner /> : facultyAssignments.length === 0 ? <EmptyState message="No faculty assigned" /> : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Rank</th><th>Institute</th><th>Role</th><th>On Certificate</th><th></th></tr></thead>
              <tbody>
                {facultyAssignments.map((f) => (
                  <tr key={f.id}>
                    <td>{f.name}</td>
                    <td>{f.rank_name || '—'}</td>
                    <td>{f.institute_name || '—'}</td>
                    <td>{f.role || '—'}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(f.show_on_certificate)}
                        onChange={(e) => handleToggleCertificate(f.faculty_id, e.target.checked)}
                        title="Include this faculty member's name and designation on generated certificates"
                      />
                    </td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => handleUnassign(f.faculty_id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === 'Schedules' && <ScheduleGrid courseId={course.id} />}
      {tab === 'Lecture Schedule' && <TheoryLectureSchedule courseId={course.id} />}
      {tab === 'Calendar' && <CalendarsPage courseId={course.id} embedded />}
      {tab === 'Circular' && <CircularsPage courseId={course.id} embedded />}
      {tab === 'Results' && <ResultManagement courseId={course.id} />}
      {tab === 'Certificates' && <CertificatesPage courseId={course.id} embedded />}
      {tab === 'Funds' && <FundsManagement courseId={course.id} />}
    </div>
  );
}

export default function CoursesPage() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [year, setYear] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [years, setYears] = useState([]);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/courses', {
        params: { page, search, financial_year: year || undefined, status: statusFilter || undefined, limit: 10 },
      });
      setCourses(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load courses'); }
    setLoading(false);
  }, [page, search, year, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { api.get('/lookups/departments').then((r) => setDepartments(r.data.data)); }, []);
  useEffect(() => {
    api.get('/courses/financial-years').then((r) => setYears(r.data.data || [])).catch(() => setYears([]));
  }, []);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openCreateModal = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEditModal = async (id) => {
    try {
      const { data } = await api.get(`/courses/${id}`);
      const c = data.data;
      setEditingId(id);
      setForm({
        ...emptyForm, ...c,
        description: c.description || '', instructor: c.instructor || '', venue: c.venue || '',
        financial_year: c.financial_year || '', authorized_seats: c.authorized_seats ?? '',
        seat_allocations: c.seat_allocations.map((a) => ({ department_id: a.department_id, allocated_seats: a.allocated_seats })),
      });
      setShowModal(true);
    } catch { toast.error('Failed to load course'); }
  };

  const addSeatAllocationRow = () => setField('seat_allocations', [...form.seat_allocations, { department_id: '', allocated_seats: 0 }]);
  const updateSeatAllocationRow = (index, key, value) => {
    const rows = [...form.seat_allocations];
    rows[index] = { ...rows[index], [key]: value };
    setField('seat_allocations', rows);
  };
  const removeSeatAllocationRow = (index) => setField('seat_allocations', form.seat_allocations.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      duration_days: Number(form.duration_days) || 0,
      authorized_seats: form.authorized_seats ? Number(form.authorized_seats) : null,
      total_seats: Number(form.total_seats) || 50,
      seat_allocations: form.seat_allocations
        .filter((a) => a.department_id)
        .map((a) => ({ department_id: Number(a.department_id), allocated_seats: Number(a.allocated_seats) || 0 })),
    };
    try {
      if (editingId) {
        await api.put(`/courses/${editingId}`, payload);
        toast.success('Course updated');
      } else {
        await api.post('/courses', payload);
        toast.success('Course created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    }
  };

  const handleExport = async (format) => {
    try {
      const params = { search, financial_year: year || undefined, status: statusFilter || undefined };
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      await downloadFile(`/courses/export/${format}`, `courses.${ext}`, { params });
    } catch {
      toast.error('Failed to export courses');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course? This cannot be undone.')) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Course deleted');
      if (expandedCourseId === id) setExpandedCourseId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  let lastYear = null;

  return (
    <div>
      <h1 className="page-title">Course Management</h1>
      <p className="page-subtitle">Create and manage training courses, year-wise</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search by code, name, coordinator, venue..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-select" style={{ maxWidth: 180 }} value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }}>
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: 160 }} value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['draft', 'scheduled', 'running', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => handleExport('excel')}>Export Excel</button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>Export PDF</button>
          <button className="btn btn-primary" onClick={openCreateModal}>+ Add Course</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : courses.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Name</th><th>Venue</th>
                    <th>Duration</th><th>Period</th><th>Seats</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => {
                    const showYearHeader = c.financial_year !== lastYear;
                    lastYear = c.financial_year;
                    return (
                      <Fragment key={c.id}>
                        {showYearHeader && (
                          <tr key={`year-${c.financial_year}-${c.id}`}>
                            <td colSpan={8} style={{ background: 'var(--gray-100)', fontWeight: 600 }}>
                              Financial Year: {c.financial_year || 'Unspecified'}
                            </td>
                          </tr>
                        )}
                        <tr key={c.id}>
                          <td><strong>{c.code}</strong></td>
                          <td>{c.name}</td>
                          <td>{c.venue || '—'}</td>
                          <td>{c.duration_days} days</td>
                          <td>{c.start_date || '—'} – {c.end_date || '—'}</td>
                          <td>{c.enrolled_count || 0}/{c.total_seats}</td>
                          <td><StatusBadge status={c.status} /></td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(c.id)}>Edit</button>{' '}
                            <button className="btn btn-secondary btn-sm" onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}>
                              {expandedCourseId === c.id ? 'Collapse' : 'Expand'}
                            </button>{' '}
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                          </td>
                        </tr>
                        {expandedCourseId === c.id && (
                          <tr key={`detail-${c.id}`}>
                            <td colSpan={8} style={{ padding: 0 }}>
                              <CourseDetailPanel course={c} departments={departments} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Course' : 'Add Course'} size="modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Course Code *</label>
                <input className="form-input" required value={form.code} onChange={(e) => setField('code', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Course Title *</label>
                <input className="form-input" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Instructor</label>
                <input className="form-input" value={form.instructor} onChange={(e) => setField('instructor', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input className="form-input" value={form.venue} onChange={(e) => setField('venue', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Financial Year</label>
                <input className="form-input" placeholder="e.g. 2025-2026" value={form.financial_year} onChange={(e) => setField('financial_year', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (days)</label>
                <input type="number" className="form-input" value={form.duration_days} onChange={(e) => setField('duration_days', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Authorized Seats</label>
                <input type="number" className="form-input" value={form.authorized_seats} onChange={(e) => setField('authorized_seats', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Seats</label>
                <input type="number" className="form-input" value={form.total_seats} onChange={(e) => setField('total_seats', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <label className="form-label">Department-wise Seat Allocation</label>
            {form.seat_allocations.map((row, i) => (
              <div className="form-row" key={i} style={{ alignItems: 'flex-end' }}>
                <div className="form-group">
                  <select className="form-select" value={row.department_id} onChange={(e) => updateSeatAllocationRow(i, 'department_id', e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <input type="number" className="form-input" placeholder="Seats" value={row.allocated_seats}
                    onChange={(e) => updateSeatAllocationRow(i, 'allocated_seats', e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '0 0 auto' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeSeatAllocationRow(i)}>Remove</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSeatAllocationRow}>+ Add Department Allocation</button>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Course'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
