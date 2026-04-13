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
          // Remove duplicates by ID
          const uniqueCourts = [];
          const seenIds = new Set();
          for (const court of sortedCourts.slice(0, 3)) {
            if (!seenIds.has(court._id)) {
              seenIds.add(court._id);
              uniqueCourts.push(court);
            }
          }
          setPopularCourts(uniqueCourts);
        }
      } catch (courtsError) {
        console.log('Courts fetch error:', courtsError);
        setPopularCourts([
          { _id: 1, name: 'Downtown Arena', type: 'Standard', price: 1000, bookingCount: 24, location: 'Downtown' },
          { _id: 2, name: 'City Sports Hub', type: 'Premium', price: 1500, bookingCount: 18, location: 'City Center' },
          { _id: 3, name: 'Suburb Arena', type: 'VIP', price: 2000, bookingCount: 15, location: 'Suburb' }
        ]);
      }
      
      // Create Recent Activities
      const activities = [];
      
      bookingsList.forEach(booking => {
        let action = '';
        let color = '';
        let type = 'booking';
        
        if (booking.status === 'confirmed') {
          const bookingDate = new Date(booking.date);
          const today = new Date();
          if (bookingDate > today) {
            action = 'Upcoming Booking';
            color = '#3b82f6';
          } else {
            action = 'Completed Booking';
            color = '#10b981';
          }
        } else if (booking.status === 'cancelled') {
          action = 'Cancelled Booking';
          color = '#ef4444';
        } else if (booking.status === 'completed') {
          action = 'Completed Booking';
          color = '#10b981';
        } else {
          action = 'Booking';
          color = '#64748b';
        }
        
        activities.push({
          id: booking._id,
          type: type,
          color: color,
          title: action,
          description: `${booking.court?.name || 'Court'} on ${new Date(booking.date).toLocaleDateString()}`,
          time: new Date(booking.createdAt || booking.date).toLocaleDateString(),
          timestamp: new Date(booking.createdAt || booking.date).getTime()
        });
      });
      
      if (teams.length > 0) {
        teams.forEach(team => {
          activities.push({
            id: `team-${team._id}`,
            type: 'team',
            color: '#8b5cf6',
            title: 'Team Created',
            description: `Created team "${team.name || team.teamName}"`,
            time: new Date(team.createdAt).toLocaleDateString(),
            timestamp: new Date(team.createdAt).getTime()
          });
        });
      }
      
      activities.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivities(activities.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ✅ NEW: Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const totalSpent = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => {
      const amount = b.totalCost || b.price || 0;
      return sum + amount;
    }, 0);

  const getLocationString = (location) => {
    if (!location) return 'Venue TBD';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      return location.address || location.city || 'Venue TBD';
    }
    return 'Venue TBD';
  };

  // Helper function to get activity icon based on type
  const getActivityIcon = (type, color) => {
    switch(type) {
      case 'booking':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        );
      case 'team':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
    }
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
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-content">
            <div>
              <h2>Welcome back, {user?.profile?.fullName || user?.username || 'Player'}!</h2>
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

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card-modern total-card">
              <div className="stat-icon-modern">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H21V19H3V6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 6V4H16V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 13H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-content-modern">
                <span className="stat-label-modern">Total Bookings</span>
                <h3>{stats.total}</h3>
              </div>
            </div>
            
            <div className="stat-card-modern upcoming-card">
              <div className="stat-icon-modern">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-content-modern">
                <span className="stat-label-modern">Upcoming</span>
                <h3>{stats.upcoming}</h3>
              </div>
            </div>
            
            <div className="stat-card-modern completed-card">
              <div className="stat-icon-modern">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content-modern">
                <span className="stat-label-modern">Completed</span>
                <h3>{stats.completed}</h3>
              </div>
            </div>
            
            <div className="stat-card-modern cancelled-card">
              <div className="stat-icon-modern">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-content-modern">
                <span className="stat-label-modern">Cancelled</span>
                <h3>{stats.cancelled}</h3>
              </div>
            </div>
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
                  <div key={court._id || court.id || idx} className="popular-court-card">
                    <div className="court-rank">{idx + 1}</div>
                    <div className="court-info">
                      <h4 className="court-name">{court.name}</h4>
                      <div className="court-meta">
                        <span className="court-type">{court.type || 'Standard'}</span>
                        <span className="court-price">Rs. {court.price || 1000}/hr</span>
                      </div>
                      <div className="court-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                        <span>{getLocationString(court.location)}</span>
                      </div>
                    </div>
                    <div className="court-stats">
                      <div className="court-booking-count">
                        <span className="count-number">{court.bookingCount || 0}</span>
                        <span className="count-label">total bookings</span>
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
              <button className="action-card" onClick={() => navigate('/book-court')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h4>Book a Court</h4>
                <p>Schedule a new futsal match</p>
              </button>
              <button className="action-card" onClick={() => navigate('/my-bookings')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 7H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8 17H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>My Bookings</h4>
                <p>View all your bookings</p>
              </button>
              <button className="action-card" onClick={() => navigate('/create-team')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M17 7H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M19 5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Create Team</h4>
                <p>Form a new futsal team</p>
              </button>
              <button className="action-card" onClick={() => navigate('/tournaments')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h4>Tournaments</h4>
                <p>Join tournaments</p>
              </button>
              <button className="action-card" onClick={() => navigate('/matches')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Matches</h4>
                <p>View match results</p>
              </button>
              <button className="action-card" onClick={() => navigate('/teams-list')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>My Teams</h4>
                <p>Manage your teams</p>
              </button>
              <button className="action-card" onClick={() => navigate('/invite-friends')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M22 2L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M22 2L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M17 22L22 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 12L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h4>Invite Friends</h4>
                <p>Earn rewards</p>
              </button>
              <button className="action-card" onClick={() => navigate('/profile')}>
                <div className="action-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>My Profile</h4>
                <p>Update your info</p>
              </button>
            </div>
          </section>
        </div>

        {/* About FutsalGhar Section */}
        <section className="about-section">
          <div className="about-content">
            <div className="about-text">
              <h3>About FutsalGhar</h3>
              <p>
                FutsalGhar is Nepal's premier futsal booking platform, connecting players with 
                the best courts across the country. Whether you're a casual player or a 
                competitive athlete, we make it easy to book courts, form teams, and join tournaments.
              </p>
              <p>
                Our mission is to revolutionize the way futsal is played and managed in Nepal. 
                With real-time availability, secure payments, and a vibrant community, 
                FutsalGhar is your one-stop destination for all things futsal.
              </p>
              <div className="about-features">
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Easy Booking</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Team Management</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <span>Tournaments</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
            <div className="about-stats">
              <div className="about-stat">
                <span className="about-stat-number">50+</span>
                <span className="about-stat-label">Partner Courts</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-number">5,000+</span>
                <span className="about-stat-label">Active Players</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-number">200+</span>
                <span className="about-stat-label">Registered Teams</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-number">1,000+</span>
                <span className="about-stat-label">Matches Played</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity Section */}
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
                    {getActivityIcon(activity.type, activity.color)}
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
                <div className="empty-icon"></div>
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