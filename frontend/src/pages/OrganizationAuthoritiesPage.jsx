import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal, LookupSelect } from '../components/common';
import { toast } from 'react-toastify';

const BUILTIN_AUTHORITY_TYPES = [
  { value: 'director', label: 'Director', scope: 'institute' },
  { value: 'associate_director', label: 'Associate Director', scope: 'institute' },
  { value: 'officer_in_charge', label: 'Officer In Charge', scope: 'institute' },
  { value: 'course_director', label: 'Course Director', scope: 'course' },
  { value: 'course_coordinator', label: 'Course Coordinator', scope: 'course' },
  { value: 'course_supervisor', label: 'Course Supervisor', scope: 'course' },
  { value: 'course_assistant', label: 'Course Assistants', scope: 'course' },
  { value: 'training_instructor', label: 'Training Instructors', scope: 'course' },
  { value: 'training_staff', label: 'Training Staff', scope: 'course' },
];

// director/associate_director/course_director are read by certificateService.js's
// resolveSignatory() to auto-fill certificate signature blocks — any other type
// (built-in or custom) is purely descriptive, so course-scoping defaults to true
// (course-scoped) unless one of the three institute-wide roles is selected.
const INSTITUTE_WIDE_TYPES = new Set(['director', 'associate_director', 'officer_in_charge']);

function labelForCustomType(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const emptyForm = { authority_type: 'director', name: '', rank_id: '', designation_id: '', mobile: '', course_id: '' };

export default function OrganizationAuthoritiesPage() {
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/organization-authorities', { params: { authority_type: typeFilter || undefined } });
      setAuthorities(data.data);
    } catch { toast.error('Failed to load organization authorities'); }
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/lookups/ranks').then((r) => setRanks(r.data.data));
    api.get('/lookups/designations').then((r) => setDesignations(r.data.data));
    api.get('/courses', { params: { limit: 100 } }).then((r) => setCourses(r.data.data));
  }, []);

  const [extraTypeOptions, setExtraTypeOptions] = useState([]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const scopeFor = (type) => INSTITUTE_WIDE_TYPES.has(type) ? 'institute' : 'course';

  // Built-in types + any custom type already used by an existing record + any custom
  // type added via the "+ Add Custom Type" prompt this session (before it's saved).
  const knownValues = new Set(BUILTIN_AUTHORITY_TYPES.map((t) => t.value));
  const customFromRecords = [];
  authorities.forEach((a) => {
    if (!knownValues.has(a.authority_type)) {
      knownValues.add(a.authority_type);
      customFromRecords.push({ value: a.authority_type, label: labelForCustomType(a.authority_type), scope: scopeFor(a.authority_type) });
    }
  });
  const newExtras = extraTypeOptions.filter((t) => !knownValues.has(t.value));
  const ALL_TYPES = [...BUILTIN_AUTHORITY_TYPES, ...customFromRecords, ...newExtras];

  const handleAuthorityTypeChange = (value) => {
    if (value !== '__add_custom__') { setField('authority_type', value); return; }
    const label = window.prompt('Enter the new authority type (e.g. "Deputy Coordinator"):');
    if (!label || !label.trim()) return;
    const slug = slugify(label);
    if (!slug) { toast.error('Enter a valid name (letters/numbers only)'); return; }
    setExtraTypeOptions((prev) => [...prev, { value: slug, label: labelForCustomType(slug), scope: 'course' }]);
    setField('authority_type', slug);
  };

  const openCreateModal = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEditModal = async (a) => {
    setEditingId(a.id);
    setForm({
      authority_type: a.authority_type, name: a.name,
      rank_id: a.rank_id || '', designation_id: a.designation_id || '', mobile: a.mobile || '', course_id: a.course_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      rank_id: form.rank_id || null,
      designation_id: form.designation_id || null,
      course_id: scopeFor(form.authority_type) === 'course' ? (form.course_id || null) : null,
    };
    try {
      if (editingId) {
        await api.put(`/organization-authorities/${editingId}`, payload);
        toast.success('Record updated');
      } else {
        await api.post('/organization-authorities', payload);
        toast.success('Record created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(`/organization-authorities/${id}`);
      toast.success('Record deleted');
      fetchData();
    } catch { toast.error('Failed to delete record'); }
  };

  const grouped = ALL_TYPES.map((t) => ({
    ...t,
    records: authorities.filter((a) => a.authority_type === t.value),
  }));

  return (
    <div>
      <h1 className="page-title">Organization Authorities</h1>
      <p className="page-subtitle">Director, Associate Director, Course Director/Coordinator/Supervisor and staff records</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {ALL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={openCreateModal}>+ Add Record</button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        grouped.filter((g) => !typeFilter || g.value === typeFilter).map((group) => (
          <div className="card" key={group.value} style={{ marginBottom: '1rem' }}>
            <div className="card-header"><h3>{group.label} {group.scope === 'course' ? '(Course-scoped)' : '(Institute-wide)'}</h3></div>
            <div className="card-body table-container">
              {group.records.length === 0 ? <EmptyState message="No records yet" /> : (
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Rank</th><th>Designation</th><th>Mobile</th>{group.scope === 'course' && <th>Course</th>}<th></th></tr>
                  </thead>
                  <tbody>
                    {group.records.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.name}</strong></td>
                        <td>{a.rank_name || '—'}</td>
                        <td>{a.designation_name || '—'}</td>
                        <td>{a.mobile || '—'}</td>
                        {group.scope === 'course' && <td>{a.course_name ? `${a.course_name} (${a.course_code})` : '—'}</td>}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(a)}>Edit</button>{' '}
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(a.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Record' : 'Add Record'}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Authority Type *</label>
              <select className="form-select" required value={form.authority_type} onChange={(e) => handleAuthorityTypeChange(e.target.value)}>
                {ALL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                <option value="__add_custom__">+ Add Custom Type...</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rank</label>
                <LookupSelect type="ranks" options={ranks} setOptions={setRanks}
                  value={form.rank_id} onChange={(v) => setField('rank_id', v)} placeholder="Select rank" />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <LookupSelect type="designations" options={designations} setOptions={setDesignations}
                  value={form.designation_id} onChange={(v) => setField('designation_id', v)} placeholder="Select designation" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mobile</label>
              <input className="form-input" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="Contact number" />
            </div>
            {scopeFor(form.authority_type) === 'course' && (
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-select" required value={form.course_id} onChange={(e) => setField('course_id', e.target.value)}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Record'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
