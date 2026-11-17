import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal, LookupSelect } from '../components/common';
import { toast } from 'react-toastify';

const emptyForm = {
  name: '', rank_id: '', designation_id: '', institute_id: '', mobile: '', email: '',
  address: '', expertise: '', status: 'active',
};

export default function FacultyPage() {
  const [searchParams] = useSearchParams();
  const [faculty, setFaculty] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [rankFilter, setRankFilter] = useState('');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showInstituteModal, setShowInstituteModal] = useState(false);
  const [instituteForm, setInstituteForm] = useState({ name: '', phone: '', fax: '', email: '', address: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/faculty', {
        params: { page, search, limit: 10, rank_id: rankFilter || undefined, institute_id: instituteFilter || undefined, status: statusFilter || undefined },
      });
      setFaculty(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load faculty'); }
    setLoading(false);
  }, [page, search, rankFilter, instituteFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/lookups/ranks').then((r) => setRanks(r.data.data));
    api.get('/lookups/designations').then((r) => setDesignations(r.data.data));
    api.get('/lookups/institutes').then((r) => setInstitutes(r.data.data));
  }, []);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const openInstituteModal = () => {
    const inst = institutes.find((i) => String(i.id) === String(form.institute_id));
    if (!inst) { toast.error('Select an institute first'); return; }
    setInstituteForm({
      id: inst.id, name: inst.name, phone: inst.phone || '', fax: inst.fax || '',
      email: inst.email || '', address: inst.address || '',
    });
    setShowInstituteModal(true);
  };

  const handleInstituteSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/lookups/institutes/${instituteForm.id}`, instituteForm);
      setInstitutes((prev) => prev.map((i) => (i.id === data.data.id ? data.data : i)));
      toast.success('Institute contact details updated');
      setShowInstituteModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update institute'); }
  };

  const openCreateModal = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEditModal = async (id) => {
    try {
      const { data } = await api.get(`/faculty/${id}`);
      const f = data.data;
      setEditingId(id);
      setForm({ ...emptyForm, ...f, rank_id: f.rank_id || '', designation_id: f.designation_id || '', institute_id: f.institute_id || '' });
      setShowModal(true);
    } catch { toast.error('Failed to load faculty record'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      rank_id: form.rank_id || null,
      designation_id: form.designation_id || null,
      institute_id: form.institute_id || null,
    };
    try {
      if (editingId) {
        await api.put(`/faculty/${editingId}`, payload);
        toast.success('Faculty updated');
      } else {
        await api.post('/faculty', payload);
        toast.success('Faculty created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save faculty record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this faculty record?')) return;
    try {
      await api.delete(`/faculty/${id}`);
      toast.success('Faculty deleted');
      fetchData();
    } catch { toast.error('Failed to delete faculty record'); }
  };

  return (
    <div>
      <h1 className="page-title">Faculty Management</h1>
      <p className="page-subtitle">Manage instructors and assign them to courses</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search faculty..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-select" value={rankFilter} onChange={(e) => { setRankFilter(e.target.value); setPage(1); }}>
            <option value="">All Ranks</option>
            {ranks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="form-select" value={instituteFilter} onChange={(e) => { setInstituteFilter(e.target.value); setPage(1); }}>
            <option value="">All Institutes</option>
            {institutes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={openCreateModal}>+ Add Faculty</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : faculty.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Rank</th><th>Designation</th><th>Institute</th>
                    <th>Mobile</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.name}</strong></td>
                      <td>{f.rank_name || '—'}</td>
                      <td>{f.designation_name || '—'}</td>
                      <td>{f.institute_name || '—'}</td>
                      <td>{f.mobile || '—'}</td>
                      <td><StatusBadge status={f.status} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(f.id)}>Edit</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(f.id)}>Delete</button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Faculty' : 'Add Faculty'} size="modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Rank</label>
                <LookupSelect type="ranks" options={ranks} setOptions={setRanks}
                  value={form.rank_id} onChange={(v) => setField('rank_id', v)} placeholder="Select rank" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Designation</label>
                <LookupSelect type="designations" options={designations} setOptions={setDesignations}
                  value={form.designation_id} onChange={(v) => setField('designation_id', v)} placeholder="Select designation" />
              </div>
              <div className="form-group">
                <label className="form-label">Institute</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <LookupSelect type="institutes" options={institutes} setOptions={setInstitutes}
                    value={form.institute_id} onChange={(v) => setField('institute_id', v)} placeholder="Select institute" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={openInstituteModal}
                    title="Edit institute contact details (phone/fax/email/address)">Edit</button>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Expertise</label>
              <input className="form-input" value={form.expertise} onChange={(e) => setField('expertise', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create Faculty'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showInstituteModal} onClose={() => setShowInstituteModal(false)} title={`Edit Institute: ${instituteForm.name || ''}`}>
        <form onSubmit={handleInstituteSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={instituteForm.phone}
                onChange={(e) => setInstituteForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fax</label>
              <input className="form-input" value={instituteForm.fax}
                onChange={(e) => setInstituteForm((f) => ({ ...f, fax: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={instituteForm.email}
                onChange={(e) => setInstituteForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-input" rows={3} value={instituteForm.address}
                onChange={(e) => setInstituteForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowInstituteModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
