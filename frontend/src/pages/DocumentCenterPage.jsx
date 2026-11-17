import { useEffect, useState, useCallback } from 'react';
import api, { downloadFile } from '../api/client';
import { LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import { toast } from 'react-toastify';

export default function DocumentCenterPage({ participantView = false }) {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'course_material', is_public: true });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/documents', { params: { page, limit: 10 } });
      setDocuments(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load documents'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[type="file"]');
    if (!fileInput?.files[0]) { toast.error('Please select a file'); return; }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));

    try {
      await api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded');
      setShowModal(false);
      fetchData();
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleDownload = (id, name) => downloadFile(`/documents/${id}/download`, name);

  return (
    <div>
      <h1 className="page-title">{participantView ? 'Course Materials' : 'Document Center'}</h1>
      <p className="page-subtitle">
        {participantView ? 'Access your course materials and resources' : 'Upload and manage training documents'}
      </p>

      {!participantView && (
        <div className="toolbar">
          <div />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Upload Document</button>
        </div>
      )}

      <div className="card">
        <div className="card-body table-container">
          {loading ? <LoadingSpinner /> : documents.length === 0 ? <EmptyState /> : (
            <>
              <table className="data-table">
                <thead>
                  <tr><th>Title</th><th>Category</th><th>Course</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.title}</strong></td>
                      <td>{d.category.replace('_', ' ')}</td>
                      <td>{d.course_name || '—'}</td>
                      <td>{(d.file_size / 1024).toFixed(1)} KB</td>
                      <td>{new Date(d.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDownload(d.id, d.file_name)}>
                          Download
                        </button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Document">
        <form onSubmit={handleUpload}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="course_material">Course Material</option>
                <option value="policy">Policy</option>
                <option value="form">Form</option>
                <option value="report">Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">File *</label>
              <input type="file" className="form-input" required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Upload</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
