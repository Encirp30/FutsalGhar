import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerBookings.css';

const ManagerBookings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0
  });

  const itemsPerPage = 10;

  const fetchBookings = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch bookings with status filter from backend
      const response = await apiFetch(`/manager/bookings?page=${currentPage}&limit=${itemsPerPage}&status=${filter}`);
      
      if (response && response.success) {
        // Use the displayStatus from backend for filtering
        let allBookings = response.bookings || [];
        
        setBookings(allBookings);
        setTotalPages(response.pagination?.pages || 1);
        
        // Calculate stats from all bookings (without pagination)
        const allResponse = await apiFetch('/manager/bookings?limit=1000');
        if (allResponse && allResponse.bookings) {
          const allBookingsData = allResponse.bookings;
          
          // Use displayStatus from backend for stats
          const upcoming = allBookingsData.filter(b => b.displayStatus === 'upcoming').length;
          const completed = allBookingsData.filter(b => b.displayStatus === 'completed').length;
          const cancelled = allBookingsData.filter(b => b.status === 'cancelled').length;
          const totalRevenue = allBookingsData
            .filter(b => b.displayStatus === 'completed')
            .reduce((sum, b) => sum + (b.totalCost || 0), 0);
          
          setStats({
            total: allBookingsData.length,
            upcoming,
            completed,
            cancelled,
            totalRevenue
          });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentPage, filter]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (booking) => {
    // Use displayStatus from backend for consistent status display
    const status = booking.displayStatus || booking.status;
    
    if (status === 'cancelled') {
      return <span className="status-badge cancelled">Cancelled</span>;
    }
    if (status === 'completed') {
      return <span className="status-badge completed">Completed</span>;
    }
    if (status === 'upcoming') {
      return <span className="status-badge upcoming">Upcoming</span>;
    }
    return <span className="status-badge past">Past</span>;
  };

  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchTerm.toLowerCase();
    const courtName = booking.court?.name?.toLowerCase() || '';
    const playerName = booking.player?.fullName?.toLowerCase() || '';
    return !searchTerm || courtName.includes(searchLower) || playerName.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Bookings...</p>
      </div>
    );
  }

  return (
    <Layout activePage="managerBookings">
      <div className="manager-bookings-page">
        {/* Stats Section */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.total}</h3>
                <p>Total Bookings</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.upcoming}</h3>
                <p>Upcoming</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.completed}</h3>
                <p>Completed</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Rs.{stats.totalRevenue.toLocaleString()}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-section">
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All
            </button>
            <button className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter('upcoming')}>
              Upcoming
            </button>
            <button className={`filter-tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
              Completed
            </button>
            <button className={`filter-tab ${filter === 'cancelled' ? 'active' : ''}`} onClick={() => setFilter('cancelled')}>
              Cancelled
            </button>
          </div>
          
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search by court or player..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bookings-table-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Court</th>
                <th>Player</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="court-name">{booking.court?.name || 'N/A'}</td>
                    <td>
                      <div className="player-info">
                        <span className="player-name">{booking.player?.fullName || booking.player?.username || 'Guest'}</span>
                        <span className="player-email">{booking.player?.email || ''}</span>
                      </div>
                    </td>
                    <td>{formatDate(booking.date)}</td>
                    <td>{booking.startTime} - {booking.endTime}</td>
                    <td className="amount">Rs.{booking.totalCost || 0}</td>
                    <td>{getStatusBadge(booking)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">
                    <div className="empty-state-table">
                      <p>No bookings found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <button 
              className="page-nav-btn" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="page-info">Page {currentPage} of {totalPages}</span>
            <button 
              className="page-nav-btn" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManagerBookings;