import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken, apiFetch } from '../services/api';
import Layout from './Layout';
import './AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalManagers: 0,
    totalPlayers: 0,
    totalCourts: 0,
    totalBookings: 0,
    totalTournaments: 0,
    totalRevenue: 0
  });
  
  // Managers state
  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newManagerData, setNewManagerData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  
  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  // Fetch system statistics
  const fetchStats = async () => {
    try {
      // Get user stats from admin/statistics
      const response = await apiFetch('/admin/statistics');
      if (response && response.statistics) {
        setStats(prev => ({
          ...prev,
          totalUsers: response.statistics.totalUsers || 0,
          totalManagers: response.statistics.totalManagers || 0,
          totalPlayers: response.statistics.totalPlayers || 0,
          totalCourts: response.statistics.totalCourts || 0,
          totalTournaments: response.statistics.totalTournaments || 0
        }));
      }
      
      // Get booking stats from admin/bookings API
      const bookingsResponse = await apiFetch('/admin/bookings?limit=1');
      if (bookingsResponse && bookingsResponse.pagination) {
        setStats(prev => ({
          ...prev,
          totalBookings: bookingsResponse.pagination.total || 0,
          totalRevenue: bookingsResponse.totalRevenue || 0
        }));
        setTotalBookingsCount(bookingsResponse.pagination.total || 0);
        setTotalRevenue(bookingsResponse.totalRevenue || 0);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Fetch all managers
  const fetchManagers = async () => {
    setManagersLoading(true);
    try {
      const response = await apiFetch('/admin/users?role=manager&limit=100');
      if (response && response.users) {
        setManagers(response.users);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setManagersLoading(false);
    }
  };
  
  // Fetch all users (players)
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiFetch('/admin/users?role=user&limit=100');
      if (response && response.users) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };
  
  // Fetch all bookings
  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      let url = `/admin/bookings?page=${currentPage}&limit=10`;
      if (bookingFilter !== 'all') {
        url += `&status=${bookingFilter}`;
      }
      const response = await apiFetch(url);
      if (response && response.success) {
        setBookings(response.bookings || []);
        setTotalPages(response.pagination?.pages || 1);
        setTotalBookingsCount(response.pagination?.total || 0);
        setTotalRevenue(response.totalRevenue || 0);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  };
  
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const userData = await api.getMe();
        
        if (userData.user.role !== 'admin') {
          alert('Access Denied! Admin privileges required.');
          navigate('/dashboard');
          return;
        }
        
        setUser(userData.user);
        
        await Promise.all([
          fetchStats(),
          fetchManagers(),
          fetchUsers()
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        navigate('/login');
      }
    };
    
    fetchAdminData();
  }, [navigate]);
  
  // Fetch bookings when tab or filter changes
  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, bookingFilter, currentPage]);
  
  const handleAddManager = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: newManagerData.username,
          email: newManagerData.email,
          password: newManagerData.password,
          confirmPassword: newManagerData.password,
          role: 'manager'
        })
      });
      
      if (response && response.success) {
        alert('Manager added successfully!');
        setShowAddManagerModal(false);
        setNewManagerData({
          username: '',
          email: '',
          password: '',
          fullName: '',
          phone: ''
        });
        await fetchManagers();
        await fetchStats();
      } else {
        throw new Error(response?.message || 'Failed to add manager');
      }
    } catch (error) {
      alert(error.message || 'Failed to add manager');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'disable' : 'enable';
    const endpoint = `/admin/users/${userId}/${action}`;
    
    try {
      const response = await apiFetch(endpoint, { method: 'PUT' });
      if (response && response.success) {
        alert(`User ${action}d successfully!`);
        await fetchUsers();
        await fetchStats();
      } else {
        throw new Error(response?.message || 'Failed to update user status');
      }
    } catch (error) {
      alert(error.message || 'Failed to update user status');
    }
  };
  
  const handleDeleteManager = async (managerId, managerName) => {
    if (!window.confirm(`Are you sure you want to delete manager "${managerName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await apiFetch(`/admin/users/${managerId}`, { method: 'DELETE' });
      if (response && response.success) {
        alert('Manager deleted successfully!');
        await fetchManagers();
        await fetchStats();
      } else {
        throw new Error(response?.message || 'Failed to delete manager');
      }
    } catch (error) {
      alert(error.message || 'Failed to delete manager');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewManagerData(prev => ({ ...prev, [name]: value }));
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  const getStatusBadge = (booking) => {
    const status = booking.status;
    if (status === 'cancelled') {
      return <span className="status-badge cancelled">Cancelled</span>;
    }
    if (status === 'completed') {
      return <span className="status-badge completed">Completed</span>;
    }
    if (status === 'confirmed') {
      return <span className="status-badge upcoming">Confirmed</span>;
    }
    return <span className="status-badge pending">Pending</span>;
  };
  
  const filteredBookings = bookings.filter(booking => {
    const searchLower = bookingSearch.toLowerCase();
    const courtName = booking.court?.name?.toLowerCase() || '';
    const playerName = booking.player?.username?.toLowerCase() || '';
    return !bookingSearch || courtName.includes(searchLower) || playerName.includes(searchLower);
  });
  
  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.profile?.fullName?.toLowerCase().includes(userSearch.toLowerCase())
  );
  
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
      <div className="admin-panel">
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bookings');
              setCurrentPage(1);
            }}
          >
            Bookings ({totalBookingsCount})
          </button>
          <button 
            className={`admin-tab ${activeTab === 'managers' ? 'active' : ''}`}
            onClick={() => setActiveTab('managers')}
          >
            Managers ({managers.length})
          </button>
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
        </div>
        
        <div className="admin-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{stats.totalUsers}</h3>
                    <p>Total Users</p>
                    <span className="stat-detail">{stats.totalPlayers} players, {stats.totalManagers} managers, 1 admin</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>{stats.totalCourts}</h3>
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
                    <h3>{stats.totalBookings}</h3>
                    <p>Total Bookings</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3>Rs. {stats.totalRevenue.toLocaleString()}</h3>
                    <p>Total Revenue</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="bookings-tab">
              <div className="filter-section">
                <div className="filter-tabs">
                  <button className={`filter-tab ${bookingFilter === 'all' ? 'active' : ''}`} onClick={() => { setBookingFilter('all'); setCurrentPage(1); }}>
                    All ({totalBookingsCount})
                  </button>
                  <button className={`filter-tab ${bookingFilter === 'upcoming' ? 'active' : ''}`} onClick={() => { setBookingFilter('upcoming'); setCurrentPage(1); }}>
                    Upcoming
                  </button>
                  <button className={`filter-tab ${bookingFilter === 'completed' ? 'active' : ''}`} onClick={() => { setBookingFilter('completed'); setCurrentPage(1); }}>
                    Completed
                  </button>
                  <button className={`filter-tab ${bookingFilter === 'cancelled' ? 'active' : ''}`} onClick={() => { setBookingFilter('cancelled'); setCurrentPage(1); }}>
                    Cancelled
                  </button>
                </div>
                
                <div className="search-wrapper">
                  <input
                    type="text"
                    placeholder="Search by court or player..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              <div className="bookings-table-container">
                <table className="admin-table">
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
                    {bookingsLoading ? (
                      <tr>
                        <td colSpan="6" className="loading-cell">
                          <div className="loading-spinner-small"></div>
                          <p>Loading bookings...</p>
                        </td>
                      </tr>
                    ) : filteredBookings.length > 0 ? (
                      filteredBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td className="court-name">{booking.court?.name || 'N/A'}</td>
                          <td>
                            <div className="player-info">
                              <span className="player-name">{booking.player?.username || 'Guest'}</span>
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
          )}
          
          {/* Managers Tab */}
          {activeTab === 'managers' && (
            <div className="managers-tab">
              <div className="tab-header">
                <h2>Managers</h2>
                <button className="add-btn" onClick={() => setShowAddManagerModal(true)}>
                  + Add Manager
                </button>
              </div>
              
              {managersLoading ? (
                <div className="loading-spinner-small"></div>
              ) : managers.length === 0 ? (
                <div className="empty-state">
                  <p>No managers found</p>
                </div>
              ) : (
                <div className="managers-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map(manager => (
                        <tr key={manager._id}>
                          <td>{manager.username}</td>
                          <td>{manager.email}</td>
                          <td>{manager.profile?.fullName || '-'}</td>
                          <td>{manager.profile?.phone || '-'}</td>
                          <td>
                            <span className={`status-badge ${manager.isActive ? 'active' : 'inactive'}`}>
                              {manager.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteManager(manager._id, manager.username)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="users-tab">
              <div className="tab-header">
                <h2>Users</h2>
                <div className="search-wrapper">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              {usersLoading ? (
                <div className="loading-spinner-small"></div>
              ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <p>No users found</p>
                </div>
              ) : (
                <div className="users-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u._id}>
                          <td>{u.username}</td>
                          <td>{u.email}</td>
                          <td>{u.profile?.fullName || '-'}</td>
                          <td>{u.profile?.phone || '-'}</td>
                          <td>
                            <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                              {u.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className={`action-btn ${u.isActive ? 'disable' : 'enable'}`}
                              onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Manager Modal */}
      {showAddManagerModal && (
        <div className="modal-overlay" onClick={() => setShowAddManagerModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Manager</h3>
              <button className="close-modal" onClick={() => setShowAddManagerModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddManager}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Username <span className="required">*</span></label>
                  <input
                    type="text"
                    name="username"
                    value={newManagerData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter username"
                  />
                </div>
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={newManagerData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-group">
                  <label>Password <span className="required">*</span></label>
                  <input
                    type="password"
                    name="password"
                    value={newManagerData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter password"
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={newManagerData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newManagerData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowAddManagerModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminPanel;