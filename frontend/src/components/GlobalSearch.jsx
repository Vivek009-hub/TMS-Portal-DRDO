import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function GlobalSearch() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (term.trim().length < 2) { setResults(null); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/search', { params: { q: term.trim() } });
        setResults(data.data);
        setOpen(true);
      } catch {
        setResults(null);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [term]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  const hasResults = results && (
    results.participants.length || results.courses.length || results.faculty.length || results.certificates.length
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 320 }}>
      <input
        className="form-input"
        placeholder="Search participants, courses, faculty, certificates..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => results && setOpen(true)}
      />
      {open && (
        <div className="card" style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 200,
          maxHeight: 400, overflowY: 'auto', boxShadow: 'var(--shadow-md)',
        }}>
          <div className="card-body" style={{ padding: '0.5rem' }}>
            {loading && <div style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Searching...</div>}
            {!loading && !hasResults && <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>No matches found</div>}

            {results?.participants?.length > 0 && (
              <div>
                <div className="nav-section-title" style={{ color: 'var(--gray-500)' }}>Participants</div>
                {results.participants.map((p) => (
                  <div key={p.id} className="nav-link" style={{ cursor: 'pointer' }}
                    onClick={() => goTo(`/participants?search=${encodeURIComponent(p.service_number)}`)}>
                    {p.service_number} — {p.first_name} {p.last_name} {p.rank_name ? `(${p.rank_name})` : ''}
                  </div>
                ))}
              </div>
            )}
            {results?.courses?.length > 0 && (
              <div>
                <div className="nav-section-title" style={{ color: 'var(--gray-500)' }}>Courses</div>
                {results.courses.map((c) => (
                  <div key={c.id} className="nav-link" style={{ cursor: 'pointer' }}
                    onClick={() => goTo(`/courses?search=${encodeURIComponent(c.code)}`)}>
                    {c.code} — {c.name}
                  </div>
                ))}
              </div>
            )}
            {results?.faculty?.length > 0 && (
              <div>
                <div className="nav-section-title" style={{ color: 'var(--gray-500)' }}>Faculty</div>
                {results.faculty.map((f) => (
                  <div key={f.id} className="nav-link" style={{ cursor: 'pointer' }}
                    onClick={() => goTo(`/faculty?search=${encodeURIComponent(f.name)}`)}>
                    {f.name}
                  </div>
                ))}
              </div>
            )}
            {results?.certificates?.length > 0 && (
              <div>
                <div className="nav-section-title" style={{ color: 'var(--gray-500)' }}>Certificates</div>
                {results.certificates.map((c) => (
                  <div key={c.id} className="nav-link" style={{ cursor: 'pointer' }}
                    onClick={() => goTo('/certificates')}>
                    {c.certificate_number} — {c.first_name} {c.last_name} ({c.type})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
