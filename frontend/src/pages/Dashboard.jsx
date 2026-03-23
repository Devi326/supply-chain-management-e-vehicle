import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useWeb3 } from '../context/Web3Context';

// Blockchain configuration
let CONTRACT_ADDRESS = null;
let CONTRACT_ABI = null;
try {
    const contractInfo = await import('../contracts/SupplyChain.json').catch(() => null);
    if (contractInfo) { CONTRACT_ADDRESS = contractInfo.address; CONTRACT_ABI = contractInfo.abi; }
} catch { /* contract may not be deployed yet */ }

const STAT_CONFIG = [
    { key: 'total_products', label: 'Products', icon: '📦', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { key: 'total_categories', label: 'Categories', icon: '🏷️', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { key: 'total_sales', label: 'Sales', icon: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { key: 'total_users', label: 'Users', icon: '👥', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
];

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isConnected, networkType, updateRpc } = useWeb3();

    const [stats, setStats] = useState(null);
    const [recentSales, setRecent] = useState([]);
    const [topProducts, setTop] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Buy Modal State
    const [buyModal, setBuyModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ product_id: '', qty: '1', price: '', date: new Date().toISOString().split('T')[0] });
    const [errors, setErrors] = useState({});

    const loadData = () => {
        setLoading(true);
        Promise.all([
            api.get('/reports/dashboard'),
            api.get('/sales/recent?limit=5'),
            api.get('/products/top?limit=5'),
            api.get('/products'),
        ])
            .then(([s, r, t, p]) => {
                setStats(s.data.data);
                setRecent(r.data.data);
                setTop(t.data.data);
                setProducts(p.data.data);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const openBuyModal = (product = null) => {
        if (product) {
            setForm({
                product_id: product.id || product._id,
                qty: '1',
                price: product.sale_price,
                date: new Date().toISOString().split('T')[0]
            });
        } else {
            setForm({ product_id: '', qty: '1', price: '', date: new Date().toISOString().split('T')[0] });
        }
        setErrors({});
        setBuyModal(true);
    };

    const recordOnChain = async (saleId, productId, productName, qty, price) => {
        if (networkType === 'ethereum') {
            if (!CONTRACT_ADDRESS || !CONTRACT_ABI) return null;
            if (!isConnected) {
                toast.error('Wallet not connected. Connect wallet to record on blockchain.');
                return null;
            }
            try {
                const { ethers } = await import('ethers');
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                const fmtSaleId = typeof saleId === 'string' && /^[0-9a-fA-F]{24}$/.test(saleId)
                    ? BigInt('0x' + saleId)
                    : BigInt(saleId);
                const fmtProductId = typeof productId === 'string' && /^[0-9a-fA-F]{24}$/.test(productId)
                    ? BigInt('0x' + productId)
                    : BigInt(productId);
                const priceWei = BigInt(Math.round(price * 100));

                const tx = await contract.recordSale(fmtSaleId, fmtProductId, productName, qty, priceWei);
                toast.loading('Waiting for confirmation...', { id: 'chain-tx' });
                await tx.wait();
                toast.success('Recorded on Ethereum! ⛓️', { id: 'chain-tx' });
                return tx.hash;
            } catch (err) {
                console.error(err);
                if (err.code === -32002 || err.message?.includes('RPC endpoint returned too many errors')) {
                    toast.error((t) => (
                        <span>
                            Blockchain busy. <button onClick={() => { updateRpc(); toast.dismiss(t.id); }} style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', marginLeft: 8 }}>Fix Now ⚡</button>
                        </span>
                    ), { id: 'chain-tx', duration: 10000 });
                } else {
                    toast.error('Ethereum record failed: ' + (err.reason || err.message), { id: 'chain-tx' });
                }
                return null;
            }
        }
        return null;
    };

    const handleBuySubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const r = await api.post('/sales', form);
            const newId = r.data.id;
            const prod = products.find(p => p.id == form.product_id);

            toast.success('Purchase successful! 📦');

            // Optional: Blockchain recording
            if (isConnected && CONTRACT_ADDRESS) {
                const txHash = await recordOnChain(newId, form.product_id, prod?.name || '', parseInt(form.qty), parseFloat(form.price));
                if (txHash) await api.put(`/sales/${newId}`, { tx_hash: txHash });
            }

            setBuyModal(false);
            loadData();
        } catch (err) {
            if (err.response?.data?.errors) {
                const newErrors = {};
                err.response.data.errors.forEach(e => { newErrors[e.field] = e.message; });
                setErrors(newErrors);
            } else {
                toast.error(err.response?.data?.message || 'Purchase failed');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading && !stats) return <Layout><div className="spinner" /></Layout>;

    const isLevel3 = parseInt(user?.user_level) === 3;

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome, {user?.name} 👋</h1>
                    <p className="page-sub">EVehicle Supply Chain Management — Web3 Powered</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {!isLevel3 && (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/products')}>📦 Add Product</button>
                    )}
                    <button className={isLevel3 ? "btn btn-primary" : "btn btn-success btn-sm"} onClick={() => isLevel3 ? openBuyModal() : navigate('/sales')}>
                        {isLevel3 ? "🛒 Buy Now" : "💰 New Sale"}
                    </button>
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
                            <thead><tr><th>#</th><th>Product</th><th>Units Sold</th>{isLevel3 && <th>Price</th>}<th>Action</th></tr></thead>
                            <tbody>
                                {topProducts.length === 0 ? (
                                    <tr><td colSpan={isLevel3 ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No sales recorded yet</td></tr>
                                ) : topProducts.map((p, i) => (
                                    <tr key={p.id || p._id || i}>
                                        <td><span className="badge badge-primary">{i + 1}</span></td>
                                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                                        <td>{p.totalQty}</td>
                                        {isLevel3 && <td>₹{parseFloat(p.sale_price || 0).toLocaleString()}</td>}
                                        <td>
                                            <button className="btn btn-primary btn-sm" onClick={() => openBuyModal(p)}>
                                                🛒 Buy
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Buy Modal */}
            {buyModal && (
                <div className="modal-backdrop" onClick={() => setBuyModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">📦 Purchase Product</h3>
                            <button className="modal-close" onClick={() => setBuyModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleBuySubmit}>
                            <div className="form-group">
                                <label className="form-label">Select Product *</label>
                                <select className={`form-control ${errors.product_id ? 'is-invalid' : ''}`} value={form.product_id} onChange={e => {
                                    const p = products.find(prod => (prod.id || prod._id) == e.target.value);
                                    setForm(f => ({ ...f, product_id: e.target.value, price: p ? p.sale_price : '' }));
                                }} required>
                                    <option value="">Select Product…</option>
                                    {products.map(p => (
                                        <option key={p.id || p._id} value={p.id || p._id}>
                                            {p.name} (Stock: {p.quantity}) — ₹{parseFloat(p.sale_price).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                                {errors.product_id && <div className="invalid-feedback">{errors.product_id}</div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Quantity *</label>
                                    <input type="number" className={`form-control ${errors.qty ? 'is-invalid' : ''}`} value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} min="1" required />
                                    {errors.qty && <div className="invalid-feedback">{errors.qty}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Price (₹) *</label>
                                    <input type="number" step="0.01" className={`form-control ${errors.price ? 'is-invalid' : ''}`} value={form.price} readOnly />
                                </div>
                            </div>

                            {isConnected && CONTRACT_ADDRESS && (
                                <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--accent-light)' }}>
                                    ⛓️ This purchase will be recorded on the Ethereum blockchain via MetaMask.
                                </div>
                            )}

                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setBuyModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Processing...' : '💳 Confirm Purchase'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
