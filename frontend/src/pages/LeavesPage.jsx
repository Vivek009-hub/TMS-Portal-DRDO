import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import api, { downloadFile } from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import { toast } from 'react-toastify';

export default function LeavesPage({ participantView = false }) {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [searchParams] = useSearchParams();
  const [leaves, setLeaves] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    leave_type: 'casual', start_date: '', end_date: '', reason: '', course_id: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leaves', { params: { page, limit: 10, status: statusFilter || undefined } });
      setLeaves(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load leaves'); }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', form);
      toast.success('Leave request submitted');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/leaves/${id}/status`, { status });
      toast.success(`Leave ${status}`);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleExport = (format) => {
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    downloadFile(`/leaves/export/${format}`, `leaves.${ext}`, { params: { status: statusFilter || undefined } })
      .catch(() => toast.error('Export failed'));
  };

  return (
    <div>
      <h1 className="page-title">{participantView ? 'My Leave Requests' : 'Leave Management'}</h1>
      <p className="page-subtitle">
        {participantView ? 'Submit and track your leave requests' : 'Review and manage participant leave requests'}
      </p>

      {(participantView || !isAdmin) && (
        <div className="toolbar">
          <div />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Request Leave</button>
        </div>
      )}

      {isAdmin && !participantView && (
        <div className="toolbar">
          <div className="toolbar-left">
            <select className="form-select" style={{ maxWidth: 160 }} value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {['pending', 'approved', 'rejected', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-secondary" onClick={() => handleExport('excel')}>Export Excel</button>
            <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>Export PDF</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : leaves.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    {isAdmin && !participantView && <th>Participant</th>}
                    <th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th>
                    {isAdmin && !participantView && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id}>
                      {isAdmin && !participantView && <td>{l.first_name} {l.last_name}</td>}
                      <td>{l.leave_type}</td>
                      <td>{l.start_date}</td>
                      <td>{l.end_date}</td>
                      <td>{l.reason?.substring(0, 50)}{l.reason?.length > 50 ? '...' : ''}</td>
                      <td><StatusBadge status={l.status} /></td>
                      {isAdmin && !participantView && l.status === 'pending' && (
                        <td>
                          <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(l.id, 'approved')}>Approve</button>
                          {' '}
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(l.id, 'rejected')}>Reject</button>
                        </td>
                      )}
                      {isAdmin && !participantView && l.status !== 'pending' && <td>—</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Leave Type *</label>
              <select className="form-select" value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                <option value="casual">Casual</option>
                <option value="medical">Medical</option>
                <option value="emergency">Emergency</option>
                <option value="official">Official</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-input" required value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input type="date" className="form-input" required value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <textarea className="form-textarea" required value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
