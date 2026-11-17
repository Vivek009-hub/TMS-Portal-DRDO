import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // Deliberately ignored: the confirmation message is identical regardless of
      // outcome, so we never reveal whether the email exists or the request failed.
    }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><img src="/drdo-logo2.png" alt="DRDO Logo" className="drdo-logo" /></div>
          <h1>Forgot Password</h1>
          <p>Request a password reset from your administrator</p>
        </div>

        {submitted ? (
          <div>
            <p style={{ textAlign: 'center', color: 'var(--gray-600)', lineHeight: 1.6 }}>
              If an account with that email exists, a password reset request has been
              submitted for administrator review. You will be contacted once it has been
              reviewed.
            </p>
            <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/login">Back to Login</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Request Password Reset'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
              <Link to="/login">Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
