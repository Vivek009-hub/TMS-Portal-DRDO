import { useEffect, useState } from 'react';
import api from '../api/client';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination } from '../components/common';

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get('/attendance', { params: { page, limit: 10 } }).then((res) => {
      setRecords(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="page-title">My Attendance</h1>
      <p className="page-subtitle">View your training attendance records</p>

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : records.length === 0 ? <EmptyState message="No attendance records" /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Course</th><th>Status</th><th>Remarks</th></tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.attendance_date}</td>
                      <td>{r.course_name}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.remarks || '—'}</td>
                    </tr>
                  ))}
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
