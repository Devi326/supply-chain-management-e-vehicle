import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠', minLevel: 3 },
    { to: '/products', label: 'Products', icon: '📦', minLevel: 3 },
    { to: '/categories', label: 'Categories', icon: '🏷️', minLevel: 3 },
    { to: '/sales', label: 'Sales', icon: '💰', minLevel: 3 },
    { to: '/media', label: 'Media', icon: '🖼️', minLevel: 2 },
    { to: '/reports', label: 'Reports', icon: '📊', minLevel: 3 },
    { to: '/users', label: 'Users', icon: '👥', minLevel: 2 },
    { to: '/groups', label: 'Groups', icon: '🔑', minLevel: 1 },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { account, isConnected, connect, isConnecting, networkType, setNetworkType } = useWeb3();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/'); };
    const userLevel = parseInt(user?.user_level || 3);

    return (
        <aside className="sidebar">
            <div style={{ padding: '0 14px 16px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {userLevel === 1 ? 'Admin' : userLevel === 2 ? 'Manager' : 'Customer'}
                </div>
            </div>

            <div className="sidebar-section">Navigation</div>
            {navItems.filter(i => userLevel <= i.minLevel).map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                </NavLink>
            ))}

            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <div className="sidebar-section">Network</div>
                <div style={{ display: 'flex', gap: '8px', padding: '0 14px 12px' }}>
                    <button 
                        className={`btn btn-sm ${networkType === 'ethereum' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, fontSize: '10px' }}
                        onClick={() => setNetworkType('ethereum')}
                    >
                        ETH
                    </button>
                    <button 
                        className={`btn btn-sm ${networkType === 'solana' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, fontSize: '10px' }}
                        onClick={() => setNetworkType('solana')}
                    >
                        SOL
                    </button>
                </div>

                <div style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    marginBottom: '12px',
                    margin: '0 14px 12px'
                }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        {networkType === 'ethereum' ? 'Ethereum' : 'Solana'} Status
                    </div>
                    {isConnected ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                                    {account?.slice(0, 6)}...{account?.slice(-4)}
                                </span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {networkType === 'ethereum' ? 'Sepolia Testnet' : 'Solana Devnet'}
                            </div>
                        </div>
                    ) : (
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={connect}
                            disabled={isConnecting}
                            style={{ width: '100%', fontSize: '11px' }}
                        >
                            {isConnecting ? '⏳ Connecting...' : `🔌 Connect ${networkType === 'ethereum' ? 'MetaMask' : 'Solana'}`}
                        </button>
                    )}
                </div>
                <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                    <span>🚪</span><span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
