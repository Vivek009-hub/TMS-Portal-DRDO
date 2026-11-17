import { useEffect, useState, useCallback } from 'react';
import api, { downloadFile } from '../api/client';
import { LoadingSpinner, EmptyState } from '../components/common';
import { toast } from 'react-toastify';

export default function ReportsPage() {
  const [reportTypes, setReportTypes] = useState([]);
  const [type, setType] = useState('');
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/reports').then((r) => {
      setReportTypes(r.data.data);
      if (r.data.data.length > 0) setType(r.data.data[0].key);
    });
    api.get('/courses', { params: { limit: 100 } }).then((r) => setCourses(r.data.data));
    api.get('/lookups/departments').then((r) => setDepartments(r.data.data));
  }, []);

  const currentType = reportTypes.find((t) => t.key === type);

  const runReport = useCallback(async () => {
    if (!type) return;
    if (currentType?.requiresCourse && !courseId) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/${type}`, {
        params: { course_id: courseId || undefined, department_id: departmentId || undefined },
      });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
      setResult(null);
    }
    setLoading(false);
  }, [type, courseId, departmentId, currentType]);

  useEffect(() => { runReport(); }, [runReport]);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (departmentId) params.set('department_id', departmentId);
    return params.toString();
  };

  const handleExport = (format) => {
    const query = buildQuery();
    downloadFile(`/reports/${type}/export/${format}${query ? `?${query}` : ''}`, `${type}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
  };

  return (
    <div>
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">Generate and export operational reports</p>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
            {reportTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{currentType?.requiresCourse ? 'Select course *' : 'All Courses'}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
          <select className="form-select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => handleExport('excel')} disabled={!result}>Export Excel</button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')} disabled={!result}>Export PDF</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          {currentType?.requiresCourse && !courseId ? (
            <EmptyState message="Select a course to generate this report" />
          ) : loading ? <LoadingSpinner /> : !result || result.rows.length === 0 ? (
            <EmptyState message="No data found for this report" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>{result.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {result.columns.map((c) => <td key={c.key}>{row[c.key] ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
