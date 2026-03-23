import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useWeb3 } from '../context/Web3Context';

// Try to load contract info (may not exist until Hardhat deploys)
let CONTRACT_ADDRESS = null;
let CONTRACT_ABI = null;
try {
    const contractInfo = await import('../contracts/SupplyChain.json').catch(() => null);
    if (contractInfo) { CONTRACT_ADDRESS = contractInfo.address; CONTRACT_ABI = contractInfo.abi; }
} catch { /* contract may not be deployed yet */ }

export default function Sales() {
    const { isConnected, networkType } = useWeb3();
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ product_id: '', qty: '', price: '', date: new Date().toISOString().split('T')[0] });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [errors, setErrors] = useState({});

    const load = async () => {
        setLoading(true);
        const [s, p] = await Promise.all([api.get('/sales'), api.get('/products')]);
        setSales(s.data.data);
        setProducts(p.data.data);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);



    const openAdd = () => {
        setForm({ product_id: '', qty: '1', price: '', date: new Date().toISOString().split('T')[0] });
        setEditId(null); setErrors({}); setModal('add');
    };
    const openEdit = (s) => {
        setForm({ product_id: s.product_id, qty: s.qty, price: s.price, date: s.date });
        setEditId(s.id); setErrors({}); setModal('edit');
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
        } else {
            // Solana Logic
            try {
                const { PublicKey, Connection, clusterApiUrl } = await import('@solana/web3.js');
                const { Program, AnchorProvider, BN } = await import('@coral-xyz/anchor');
                const { Buffer } = await import('buffer');
                const idl = await import('../contracts/supply_chain.json');

                // Custom fetch with retry logic to control RPC rate limits (429 errors)
                const customFetch = async (url, options) => {
                    let retries = 3;
                    while (retries > 0) {
                        const res = await fetch(url, options);
                        if (res.status === 429) {
                            console.warn(`Solana RPC Rate Limit (429). Retrying in 2s...`);
                            await new Promise(r => setTimeout(r, 2000));
                            retries--;
                            continue;
                        }
                        return res;
                    }
                    return fetch(url, options);
                };

                const connection = new Connection(clusterApiUrl('devnet'), { commitment: 'confirmed', fetch: customFetch });
                const provider = new AnchorProvider(connection, window.solana, { preflightCommitment: 'confirmed' });
                const programId = new PublicKey(idl.address);
                const program = new Program(idl.default, programId, provider);

                // Convert IDs - for Solana we might use a different scheme, but here we try to map them
                const sId = new BN(typeof saleId === 'string' ? 123 : saleId); // Placeholder ID conversion
                const pId = new BN(typeof productId === 'string' ? 456 : productId);
                const priceLamports = new BN(Math.round(price * 100));

                const [salePDA] = PublicKey.findProgramAddressSync(
                    [Buffer.from("sale"), sId.toArrayLike(Buffer, "le", 8)],
                    programId
                );

                const tx = await program.methods
                    .recordSale(sId, pId, productName, new BN(qty), priceLamports)
                    .accounts({
                        sale: salePDA,
                        seller: provider.wallet.publicKey,
                        systemProgram: PublicKey.default,
                    })
                    .rpc();

                toast.loading('Waiting for Solana confirmation...', { id: 'chain-tx' });
                toast.success('Recorded on Solana! ⚡', { id: 'chain-tx' });
                return tx;
            } catch (err) {
                console.error('Solana record failed:', err);
                toast.error('Solana record failed: ' + err.message, { id: 'chain-tx' });
                return null;
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setErrors({});
        try {
            if (modal === 'add') {
                const r = await api.post('/sales', form);
                const newId = r.data.id;
                const prod = products.find(p => p.id == form.product_id);
                // Pass raw IDs (strings) to recordOnChain - it now handles hex string conversion
                const txHash = await recordOnChain(newId, form.product_id, prod?.name || '', parseInt(form.qty), parseFloat(form.price));
                if (txHash) await api.put(`/sales/${newId}`, { tx_hash: txHash });
                toast.success('Sale added!');
            } else {
                await api.put(`/sales/${editId}`, form);
                toast.success('Sale updated!');
            }
            setModal(null); load();
        } catch (err) {
            if (err.response?.data?.errors) {
                const newErrors = {};
                err.response.data.errors.forEach(e => {
                    newErrors[e.field] = e.message;
                });
                setErrors(newErrors);
            } else {
                toast.error(err.response?.data?.message || 'Error');
            }
        } finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        setConfirmDelete(id);
    };

    const confirmAndDelete = async () => {
        const id = confirmDelete;
        setConfirmDelete(null);
        try {
            await api.delete(`/sales/${id}`);
            toast.success('Sale record deleted');
            load();
        } catch (err) {
            console.error('Delete sale FAILED:', err);
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <div><h1 className="page-title">Sales</h1><p className="page-sub">{sales.length} total sales transactions</p></div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Sale</button>
            </div>

            {!CONTRACT_ADDRESS && (
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    ⛓️ <strong>Blockchain not connected.</strong> Connect MetaMask to the Sepolia network to enable on-chain sale recording.
                </div>
            )}

            {loading ? <div className="spinner" /> : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr><th>#</th><th>Product</th><th>Qty</th><th>Price</th><th>Date</th><th>Blockchain</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No sales yet</td></tr>
                            ) : sales.map((s, i) => (
                                <tr key={s.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{s.product_name}</td>
                                    <td>{s.qty}</td>
                                    <td>₹{parseFloat(s.price).toLocaleString('en-IN')}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.date}</td>
                                    <td>
                                        {s.tx_hash ? (
                                            <span className="badge badge-success" title={s.tx_hash}>⛓️ On-chain</span>
                                        ) : (
                                            <span className="badge badge-warning">DB only</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {confirmDelete && (
                <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Delete</h3>
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px 0' }}>
                            <p>Are you sure you want to delete this sale record? Inventory will be restored.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmAndDelete}>🗑️ Delete Permanently</button>
                        </div>
                    </div>
                </div>
            )}
            {modal && (
                <div className="modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{modal === 'add' ? '+ Add Sale' : 'Edit Sale'}</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Product *</label>
                                <select className={`form-control ${errors.product_id ? 'is-invalid' : ''}`} value={form.product_id} onChange={e => {
                                    const p = products.find(prod => prod.id == e.target.value);
                                    setForm(f => ({ ...f, product_id: e.target.value, price: p ? p.sale_price : '' }));
                                }} required>
                                    <option value="">Select Product…</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}
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
                                    <input type="number" step="0.01" className={`form-control ${errors.price ? 'is-invalid' : ''}`} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                                    {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sale Date</label>
                                <input type="date" className="form-control" value={form.date?.split('T')[0]} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                            {modal === 'add' && CONTRACT_ADDRESS && (
                                <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--accent-light)' }}>
                                    ⛓️ This sale will also be recorded on the Ethereum blockchain via MetaMask.
                                </div>
                            )}
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : modal === 'add' ? '+ Record Sale' : '💾 Update'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
