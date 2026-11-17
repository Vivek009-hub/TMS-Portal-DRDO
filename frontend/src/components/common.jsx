import { useState } from 'react';
import api from '../api/client';
import { toast } from 'react-toastify';

/**
 * A <select> backed by one of the /lookups/:type tables (ranks, departments,
 * designations, institutes, medical-categories, document-types) that lets the
 * user add a brand-new option inline instead of being limited to whatever is
 * already seeded. `options`/`setOptions` are lifted to the parent so a value
 * added here immediately shows up in any other dropdown (e.g. a filter select)
 * sharing the same state.
 */
export function LookupSelect({
  type, value, onChange, options, setOptions,
  placeholder = 'Select...', addLabel = 'Add new...',
  className = 'form-select', style, required, disabled,
}) {
  const [adding, setAdding] = useState(false);

  const handleChange = async (e) => {
    const val = e.target.value;
    if (val !== '__add_new__') { onChange(val); return; }

    const name = window.prompt('Enter the new value:');
    if (!name || !name.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post(`/lookups/${type}`, { name: name.trim() });
      setOptions((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(String(data.data.id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add new option');
    }
    setAdding(false);
  };

  return (
    <select className={className} style={style} required={required} disabled={disabled || adding}
      value={value} onChange={handleChange}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      <option value="__add_new__">+ {addLabel}</option>
    </select>
  );
}

export function StatusBadge({ status }) {
  const map = {
    draft: 'gray', scheduled: 'info', running: 'success', completed: 'info',
    cancelled: 'danger', pending: 'warning', approved: 'success',
    rejected: 'danger', enrolled: 'info', active: 'success', inactive: 'gray',
    published: 'success', archived: 'gray',
    completion: 'success', participation: 'info', detention: 'warning', appreciation: 'success',
    returned_to_unit: 'danger',
    present: 'success', absent: 'danger', late: 'warning', excused: 'info',
  };
  return <span className={`badge badge-${map[status] || 'gray'}`}>{status}</span>;
}

export function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
    </div>
  );
}

export function EmptyState({ message = 'No data found' }) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p>{message}</p>
    </div>
  );
}

export function Pagination({ pagination, onPageChange }) {
  if (!pagination) return null;
  const { page, totalPages, total, limit } = pagination;
  return (
    <div className="pagination">
      <span>Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}</span>
      <div className="pagination-buttons">
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = '' }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** `delta` compares the current period to the immediately preceding period of the same
 * length; omit it for snapshot/current-state values where that comparison wouldn't mean
 * anything (e.g. "Total Faculty"). `deltaUnit` is '%' for a percentage change (default) or
 * 'pts' for an already-a-percentage value where the delta is itself percentage points
 * (e.g. attendance 82% vs 78% prior = "+4 pts", not "+5.1%"). */
export function StatCard({ icon, label, value, color = 'blue', delta, deltaNote, deltaUnit = '%' }) {
  const direction = delta == null || Number.isNaN(delta) ? null : delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {direction && (
          <div className={`stat-delta ${direction}`}>
            <span>{direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'}</span>
            <span>{Math.abs(delta).toFixed(1)}{deltaUnit === 'pts' ? ' pts' : '%'}</span>
            {deltaNote && <span className="stat-delta-note">{deltaNote}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function RatingInput({ value, onChange, label }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="rating-input">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`rating-star ${star <= value ? 'active' : ''}`}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

