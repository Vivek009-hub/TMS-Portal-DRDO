import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import { toast } from 'react-toastify';

export default function PasswordResetRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');

  const [approvingRequest, setApprovingRequest] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/password-reset-requests', {
        params: { page, limit: 10, status: statusFilter || undefined },
      });
      setRequests(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load password reset requests'); }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openApproveModal = (request) => {
    setApprovingRequest(request);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/password-reset-requests/${approvingRequest.id}/approve`, {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(`Password set for ${approvingRequest.user_name}. Relay it to them securely.`);
      setApprovingRequest(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    }
    setSubmitting(false);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/password-reset-requests/${rejectingRequest.id}/reject`, { reason: rejectReason });
      toast.success('Request rejected');
      setRejectingRequest(null);
      setRejectReason('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="page-title">Password Reset Requests</h1>
      <p className="page-subtitle">Review requests and set new passwords for users who cannot log in</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : requests.length === 0 ? <EmptyState message="No password reset requests found" /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Requested At</th><th>Status</th>
                    <th>Reviewed By</th><th>Reviewed At</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.user_name}</strong></td>
                      <td>{r.user_email}</td>
                      <td>{new Date(r.requested_at).toLocaleString()}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.reviewer_name || '—'}</td>
                      <td>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {r.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => openApproveModal(r)}>Approve</button>{' '}
                            <button className="btn btn-secondary btn-sm" onClick={() => setRejectingRequest(r)}>Reject</button>
                          </>
                        )}
                        {r.status === 'rejected' && r.review_reason && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{r.review_reason}</span>
                        )}
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

      <Modal isOpen={Boolean(approvingRequest)} onClose={() => setApprovingRequest(null)} title="Approve & Set New Password">
        {approvingRequest && (
          <form onSubmit={handleApprove}>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Set a new password for <strong>{approvingRequest.user_name}</strong> ({approvingRequest.user_email}).
                You will need to relay this password to them securely — it is also emailed to
                them automatically if email is configured.
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
              <button type="button" className="btn btn-secondary" onClick={() => setApprovingRequest(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Approve & Set Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={Boolean(rejectingRequest)} onClose={() => setRejectingRequest(null)} title="Reject Request">
        {rejectingRequest && (
          <form onSubmit={handleReject}>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Reject the password reset request from <strong>{rejectingRequest.user_name}</strong>?
              </p>
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <textarea className="form-textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setRejectingRequest(null)}>Cancel</button>
              <button type="submit" className="btn btn-danger" disabled={submitting}>
                {submitting ? 'Saving...' : 'Reject Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
