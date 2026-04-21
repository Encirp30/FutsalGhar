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

        // Get manager bookings
        try {
          const bookingsData = await apiFetch('/manager/bookings');
          setRecentBookings((bookingsData.bookings || []).slice(0, 5));
        } catch (e) {
          console.error('Error fetching manager bookings:', e);
          setRecentBookings([]);
        }

        try {
          const revenueData = await apiFetch('/manager/revenue');
          setTotalRevenue(revenueData.revenue?.totalRevenue || 0);
        } catch (e) {
          console.error('Error fetching revenue:', e);
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

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

        {/* Stats Section */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{courts.length}</h3>
                <p>Total Courts</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{recentBookings.length}</h3>
                <p>Recent Bookings</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Rs.{totalRevenue.toLocaleString()}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{user?.averageRating || '4.8'}</h3>
                <p>Avg Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="quick-actions-section">
          <h3 className="section-title">Quick Actions</h3>
          <div className="quick-actions">
            <div className="action-card" onClick={() => navigate('/manager-courts')}>
              <div className="action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <h4>Manage Courts</h4>
              <p>Edit court details, pricing</p>
            </div>
            <div className="action-card" onClick={() => navigate('/create-tournament')}>
              <div className="action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>Create Tournament</h4>
              <p>Host new competitions</p>
            </div>
            <div className="action-card" onClick={() => navigate('/manager-teams')}>
              <div className="action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <h4>View Teams</h4>
              <p>See all registered teams</p>
            </div>
            <div className="action-card" onClick={() => navigate('/manager-players')}>
              <div className="action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <h4>View Players</h4>
              <p>See all players</p>
            </div>
          </div>
        </div>

        {/* Recent Bookings Section */}
        <div className="recent-bookings-section">
          <h3 className="section-title">Recent Bookings</h3>
          <div className="bookings-list">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <div key={booking._id || index} className="booking-item">
                  <div className="booking-info">
                    <h4>{booking.court?.name || 'Court'}</h4>
                    <p>{formatDate(booking.date)} • {booking.startTime} - {booking.endTime}</p>
                  </div>
                  <div className="booking-price">
                    Rs.{booking.totalCost || 0}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No recent bookings found.</div>
            )}
          </div>
        </div>

        {/* Your Courts Section */}
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
                    <p>Price per hour</p>
                    <strong>Rs.{court.pricePerHour || 0}</strong>
                  </div>
                  <div>
                    <p>Total Bookings</p>
                    <strong>{court.totalBookings || 0}</strong>
                  </div>
                </div>
                <button className="view-court-btn" onClick={() => navigate('/manager-courts')}>
                  Manage Court
                </button>
              </div>
            )) : (
              <div className="no-data">No courts added yet.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManagerDashboard;