import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import './Dashboard.css';
import Layout from '../Layout';

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [popularCourts, setPopularCourts] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }
      
      const userResponse = await api.getMe();
      const userData = userResponse.user || userResponse;
      setUser(userData);
      localStorage.setItem('futsalUser', JSON.stringify(userData));

      const bookingsResponse = await api.getBookings(1, 100, 'all');
      
      if (bookingsResponse.stats) {
        setStats(bookingsResponse.stats);
      }
      
      const bookingsList = bookingsResponse.bookings || bookingsResponse.data || [];
      setBookings(bookingsList);
      
      try {
        const teamsResponse = await api.getUserTeams();
        if (teamsResponse && teamsResponse.data) {
          setTeams(teamsResponse.data);
        }
      } catch (teamsError) {
        console.log('Teams fetch error:', teamsError);
      }
      
      // Fetch all courts for popular courts section
      try {
        const courtsResponse = await api.getCourts();
        if (courtsResponse && courtsResponse.data) {
          const courtsWithBookings = courtsResponse.data.map(court => {
            const courtBookings = bookingsList.filter(b => b.court?._id === court._id || b.courtId === court._id);
            return {
              ...court,
              bookingCount: courtBookings.length,
              revenue: courtBookings.reduce((sum, b) => sum + (b.totalCost || b.price || 0), 0)
            };
          });
          
          const sortedCourts = courtsWithBookings.sort((a, b) => b.bookingCount - a.bookingCount);
          setPopularCourts(sortedCourts.slice(0, 3));
        }
      } catch (courtsError) {
        console.log('Courts fetch error:', courtsError);
        setPopularCourts([
          { _id: 1, name: 'Court A', type: 'Standard', price: 1500, bookingCount: 24, location: 'Downtown' },
          { _id: 2, name: 'Court B', type: 'Premium', price: 2000, bookingCount: 18, location: 'City Center' },
          { _id: 3, name: 'Court C', type: 'VIP', price: 2500, bookingCount: 15, location: 'Suburb' }
        ]);
      }
      
      // Create Recent Activities - SHOW ALL BOOKINGS (upcoming, completed, cancelled)
      const activities = [];
      
      // Add all bookings (upcoming, completed, cancelled)
      bookingsList.forEach(booking => {
        let action = '';
        let icon = '';
        let color = '';
        
        if (booking.status === 'confirmed') {
          const bookingDate = new Date(booking.date);
          const today = new Date();
          if (bookingDate > today) {
            action = 'upcoming booking';
            icon = '📅';
            color = '#3b82f6';
          } else {
            action = 'completed booking';
            icon = '✅';
            color = '#10b981';
          }
        } else if (booking.status === 'cancelled') {
          action = 'cancelled booking';
          icon = '❌';
          color = '#ef4444';
        } else if (booking.status === 'completed') {
          action = 'completed booking';
          icon = '✅';
          color = '#10b981';
        } else {
          action = 'booking';
          icon = '📅';
          color = '#64748b';
        }
        
        activities.push({
          id: booking._id,
          type: 'booking',
          icon: icon,
          color: color,
          title: action.charAt(0).toUpperCase() + action.slice(1),
          description: `${booking.court?.name || 'Court'} on ${new Date(booking.date).toLocaleDateString()}`,
          time: new Date(booking.createdAt || booking.date).toLocaleDateString(),
          timestamp: new Date(booking.createdAt || booking.date).getTime()
        });
      });
      
      // Add team creation activities
      if (teams.length > 0) {
        teams.forEach(team => {
          activities.push({
            id: `team-${team._id}`,
            type: 'team',
            icon: '👥',
            color: '#8b5cf6',
            title: 'Team created',
            description: `Created team "${team.name || team.teamName}"`,
            time: new Date(team.createdAt).toLocaleDateString(),
            timestamp: new Date(team.createdAt).getTime()
          });
        });
      }
      
      // Sort by timestamp (newest first) and take top 5
      activities.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivities(activities.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const totalSpent = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => {
      const amount = b.totalCost || b.price || 0;
      return sum + amount;
    }, 0);

  const dynamicStats = [
    { label: 'Total Bookings', value: stats.total, icon: '📋', color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Upcoming', value: stats.upcoming, icon: '⏳', color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Completed', value: stats.completed, icon: '✅', color: '#10b981', bg: '#d1fae5' },
    { label: 'Total Spent', value: `Rs. ${totalSpent.toLocaleString()}`, icon: '💰', color: '#8b5cf6', bg: '#ede9fe' }
  ];

  const quickActions = [
    { icon: '📅', label: 'Book a Court', description: 'Schedule a new futsal match', path: '/book-court', color: '#3b82f6' },
    { icon: '📋', label: 'My Bookings', description: 'View all your bookings', path: '/my-bookings', color: '#10b981' },
    { icon: '👥', label: 'Create Team', description: 'Form a new futsal team', path: '/create-team', color: '#8b5cf6' },
    { icon: '🏆', label: 'Tournaments', description: 'Join tournaments', path: '/tournaments', color: '#f59e0b' },
    { icon: '⚽', label: 'Matches', description: 'View match results', path: '/matches', color: '#ef4444' },
    { icon: '👥', label: 'My Teams', description: 'Manage your teams', path: '/teams-list', color: '#06b6d4' },
    { icon: '📩', label: 'Invite Friends', description: 'Earn rewards', path: '/invite-friends', color: '#ec4899' },
    { icon: '👤', label: 'My Profile', description: 'Update your info', path: '/profile', color: '#6b7280' }
  ];

  const getLocationString = (location) => {
    if (!location) return 'Venue TBD';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      return location.address || location.city || 'Venue TBD';
    }
    return 'Venue TBD';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <Layout activePage="dashboard">
      <main className="dashboard-content">
        <section className="welcome-section">
          <div className="welcome-content">
            <div>
              <h2>Welcome back, {user?.profile?.fullName || user?.username || 'Player'}! ⚽</h2>
              <p>Track your bookings, manage teams, and stay updated with your futsal journey.</p>
            </div>
            <div className="welcome-stats">
              <div className="welcome-stat">
                <span className="welcome-stat-value">{stats.total}</span>
                <span className="welcome-stat-label">Total Bookings</span>
              </div>
              <div className="welcome-stat">
                <span className="welcome-stat-value">{teams.length}</span>
                <span className="welcome-stat-label">Teams</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div className="section-header">
            <h3>Your Stats</h3>
            <span className="section-subtitle">Last 30 days</span>
          </div>
          <div className="stats-grid">
            {dynamicStats.map((stat, index) => (
              <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
                <div className="stat-icon" style={{ backgroundColor: stat.bg, color: stat.color }}>
                  <span>{stat.icon}</span>
                </div>
                <div className="stat-content">
                  <h4>{stat.value}</h4>
                  <p>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="content-grid">
          {/* Popular Courts Section */}
          <section className="popular-courts-section">
            <div className="section-header">
              <div>
                <h3>Popular Courts</h3>
                <p className="section-description">Most booked courts this week</p>
              </div>
              <button className="view-all-btn" onClick={() => navigate('/book-court')}>
                Book Now →
              </button>
            </div>
            <div className="popular-courts-list">
              {popularCourts.length > 0 ? (
                popularCourts.map((court, idx) => (
                  <div key={court._id || idx} className="popular-court-card">
                    <div className="court-rank">{idx + 1}</div>
                    <div className="court-info">
                      <h4>{court.name}</h4>
                      <div className="court-meta">
                        <span className="court-type">{court.type || 'Standard'}</span>
                        <span className="court-price">Rs. {court.price || 1500}/hr</span>
                      </div>
                      <div className="court-location">
                        <span>📍</span>
                        <span>{getLocationString(court.location)}</span>
                      </div>
                    </div>
                    <div className="court-stats">
                      <div className="court-booking-count">
                        <span className="count-number">{court.bookingCount || 0}</span>
                        <span className="count-label">bookings</span>
                      </div>
                      <button 
                        className="book-court-btn"
                        onClick={() => navigate('/book-court')}
                      >
                        Book Now →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-popular-courts">
                  <div className="empty-icon"></div>
                  <p>No court data available</p>
                  <button className="book-now-btn" onClick={() => navigate('/book-court')}>
                    Browse Courts →
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions Section */}
          <section className="actions-section">
            <div className="section-header">
              <h3>Quick Actions</h3>
              <p className="section-description">What would you like to do?</p>
            </div>
            <div className="actions-grid">
              {quickActions.map((action, index) => (
                <button 
                  key={index} 
                  className="action-card"
                  onClick={() => navigate(action.path)}
                  style={{ '--action-color': action.color }}
                >
                  <div className="action-icon" style={{ color: action.color }}>{action.icon}</div>
                  <h4>{action.label}</h4>
                  <p>{action.description}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Recent Activity Section - FIXED: Now goes to My Bookings */}
        <section className="activity-section">
          <div className="section-header">
            <div>
              <h3>Recent Activity</h3>
              <p className="section-description">Your latest 5 activities</p>
            </div>
            <button className="view-all-btn" onClick={() => navigate('/my-bookings')}>
              View All →
            </button>
          </div>
          <div className="activity-timeline">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, idx) => (
                <div key={activity.id || idx} className="timeline-item">
                  <div className="timeline-icon" style={{ backgroundColor: activity.color + '20', color: activity.color }}>
                    {activity.icon}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">{activity.title}</div>
                    <div className="timeline-description">{activity.description}</div>
                    <div className="timeline-time">{activity.time}</div>
                  </div>
                  <div className="timeline-dot" style={{ backgroundColor: activity.color }}></div>
                </div>
              ))
            ) : (
              <div className="empty-activity">
                <div className="empty-icon">🔄</div>
                <p>No recent activity</p>
                <p className="empty-subtext">Book a court or create a team to see activity here</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Dashboard;