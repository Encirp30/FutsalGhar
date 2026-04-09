import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiFetch, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [courts, setCourts] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const userData = await api.getMe();
        if (userData.user.role !== 'manager' && userData.user.role !== 'admin') {
          alert('Access Denied! Manager privileges required.');
          navigate('/dashboard');
          return;
        }
        setUser(userData.user);

        try {
          const courtsData = await api.getCourts();
          setCourts(courtsData.data || []);
        } catch (e) {
          setCourts([]);
        }

        try {
          const bookingsData = await api.getBookings();
          setRecentBookings((bookingsData.data || []).slice(0, 3));
        } catch (e) {
          setRecentBookings([]);
        }

        try {
          const revenueData = await apiFetch('/manager/revenue');
          setTotalRevenue(revenueData.data?.totalRevenue || 0);
        } catch (e) {
          setTotalRevenue(0);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching manager data:', error);
        setLoading(false);
      }
    };

    fetchManagerData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Manager Dashboard...</p>
      </div>
    );
  }

  return (
    <Layout activePage="manager">
      <div className="manager-dashboard">
        <div className="manager-header">
          <h1 className="manager-title">Welcome back, {user?.username}!</h1>
          <p className="manager-subtitle">Overview of your futsal business</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">🏟️</div>
            <div className="stat-info">
              <h3>{courts.length}</h3>
              <p>Total Courts</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">💰</div>
            <div className="stat-info">
              <h3>Rs.{totalRevenue.toLocaleString()}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">📅</div>
            <div className="stat-info">
              <h3>{recentBookings.length}</h3>
              <p>Recent Bookings</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">⭐</div>
            <div className="stat-info">
              <h3>{user?.averageRating || '4.8'}</h3>
              <p>Avg Rating</p>
            </div>
          </div>
        </div>

        <div className="quick-actions-section">
          <h3 className="section-title">Quick Actions</h3>
          <div className="quick-actions">
            <div className="action-card" onClick={() => navigate('/manager-courts')}>
              <div className="action-icon">🏟️</div>
              <h4>Manage Courts</h4>
              <p>Edit court details, pricing</p>
            </div>
            <div className="action-card" onClick={() => navigate('/create-tournament')}>
              <div className="action-icon">🏆</div>
              <h4>Create Tournament</h4>
              <p>Host new competitions</p>
            </div>
            <div className="action-card" onClick={() => navigate('/manager-teams')}>
              <div className="action-icon">👥</div>
              <h4>View Teams</h4>
              <p>See all registered teams</p>
            </div>
            <div className="action-card" onClick={() => navigate('/manager-players')}>
              <div className="action-icon">👤</div>
              <h4>View Players</h4>
              <p>See all players</p>
            </div>
          </div>
        </div>

        <div className="courts-summary">
          <h3 className="section-title">Your Courts</h3>
          <div className="courts-grid">
            {courts.length > 0 ? courts.map((court, index) => (
              <div key={court._id || index} className="court-summary-card">
                <div className="court-summary-header">
                  <h4>{court.name}</h4>
                  <span className={`status-badge ${court.status === 'open' ? 'open' : 'closed'}`}>
                    {court.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="court-summary-stats">
                  <div>
                    <p>Price</p>
                    <strong>Rs.{court.pricePerHour || 0}/hr</strong>
                  </div>
                  <div>
                    <p>Bookings</p>
                    <strong>{court.totalBookings || 0}</strong>
                  </div>
                </div>
                <button className="view-court-btn" onClick={() => navigate('/manager-courts')}>
                  Manage Court →
                </button>
              </div>
            )) : (
              <p style={{ color: '#64748b' }}>No courts added yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManagerDashboard;