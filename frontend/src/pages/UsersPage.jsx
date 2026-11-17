import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import { toast } from 'react-toastify';

const emptyForm = { email: '', password: '', first_name: '', last_name: '', role: 'user' };

export default function UsersPage() {
  const { user: currentUser } = useSelector((state) => state.auth);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', {
        params: {
          page, limit: 10, search: search || undefined,
          role: roleFilter || undefined,
          is_active: statusFilter || undefined,
        },
      });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEditModal = (u) => {
    setEditingId(u.id);
    setForm({ email: u.email, password: '', first_name: u.first_name, last_name: u.last_name, role: u.role });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, {
          email: form.email, first_name: form.first_name, last_name: form.last_name, role: form.role,
        });
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'User deactivated' : 'User activated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.first_name} ${u.last_name}? This permanently deletes the account and cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openPasswordModal = (u) => { setPasswordTarget(u); setNewPassword(''); setConfirmPassword(''); };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/users/${passwordTarget.id}/password`, {
        new_password: newPassword, confirm_password: confirmPassword,
      });
      toast.success(`Password updated for ${passwordTarget.first_name} ${passwordTarget.last_name}`);
      setPasswordTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="page-title">User Management</h1>
      <p className="page-subtitle">Create and manage portal user accounts (no public registration)</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search users..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="form-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>+ Create User</button>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : users.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th>
                    {isSuperAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.first_name} {u.last_name}</td>
                      <td>{u.email}</td>
                      <td><StatusBadge status={u.role.replace('_', ' ')} /></td>
                      <td><StatusBadge status={u.is_active ? 'active' : 'inactive'} /></td>
                      <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      {isSuperAdmin && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(u)}>Edit</button>{' '}
                          <button className="btn btn-secondary btn-sm" onClick={() => openPasswordModal(u)}>Set Password</button>{' '}
                          <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(u)}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>{' '}
                          {u.role !== 'super_admin' && u.id !== currentUser.id && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>Delete</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit User' : 'Create User Account'}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" required value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" required value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            {!editingId && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" required minLength={8} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">User (Participant)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {editingId && (
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                To change this user's password, close this dialog and use "Set Password" instead.
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(passwordTarget)} onClose={() => setPasswordTarget(null)} title="Set New Password">
        {passwordTarget && (
          <form onSubmit={handleSetPassword}>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Set a new password for <strong>{passwordTarget.first_name} {passwordTarget.last_name}</strong> ({passwordTarget.email}).
                Relay it to them securely — it is also emailed to them automatically if email is configured.
              </p>
              <div className="form-group">
                <label className="form-label">New Password *</label>
                <input type="password" className="form-input" required minLength={8}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <input type="password" className="form-input" required minLength={8}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPasswordTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
