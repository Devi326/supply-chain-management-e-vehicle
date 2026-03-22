import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Users() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [form, setForm] = useState({ name: '', username: '', password: '', user_level: '3', status: '1' });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const load = async () => {
        setLoading(true);
        const [u, g] = await Promise.all([api.get('/users'), api.get('/groups')]);
        setUsers(u.data.data); setGroups(g.data.data); setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const userLevel = parseInt(me?.user_level || 3);
    const isAdmin = userLevel === 1;

    const openAdd = () => { setForm({ name: '', username: '', password: '', user_level: '3', status: '1' }); setEditId(null); setErrors({}); setModal('add'); };
    const openEdit = (u) => { setForm({ name: u.name, username: u.username, password: '', user_level: String(u.user_level), status: String(u.status) }); setEditId(u.id); setErrors({}); setModal('edit'); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true); setErrors({});
        try {
            const payload = { ...form };
            if (modal === 'edit' && !payload.password) delete payload.password;
            modal === 'add' ? await api.post('/users', payload) : await api.put(`/users/${editId}`, payload);
            toast.success(modal === 'add' ? 'User added!' : 'User updated!');
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
        if (deleteId === me?.id) {
            toast.error("You cannot delete your own account!");
            setShowDeleteModal(false);
            return;
        }

        try {
            await api.delete(`/users/${deleteId}`);
            toast.success('User deleted successfully');
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
                <div><h1 className="page-title">Users</h1><p className="page-sub">{users.length} accounts</p></div>
                {isAdmin && <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>}
            </div>

            {loading ? <div className="spinner" /> : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Group</th><th>Status</th><th>Last Login</th>{isAdmin && <th>Actions</th>}</tr></thead>
                        <tbody>
                            {users.map((u, i) => (
                                <tr key={u.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{u.name} {u.id === me?.id && <span className="badge badge-primary ml-1">You</span>}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.username}</td>
                                    <td><span className="badge badge-primary">{u.group_name}</span></td>
                                    <td><span className={`badge ${u.status == 1 ? 'badge-success' : 'badge-danger'}`}>{u.status == 1 ? 'Active' : 'Inactive'}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                                    {isAdmin && (
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️ Edit</button>
                                                {u.id !== me?.id && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>🗑️</button>}
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
                            <h3 className="modal-title">{modal === 'add' ? 'Add User' : 'Edit User'}</h3>
                            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Full Name *</label>
                                <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Username *</label>
                                    <input className={`form-control ${errors.username ? 'is-invalid' : ''}`} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                                    {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                                </div>
                                <div className="form-group"><label className="form-label">Password {modal === 'edit' && '(leave blank to keep)'}</label>
                                    <input type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={modal === 'add'} />
                                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                </div>
                                <div className="form-group"><label className="form-label">Group</label>
                                    <select className="form-control" value={form.user_level} onChange={e => setForm(f => ({ ...f, user_level: e.target.value }))}>
                                        {groups.map(g => <option key={g.id} value={g.group_level}>{g.group_name}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Status</label>
                                    <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
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
                            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmAndDelete}>Delete User</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
