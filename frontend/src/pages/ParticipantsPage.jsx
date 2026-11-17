import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { downloadFile } from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal, LookupSelect } from '../components/common';
import { toast } from 'react-toastify';

const TABS = [
  'Personal Information', 'Service Information', 'Documents',
  'Course Details', 'Medical Details', 'Movement Orders', 'Reporting Details',
];

const emptyForm = {
  service_number: '', rank_id: '', first_name: '', last_name: '', mobile_number: '', email: '',
  date_of_birth: '', educational_qualification: '', qualifying_essential_education: false,
  date_of_appointment: '', date_of_retirement: '', unit_address: '', pin_code: '',
  medical_category_id: '', date_of_reporting: '', reporting_time_session: '',
  movement_order_number: '', movement_order_date: '', department_id: '', remarks: '',
  eligible: false, actual_participation: false, reallocation_reason: '', course_id: '',
  create_user_account: false, user_password: '', documents: [],
};

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Recently Added' },
  { value: 'name', label: 'Name' },
  { value: 'service_number', label: 'Service No.' },
  { value: 'rank_name', label: 'Rank' },
  { value: 'department_name', label: 'Department' },
  { value: 'course_name', label: 'Course' },
  { value: 'financial_year', label: 'Training Year' },
];

export default function ParticipantsPage() {
  const [searchParams] = useSearchParams();
  const [participants, setParticipants] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [rankFilter, setRankFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('department_id') || '');
  const [yearFilter, setYearFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [medicalCategories, setMedicalCategories] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/participants', {
        params: {
          page, search, limit: 10, rank_id: rankFilter || undefined, department_id: departmentFilter || undefined,
          financial_year: yearFilter || undefined, course_id: courseFilter || undefined, unit: unitFilter || undefined,
          sort_by: sortBy, sort_dir: sortDir,
        },
      });
      setParticipants(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load participants:', err);
      setError(err.response?.data?.message || 'Unable to load participants. Please try again.');
    }
    setLoading(false);
  }, [page, search, rankFilter, departmentFilter, yearFilter, courseFilter, unitFilter, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/courses', { params: { limit: 100 } }).then((r) => setCourses(r.data.data));
    api.get('/lookups/ranks').then((r) => setRanks(r.data.data));
    api.get('/lookups/departments').then((r) => setDepartments(r.data.data));
    api.get('/lookups/medical-categories').then((r) => setMedicalCategories(r.data.data));
    api.get('/lookups/document-types').then((r) => setDocumentTypes(r.data.data));
    api.get('/participants/units').then((r) => setUnits(r.data.data)).catch(() => {});
    api.get('/courses/financial-years').then((r) => setYears(r.data.data)).catch(() => {});
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setReadOnly(false);
    setActiveTab(0);
    setForm({
      ...emptyForm,
      documents: documentTypes.map((dt) => ({ document_type_id: dt.id, submitted: false })),
    });
    setShowModal(true);
  };

  const openEditModal = async (id, viewOnly = false) => {
    try {
      const { data } = await api.get(`/participants/${id}`);
      const p = data.data;
      setEditingId(id);
      setReadOnly(viewOnly);
      setActiveTab(0);
      setForm({
        ...emptyForm,
        ...p,
        rank_id: p.rank_id || '', department_id: p.department_id || '', medical_category_id: p.medical_category_id || '',
        course_id: p.course_id || '',
        mobile_number: p.mobile_number || '', email: p.email || '',
        educational_qualification: p.educational_qualification || '', unit_address: p.unit_address || '',
        pin_code: p.pin_code || '', movement_order_number: p.movement_order_number || '',
        remarks: p.remarks || '', reallocation_reason: p.reallocation_reason || '',
        reporting_time_session: p.reporting_time_session || '',
        qualifying_essential_education: Boolean(p.qualifying_essential_education),
        eligible: Boolean(p.eligible), actual_participation: Boolean(p.actual_participation),
        date_of_birth: p.date_of_birth?.slice(0, 10) || '',
        date_of_appointment: p.date_of_appointment?.slice(0, 10) || '',
        date_of_retirement: p.date_of_retirement?.slice(0, 10) || '',
        date_of_reporting: p.date_of_reporting?.slice(0, 10) || '',
        movement_order_date: p.movement_order_date?.slice(0, 10) || '',
        documents: documentTypes.map((dt) => {
          const existing = p.documents?.find((d) => d.document_type_id === dt.id);
          return { document_type_id: dt.id, submitted: existing?.submitted || false };
        }),
      });
      setShowModal(true);
    } catch {
      toast.error('Failed to load participant');
    }
  };

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleDocument = (documentTypeId) => {
    setForm((f) => ({
      ...f,
      documents: f.documents.map((d) => d.document_type_id === documentTypeId ? { ...d, submitted: !d.submitted } : d),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      rank_id: form.rank_id || null,
      department_id: form.department_id || null,
      medical_category_id: form.medical_category_id || null,
      course_id: form.course_id || null,
      date_of_birth: form.date_of_birth || null,
      date_of_appointment: form.date_of_appointment || null,
      date_of_retirement: form.date_of_retirement || null,
      date_of_reporting: form.date_of_reporting || null,
      movement_order_date: form.movement_order_date || null,
      reporting_time_session: form.reporting_time_session || null,
      user_password: form.create_user_account ? form.user_password : undefined,
    };
    try {
      if (editingId) {
        await api.put(`/participants/${editingId}`, payload);
        toast.success('Participant updated');
      } else {
        await api.post('/participants', payload);
        toast.success('Participant created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.message || err.response?.data?.message || 'Failed to save participant');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/participants/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Imported: ${data.data.created}, Skipped: ${data.data.skipped}`);
      fetchData();
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
  };

  const activeFilterParams = () => ({
    search: search || undefined, rank_id: rankFilter || undefined, department_id: departmentFilter || undefined,
    financial_year: yearFilter || undefined, course_id: courseFilter || undefined, unit: unitFilter || undefined,
  });

  const handleExport = async (format) => {
    try {
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      await downloadFile(`/participants/export/${format}`, `participants.${ext}`, { params: activeFilterParams() });
    } catch {
      toast.error('Export failed');
    }
  };

  const handleExportAll = async (format) => {
    try {
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      await downloadFile(`/participants/export/${format}`, `all-participants.${ext}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const sortIndicator = (column) => sortBy === column ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this participant? This cannot be undone.')) return;
    try {
      await api.delete(`/participants/${id}`);
      toast.success('Participant deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete participant');
    }
  };

  return (
    <div>
      <h1 className="page-title">Participants</h1>
      <p className="page-subtitle">View and manage all training participants across every course and year</p>

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="toolbar-left" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <input className="search-input" placeholder="Search by ID, name, service no..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-select" style={{ width: 130 }} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}>
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-select" style={{ width: 170 }} value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}>
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 160 }} value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 140 }} value={rankFilter} onChange={(e) => { setRankFilter(e.target.value); setPage(1); }}>
            <option value="">All Ranks</option>
            {ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 140 }} value={unitFilter} onChange={(e) => { setUnitFilter(e.target.value); setPage(1); }}>
            <option value="">All Units</option>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          <label className="btn btn-secondary">
            Import Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} hidden />
          </label>
          <button className="btn btn-secondary" onClick={() => handleExport('excel')}>Export Excel</button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>Export PDF</button>
          <button className="btn btn-secondary" onClick={() => handleExportAll('excel')}>Export All</button>
          <button className="btn btn-primary" onClick={openCreateModal}>+ Add Participant</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {!loading && pagination && (
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Showing {participants.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–
              {(pagination.page - 1) * pagination.limit + participants.length} of {pagination.total} participants
            </p>
          )}
          {loading ? <LoadingSpinner /> : error ? <EmptyState message={error} /> : participants.length === 0 ? (
            <EmptyState message="No participants found" />
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('service_number')}>Service No.{sortIndicator('service_number')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>Name{sortIndicator('name')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('rank_name')}>Rank{sortIndicator('rank_name')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('department_name')}>Department{sortIndicator('department_name')}</th>
                    <th>Unit</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('course_name')}>Course{sortIndicator('course_name')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('financial_year')}>Year{sortIndicator('financial_year')}</th>
                    <th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.service_number}</strong></td>
                      <td>{p.first_name} {p.last_name}</td>
                      <td>{p.rank_name || '—'}</td>
                      <td>{p.department_name || '—'}</td>
                      <td>{p.unit_address || '—'}</td>
                      <td>{p.course_name || '—'}</td>
                      <td>{p.financial_year || '—'}</td>
                      <td><StatusBadge status={p.is_active ? 'active' : 'inactive'} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(p.id, true)}>View</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(p.id, false)}>Edit</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={readOnly ? 'Participant Details' : editingId ? 'Edit Participant' : 'Add Participant'} size="modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="tabs">
              {TABS.map((tab, i) => (
                <button key={tab} type="button" className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
                  {tab}
                </button>
              ))}
            </div>
            <fieldset disabled={readOnly} style={{ border: 'none', margin: 0, padding: 0 }}>

            {activeTab === 0 && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-input" required value={form.first_name}
                      onChange={(e) => setField('first_name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-input" required value={form.last_name}
                      onChange={(e) => setField('last_name', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rank</label>
                    <LookupSelect type="ranks" options={ranks} setOptions={setRanks}
                      value={form.rank_id} onChange={(v) => setField('rank_id', v)} placeholder="Select rank" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={form.date_of_birth}
                      onChange={(e) => setField('date_of_birth', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input className="form-input" value={form.mobile_number}
                      onChange={(e) => setField('mobile_number', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email}
                      onChange={(e) => setField('email', e.target.value)} />
                  </div>
                </div>
                {!editingId && (
                  <>
                    <div className="form-checkbox">
                      <input type="checkbox" id="createUser" checked={form.create_user_account}
                        onChange={(e) => setField('create_user_account', e.target.checked)} />
                      <label htmlFor="createUser">Create user account for portal access</label>
                    </div>
                    {form.create_user_account && (
                      <div className="form-group">
                        <label className="form-label">User Password *</label>
                        <input type="password" className="form-input" required={form.create_user_account}
                          value={form.user_password} onChange={(e) => setField('user_password', e.target.value)} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === 1 && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Service Number *</label>
                    <input className="form-input" required disabled={Boolean(editingId)} value={form.service_number}
                      onChange={(e) => setField('service_number', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <LookupSelect type="departments" options={departments} setOptions={setDepartments}
                      value={form.department_id} onChange={(v) => setField('department_id', v)} placeholder="Select department" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Address</label>
                  <textarea className="form-textarea" value={form.unit_address}
                    onChange={(e) => setField('unit_address', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">PIN Code</label>
                    <input className="form-input" value={form.pin_code}
                      onChange={(e) => setField('pin_code', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Educational Qualification</label>
                    <input className="form-input" value={form.educational_qualification}
                      onChange={(e) => setField('educational_qualification', e.target.value)} />
                  </div>
                </div>
                <div className="form-checkbox">
                  <input type="checkbox" id="qee" checked={form.qualifying_essential_education}
                    onChange={(e) => setField('qualifying_essential_education', e.target.checked)} />
                  <label htmlFor="qee">Qualifying Essential Education</label>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Appointment</label>
                    <input type="date" className="form-input" value={form.date_of_appointment}
                      onChange={(e) => setField('date_of_appointment', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Retirement</label>
                    <input type="date" className="form-input" value={form.date_of_retirement}
                      onChange={(e) => setField('date_of_retirement', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 2 && (
              <>
                {documentTypes.map((dt) => {
                  const doc = form.documents.find((d) => d.document_type_id === dt.id);
                  return (
                    <div className="form-checkbox" key={dt.id} style={{ marginBottom: '0.75rem' }}>
                      <input type="checkbox" id={`doc-${dt.id}`} checked={Boolean(doc?.submitted)}
                        onChange={() => toggleDocument(dt.id)} />
                      <label htmlFor={`doc-${dt.id}`}>{dt.label}</label>
                    </div>
                  );
                })}
                {documentTypes.length === 0 && <EmptyState message="No document types configured" />}
              </>
            )}

            {activeTab === 3 && (
              <>
                <div className="form-group">
                  <label className="form-label">Assigned Course</label>
                  <select className="form-select" value={form.course_id} onChange={(e) => setField('course_id', e.target.value)}>
                    <option value="">Select course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-checkbox">
                    <input type="checkbox" id="eligible" checked={form.eligible}
                      onChange={(e) => setField('eligible', e.target.checked)} />
                    <label htmlFor="eligible">Eligible</label>
                  </div>
                  <div className="form-checkbox">
                    <input type="checkbox" id="actualParticipation" checked={form.actual_participation}
                      onChange={(e) => setField('actual_participation', e.target.checked)} />
                    <label htmlFor="actualParticipation">Actual Participation</label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason for Re-allocation, if any</label>
                  <input className="form-input" value={form.reallocation_reason}
                    onChange={(e) => setField('reallocation_reason', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-textarea" value={form.remarks}
                    onChange={(e) => setField('remarks', e.target.value)} />
                </div>
              </>
            )}

            {activeTab === 4 && (
              <div className="form-group">
                <label className="form-label">Medical Category</label>
                <LookupSelect type="medical-categories" options={medicalCategories} setOptions={setMedicalCategories}
                  value={form.medical_category_id} onChange={(v) => setField('medical_category_id', v)} placeholder="Select medical category" />
              </div>
            )}

            {activeTab === 5 && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Movement Order Number</label>
                  <input className="form-input" value={form.movement_order_number}
                    onChange={(e) => setField('movement_order_number', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Movement Order Date</label>
                  <input type="date" className="form-input" value={form.movement_order_date}
                    onChange={(e) => setField('movement_order_date', e.target.value)} />
                </div>
              </div>
            )}

            {activeTab === 6 && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date of Reporting</label>
                  <input type="date" className="form-input" value={form.date_of_reporting}
                    onChange={(e) => setField('date_of_reporting', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reporting Time</label>
                  <select className="form-select" value={form.reporting_time_session}
                    onChange={(e) => setField('reporting_time_session', e.target.value)}>
                    <option value="">Select session</option>
                    <option value="FN">FN (Forenoon)</option>
                    <option value="AN">AN (Afternoon)</option>
                  </select>
                </div>
              </div>
            )}
            </fieldset>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Participant'}</button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
