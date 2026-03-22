import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Groups() {
    const { user: me } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [form, setForm] = useState({ group_name: '', group_level: '', group_status: '1' });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const load = async () => { setLoading(true); const r = await api.get('/groups'); setItems(r.data.data); setLoading(false); };
    useEffect(() => { load(); }, []);

    const userLevel = parseInt(me?.user_level || 3);
    const isAdmin = userLevel === 1;

    const openAdd = () => { setForm({ group_name: '', group_level: '', group_status: '1' }); setEditId(null); setErrors({}); setModal('add'); };
    const openEdit = (g) => { setForm({ group_name: g.group_name, group_level: String(g.group_level), group_status: String(g.group_status) }); setEditId(g.id); setErrors({}); setModal('edit'); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setErrors({});
        try {
            modal === 'add' ? await api.post('/groups', form) : await api.put(`/groups/${editId}`, form);
            toast.success(modal === 'add' ? 'Group added!' : 'Group updated!');
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
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmAndDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/groups/${deleteId}`);
            toast.success('Group deleted successfully');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setShowDeleteModal(false);
            setDeleteId(null);
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <div><h1 className="page-title">User Groups</h1><p className="page-sub">{items.length} groups</p></div>
                {isAdmin && <button className="btn btn-primary" onClick={openAdd}>+ Add Group</button>}
            </div>

            {loading ? <div className="spinner" /> : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>#</th><th>Group Name</th><th>Level</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
                        <tbody>
                            {items.map((g, i) => (
                                <tr key={g.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{g.group_name}</td>
                                    <td><span className="badge badge-primary">Level {g.group_level}</span></td>
                                    <td><span className={`badge ${g.group_status == 1 ? 'badge-success' : 'badge-danger'}`}>{g.group_status == 1 ? 'Active' : 'Inactive'}</span></td>
                                    {isAdmin && (
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}>✏️ Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <div className="modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{modal === 'add' ? 'Add Group' : 'Edit Group'}</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Group Name *</label>
                                <input className={`form-control ${errors.group_name ? 'is-invalid' : ''}`} value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} required />
                                {errors.group_name && <div className="invalid-feedback">{errors.group_name}</div>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Level (1=Admin, higher=less access)</label>
                                    <input type="number" min="1" className={`form-control ${errors.group_level ? 'is-invalid' : ''}`} value={form.group_level} onChange={e => setForm(f => ({ ...f, group_level: e.target.value }))} required />
                                    {errors.group_level && <div className="invalid-feedback">{errors.group_level}</div>}
                                </div>
                                <div className="form-group"><label className="form-label">Status</label>
                                    <select className="form-control" value={form.group_status} onChange={e => setForm(f => ({ ...f, group_status: e.target.value }))}>
                                        <option value="1">Active</option><option value="0">Inactive</option>
                                    </select></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Deletion</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px 0' }}>
                            <p>Are you sure you want to delete this group? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmAndDelete}>Delete Group</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
