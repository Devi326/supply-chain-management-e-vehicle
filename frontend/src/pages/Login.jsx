import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [errors, setErrors] = useState({});
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrors({});
        try {
            const loggedInUser = await login(form.username, form.password);
            if (loggedInUser) {
                toast.success('Welcome back!');
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            if (err.response?.data?.errors) {
                const newErrors = {};
                err.response.data.errors.forEach(e => {
                    newErrors[e.field] = e.message;
                });
                setErrors(newErrors);
            } else {
                toast.error(err.response?.data?.message || 'Login failed');
            }
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-mesh"></div>

            <div className="login-card animate-stagger">
                <div className="login-logo">
                    <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
                    <h1>EVehicle Supply Chain</h1>
                    <p>Web3-powered Management System</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                            placeholder="Enter username"
                            value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            required
                            autoFocus
                        />
                        {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            placeholder="Enter password"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                        />
                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 12, borderRadius: 12 }}
                        disabled={loading}
                    >
                        {loading ? '⏳ Signing in...' : '🔒 Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 32, padding: '16px', background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 600, marginBottom: 4 }}>⛓️ Blockchain Transparency</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        All vehicle records are secured via distributed ledger technology to ensure 100% data integrity.
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <button className="verify-link" onClick={() => toast.info('Platform version 2.0.0-web2')}>
                        Help & Documentation
                    </button>
                </div>
            </div>
        </div>
    );
}
