import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

export default function Categories() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '' });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [errors, setErrors] = useState({});

    const load = async () => { setLoading(true); const r = await api.get('/categories'); setItems(r.data.data); setLoading(false); };
    useEffect(() => { load(); }, []);

    const openAdd = () => { setForm({ name: '' }); setEditId(null); setErrors({}); setModal('add'); };
    const openEdit = (c) => { setForm({ name: c.name }); setEditId(c.id); setErrors({}); setModal('edit'); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setErrors({});
        try {
            modal === 'add' ? await api.post('/categories', form) : await api.put(`/categories/${editId}`, form);
            toast.success(modal === 'add' ? 'Category added!' : 'Category updated!');
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
            await api.delete(`/categories/${id}`); 
            toast.success('Category deleted'); 
            load(); 
        } catch (err) { 
            console.error('Delete category FAILED:', err);
            const msg = err.response?.data?.message || 'Delete failed';
            toast.error(msg, { duration: 6000 }); 
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <div><h1 className="page-title">Categories</h1><p className="page-sub">{items.length} categories</p></div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Category</button>
            </div>

            {loading ? <div className="spinner" /> : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>#</th><th>Category Name</th><th>Actions</th></tr></thead>
                        <tbody>
                            {items.map((c, i) => (
                                <tr key={c.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️ Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
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
                            <p>Are you sure you want to delete this category? This might affect products using it.</p>
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
                            <h3 className="modal-title">{modal === 'add' ? 'Add Category' : 'Edit Category'}</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Category Name *</label>
                                <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={e => setForm({ name: e.target.value })} required autoFocus />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
