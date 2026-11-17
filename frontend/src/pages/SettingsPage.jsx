import { useEffect, useState } from 'react';
import api from '../api/client';
import { LoadingSpinner } from '../components/common';
import { toast } from 'react-toastify';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      setSettings(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings(settings.map((s) => s.setting_key === key ? { ...s, setting_value: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = settings.map((s) => ({
        key: s.setting_key,
        value: s.setting_value,
        description: s.description,
      }));
      const { data } = await api.put('/settings', { settings: payload });
      setSettings(data.data);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="page-title">System Settings</h1>
      <p className="page-subtitle">Configure portal settings and preferences</p>

      <div className="card" style={{ maxWidth: 700 }}>
        <div className="card-body">
          {settings.map((s) => (
            <div className="form-group" key={s.setting_key}>
              <label className="form-label">{s.setting_key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</label>
              {s.description && <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>{s.description}</p>}
              {s.setting_value === 'true' || s.setting_value === 'false' ? (
                <select className="form-select" value={s.setting_value}
                  onChange={(e) => handleChange(s.setting_key, e.target.value)}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              ) : (
                <input className="form-input" value={s.setting_value || ''}
                  onChange={(e) => handleChange(s.setting_key, e.target.value)} />
              )}
            </div>
          ))}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
