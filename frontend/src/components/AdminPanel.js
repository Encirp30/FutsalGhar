import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../services/api';
import Layout from './Layout';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const userData = await api.getMe();
        
        // ✅ Fixed
        if (userData.user.role !== 'admin') {
          alert('Access Denied! Admin privileges required.');
          navigate('/dashboard');
          return;
        }
        
        setUser(userData.user); // ✅ Fixed
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        navigate('/login');
      }
    };
    
    fetchAdminData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <Layout activePage="admin">
      <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', color: '#1e293b', marginBottom: '20px' }}>
          Admin Panel
        </h1>
        <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '40px' }}>
          Welcome, {user?.username}. This is the admin dashboard.
        </p>

        {/* Stats Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
            <h3 style={{ fontSize: '24px', color: '#1e293b', margin: '0' }}>--</h3>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Total Users</p>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏟️</div>
            <h3 style={{ fontSize: '24px', color: '#1e293b', margin: '0' }}>--</h3>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Total Courts</p>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📅</div>
            <h3 style={{ fontSize: '24px', color: '#1e293b', margin: '0' }}>--</h3>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Total Bookings</p>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
            <h3 style={{ fontSize: '24px', color: '#1e293b', margin: '0' }}>--</h3>
            <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>Total Revenue</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            <button 
              onClick={() => navigate('/manager-courts')}
              style={{ background: '#eff6ff', border: 'none', borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏟️</div>
              <p style={{ color: '#1e293b', fontWeight: 600, margin: 0 }}>Manage Courts</p>
            </button>
            <button 
              onClick={() => navigate('/manager-players')}
              style={{ background: '#f0fdf4', border: 'none', borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
              <p style={{ color: '#1e293b', fontWeight: 600, margin: 0 }}>Manage Users</p>
            </button>
            <button 
              onClick={() => navigate('/tournaments')}
              style={{ background: '#fefce8', border: 'none', borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏆</div>
              <p style={{ color: '#1e293b', fontWeight: 600, margin: 0 }}>Tournaments</p>
            </button>
            <button 
              onClick={() => navigate('/manager-teams')}
              style={{ background: '#fdf4ff', border: 'none', borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚽</div>
              <p style={{ color: '#1e293b', fontWeight: 600, margin: 0 }}>Manage Teams</p>
            </button>
          </div>
        </div>

        {/* Coming Soon */}
        <div style={{ 
          background: 'white', 
          border: '2px dashed #e2e8f0', 
          borderRadius: '12px', 
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔧</div>
          <h3 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '10px' }}>
            More Features Coming Soon
          </h3>
          <p style={{ color: '#64748b' }}>
            User Management, System Settings, Reports & Analytics
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AdminPanel;