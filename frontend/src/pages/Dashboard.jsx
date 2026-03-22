import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const STAT_CONFIG = [
    { key: 'total_products', label: 'Products', icon: '📦', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { key: 'total_categories', label: 'Categories', icon: '🏷️', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { key: 'total_sales', label: 'Sales', icon: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { key: 'total_users', label: 'Users', icon: '👥', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
];

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentSales, setRecent] = useState([]);
    const [topProducts, setTop] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/reports/dashboard'),
            api.get('/sales/recent?limit=5'),
            api.get('/products/top?limit=5'),
        ])
            .then(([s, r, t]) => {
                setStats(s.data.data);
                setRecent(r.data.data);
                setTop(t.data.data);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Layout><div className="spinner" /></Layout>;

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome, {user?.name} 👋</h1>
                    <p className="page-sub">EVehicle Supply Chain Management — Web3 Powered</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/products')}>📦 Add Product</button>
                    <button className="btn btn-success btn-sm" onClick={() => navigate('/sales')}>💰 New Sale</button>
                </div>
            </div>

            {/* Stats */}
            <div className="stat-grid">
                {STAT_CONFIG.map(s => (
                    <div className="stat-card" key={s.key} onClick={() => navigate(`/${s.key.replace('total_', '')}`)} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                        <div>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value">{stats?.[s.key] ?? '—'}</div>
                        </div>
                    </div>
                ))}
                <div className="stat-card" style={{ cursor: 'default' }}>
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>💵</div>
                    <div>
                        <div className="stat-label">Total Revenue</div>
                        <div className="stat-value" style={{ fontSize: 20 }}>
                            ₹{parseFloat(stats?.total_revenue || 0).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Recent Sales */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontWeight: 600 }}>Recent Sales</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sales')}>View All →</button>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Date</th></tr></thead>
                            <tbody>
                                {recentSales.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No sales yet</td></tr>
                                ) : recentSales.map(s => (
                                    <tr key={s.id || s._id}>
                                        <td>{s.product_name}</td>
                                        <td>{s.qty}</td>
                                        <td>₹{parseFloat(s.price).toLocaleString('en-IN')}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Products */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontWeight: 600 }}>Top Selling Products</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>View All →</button>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>#</th><th>Product</th><th>Units Sold</th><th>Orders</th></tr></thead>
                            <tbody>
                                {topProducts.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No sales recorded yet</td></tr>
                                ) : topProducts.map((p, i) => (
                                    <tr key={p.id || p._id || i}>
                                        <td><span className="badge badge-primary">{i + 1}</span></td>
                                        <td>{p.name}</td>
                                        <td>{p.totalQty}</td>
                                        <td>{p.totalSold}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
