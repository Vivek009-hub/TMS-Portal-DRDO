import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { LoadingSpinner, EmptyState, Modal } from './common';
import { toast } from 'react-toastify';

const SANCTION_HEADS = [
  { key: 'course_material', label: 'Course Material (Kit, Bag, Stationary, Photographs, Answer Sheets, ID Cards)' },
  { key: 'hospitality', label: 'Hospitality (Daily Refreshments)' },
  { key: 'honorarium', label: 'Honorarium' },
  { key: 'transport', label: 'Transport' },
  { key: 'mementoes', label: 'Mementoes' },
  { key: 'consumables', label: 'Consumables' },
  { key: 'miscellaneous', label: 'Miscellaneous' },
];

const emptyItemForm = { bill_no: '', expenditure_date: '', details: '', mode_of_payment: '', expenditure_head: '', amount: '' };

function money(n) {
  return n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FundsManagement({ courseId }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ totalExpenditure: 0, amountPaidByCash: 0, cashRefunded: null });
  const [sanctionForm, setSanctionForm] = useState({
    ...Object.fromEntries(SANCTION_HEADS.map((h) => [h.key, 0])),
    cash_drawn_amount: '', cash_drawn_date: '', balance_returned_date: '', bills_submission_date: '',
  });
  const [savingSanction, setSavingSanction] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses/${courseId}/fund-management`);
      const fm = data.data.fundManagement;
      setItems(data.data.items);
      setTotals({
        totalExpenditure: data.data.totalExpenditure,
        amountPaidByCash: data.data.amountPaidByCash,
        cashRefunded: data.data.cashRefunded,
      });
      const base = Object.fromEntries(SANCTION_HEADS.map((h) => [h.key, Number(fm?.[h.key]) || 0]));
      setSanctionForm({
        ...base,
        cash_drawn_amount: fm?.cash_drawn_amount ?? '',
        cash_drawn_date: fm?.cash_drawn_date?.slice(0, 10) || '',
        balance_returned_date: fm?.balance_returned_date?.slice(0, 10) || '',
        bills_submission_date: fm?.bills_submission_date?.slice(0, 10) || '',
      });
    } catch { toast.error('Failed to load funds management data'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setSanctionField = (field, value) => setSanctionForm((f) => ({ ...f, [field]: value }));

  const totalSanctioned = SANCTION_HEADS.reduce((sum, h) => sum + (Number(sanctionForm[h.key]) || 0), 0);

  const handleSaveSanction = async (e) => {
    e.preventDefault();
    setSavingSanction(true);
    try {
      await api.post(`/courses/${courseId}/fund-management`, {
        ...sanctionForm,
        cash_drawn_amount: sanctionForm.cash_drawn_amount === '' ? null : Number(sanctionForm.cash_drawn_amount),
        cash_drawn_date: sanctionForm.cash_drawn_date || null,
        balance_returned_date: sanctionForm.balance_returned_date || null,
        bills_submission_date: sanctionForm.bills_submission_date || null,
      });
      toast.success('Funds sanction saved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSavingSanction(false);
  };

  const openAddItem = () => { setEditingItemId(null); setItemForm(emptyItemForm); setShowItemModal(true); };
  const openEditItem = (item) => {
    setEditingItemId(item.id);
    setItemForm({
      bill_no: item.bill_no || '', expenditure_date: item.expenditure_date?.slice(0, 10) || '',
      details: item.details || '', mode_of_payment: item.mode_of_payment || '',
      expenditure_head: item.expenditure_head || '', amount: item.amount,
    });
    setShowItemModal(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...itemForm, amount: Number(itemForm.amount) || 0, expenditure_date: itemForm.expenditure_date || null };
    try {
      if (editingItemId) {
        await api.put(`/fund-expenditure-items/${editingItemId}`, payload);
        toast.success('Expenditure item updated');
      } else {
        await api.post(`/courses/${courseId}/fund-expenditure-items`, payload);
        toast.success('Expenditure item added');
      }
      setShowItemModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this expenditure item?')) return;
    try {
      await api.delete(`/fund-expenditure-items/${id}`);
      fetchData();
    } catch { toast.error('Failed to delete item'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3>Funds Management — Part 1: Sanction of Funds (Head-wise)</h3></div>
        <div className="card-body">
          <form onSubmit={handleSaveSanction}>
            {SANCTION_HEADS.map((h) => (
              <div className="form-row" key={h.key}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{h.label}</label>
                  <input type="number" min="0" className="form-input" value={sanctionForm[h.key] ?? 0}
                    onChange={(e) => setSanctionField(h.key, e.target.value)} />
                </div>
              </div>
            ))}
            <div className="form-group">
              <strong>Total Amount Sanctioned: {money(totalSanctioned)}</strong>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Part 2: Cash Drawn</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount of Cash Drawn</label>
                <input type="number" min="0" className="form-input" value={sanctionForm.cash_drawn_amount ?? ''}
                  onChange={(e) => setSanctionField('cash_drawn_amount', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Cash Drawn</label>
                <input type="date" className="form-input" value={sanctionForm.cash_drawn_date || ''}
                  onChange={(e) => setSanctionField('cash_drawn_date', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of Balance Cash Returned</label>
                <input type="date" className="form-input" value={sanctionForm.balance_returned_date || ''}
                  onChange={(e) => setSanctionField('balance_returned_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Bills Submission</label>
                <input type="date" className="form-input" value={sanctionForm.bills_submission_date || ''}
                  onChange={(e) => setSanctionField('bills_submission_date', e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingSanction}>
              {savingSanction ? 'Saving...' : 'Save Sanction & Cash Details'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Expenditure Details</h3>
          <button className="btn btn-primary btn-sm" onClick={openAddItem}>+ Add Bill</button>
        </div>
        <div className="card-body table-container">
          {items.length === 0 ? <EmptyState message="No expenditure items recorded" /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill No.</th><th>Date</th><th>Details</th><th>Mode of Payment</th>
                  <th>Head of Expenditure</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.bill_no || '—'}</td>
                    <td>{item.expenditure_date?.slice(0, 10) || '—'}</td>
                    <td>{item.details || '—'}</td>
                    <td>{item.mode_of_payment || '—'}</td>
                    <td>{item.expenditure_head || '—'}</td>
                    <td>{money(item.amount)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditItem(item)}>Edit</button>{' '}
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteItem(item.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card-body" style={{ borderTop: '1px solid var(--gray-200)', display: 'grid', gap: '0.5rem' }}>
          <div><strong>Total Expenditure:</strong> {money(totals.totalExpenditure)}</div>
          <div><strong>Amount Paid by Cash:</strong> {money(totals.amountPaidByCash)}</div>
          <div><strong>Cash Refunded (Drawn − Spent in Cash):</strong> {money(totals.cashRefunded)}</div>
        </div>
      </div>

      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title={editingItemId ? 'Edit Expenditure Item' : 'Add Expenditure Item'}>
        <form onSubmit={handleItemSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bill No.</label>
                <input className="form-input" value={itemForm.bill_no} onChange={(e) => setItemForm({ ...itemForm, bill_no: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={itemForm.expenditure_date}
                  onChange={(e) => setItemForm({ ...itemForm, expenditure_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Details of Expenditure</label>
              <input className="form-input" value={itemForm.details} onChange={(e) => setItemForm({ ...itemForm, details: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mode of Payment</label>
                <select className="form-select" value={itemForm.mode_of_payment}
                  onChange={(e) => setItemForm({ ...itemForm, mode_of_payment: e.target.value })}>
                  <option value="">Select mode</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Head of Expenditure</label>
                <select className="form-select" value={itemForm.expenditure_head}
                  onChange={(e) => setItemForm({ ...itemForm, expenditure_head: e.target.value })}>
                  <option value="">Select head</option>
                  {SANCTION_HEADS.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input type="number" min="0" required className="form-input" value={itemForm.amount}
                onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editingItemId ? 'Save Changes' : 'Add Item'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
