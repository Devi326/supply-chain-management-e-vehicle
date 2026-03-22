import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Sales from './pages/Sales';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Media from './pages/Media';
import Reports from './pages/Reports';

import api from './api/client';

// Ensure API has token on cold start
const initialToken = localStorage.getItem('token');
if (initialToken) api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;

function PrivateRoute({ children, minLevel = 3 }) {
  const { user } = useAuth();

  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/" replace />;
  }

  const userLevel = parseInt(user.user_level);
  if (userLevel > minLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#111827', color: '#f1f5f9', border: '1px solid var(--border)' }
      }} />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
        <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute minLevel={3}><Reports /></PrivateRoute>} />
        <Route path="/media" element={<PrivateRoute minLevel={2}><Media /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute minLevel={2}><Users /></PrivateRoute>} />
        <Route path="/groups" element={<PrivateRoute minLevel={1}><Groups /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <Router>
          <AppContent />
        </Router>
      </Web3Provider>
    </AuthProvider>
  );
}
