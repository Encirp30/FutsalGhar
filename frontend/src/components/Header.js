import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, setAuthToken, api } from '../services/api';

const Header = ({ activePage }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('futsalUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setUserRole(userData.role || 'user');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);
  
  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        
        const response = await api.getNotifications();
        if (response && response.notifications) {
          setNotifications(response.notifications.slice(0, 5));
          setUnreadCount(response.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-wrapper')) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showNotifications]);
  
  const handleLogout = () => {
    localStorage.removeItem('futsalUser');
    localStorage.removeItem('userProfileData');
    localStorage.removeItem('userSettings');
    setAuthToken(null);
    setUser(null);
    setUserRole('user');
    navigate('/login');
  };

  const handleNavClick = (section) => {
    setShowNotifications(false);
    switch(section) {
      case 'dashboard': navigate('/dashboard'); break;
      case 'bookings': navigate('/my-bookings'); break;
      case 'courts': navigate('/book-court'); break;
      case 'teams': navigate('/teams-list'); break;
      case 'manage-my-teams': navigate('/manage-my-teams'); break;
      case 'profile': navigate('/profile'); break;
      case 'invite-friends': navigate('/invite-friends'); break;
      case 'tournaments': navigate('/tournaments'); break;
      case 'matches': navigate('/matches'); break;
      case 'manager': navigate('/manager-dashboard'); break;
      case 'managerBookings': navigate('/manager-bookings'); break;
      case 'managerCourts': navigate('/manager-courts'); break;
      case 'managerTeams': navigate('/manager-teams'); break;
      case 'managerPlayers': navigate('/manager-players'); break;
      case 'managerProfile': navigate('/manager-profile'); break;
      case 'admin': navigate('/admin-panel'); break;
      default: navigate('/dashboard');
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.markNotificationRead(notification._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    if (notification.relatedEntity) {
      const { entityType } = notification.relatedEntity;
      
      switch (entityType) {
        case 'booking':
          if (userRole === 'manager') {
            navigate('/manager-bookings');
          } else if (userRole === 'admin') {
            navigate('/admin-panel');
          } else {
            navigate('/my-bookings');
          }
          break;
        case 'team':
          navigate('/teams-list');
          break;
        case 'match':
          navigate('/matches');
          break;
        case 'tournament':
          navigate('/tournaments');
          break;
        case 'court':
          if (userRole === 'manager' || userRole === 'admin') {
            navigate('/manager-courts');
          } else {
            navigate('/book-court');
          }
          break;
        case 'user':
          navigate('/profile');
          break;
        default:
          break;
      }
    }
    
    setShowNotifications(false);
  };

  const getNotificationIcon = (type) => {
    // Return SVG icon component based on type
    switch(type) {
      case 'booking_confirmation':
      case 'new_booking':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#3b82f6" strokeWidth="1.5"/>
            <path d="M8 2V6M16 2V6" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 10H21" stroke="#3b82f6" strokeWidth="1.5"/>
            <path d="M9 15L11 17L15 13" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'booking_cancelled':
      case 'team_join_rejected':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="1.5"/>
            <path d="M8 8L16 16M16 8L8 16" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'booking_rescheduled':
      case 'court_status_updated':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12C1 8.5 4 4 12 4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M23 12C23 15.5 20 20 12 20" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 2L9 5L12 8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22L15 19L12 16" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'booking_completed':
      case 'team_join_approved':
      case 'tournament_registration_approved':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="1.5"/>
            <path d="M8 12L11 15L16 9" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'revenue_earned':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="1.5"/>
            <path d="M12 6V18M8 10H14C15.1 10 16 10.9 16 12C16 13.1 15.1 14 14 14H8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'court_created':
      case 'new_court_created':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#3b82f6" strokeWidth="1.5"/>
            <path d="M12 8V16M8 12H16" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'court_deleted':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#dc2626" strokeWidth="1.5"/>
            <path d="M9 12H15" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'team_join_request':
      case 'team_registered_for_tournament':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
            <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M17 2L19 4L23 0" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'match_scheduled':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="1.5"/>
            <path d="M12 6V12L16 14" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'match_result':
      case 'tournament_created':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          </svg>
        );
      case 'reward_earned':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          </svg>
        );
      case 'new_manager_registered':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="7" r="4" stroke="#f59e0b" strokeWidth="1.5"/>
            <path d="M19 3L21 5L19 7" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C18 4.7 15.3 2 12 2C8.7 2 6 4.7 6 8C6 11.1 8.9 13.9 12 16C15.1 13.9 18 11.1 18 8Z" stroke="#64748b" strokeWidth="1.5"/>
            <path d="M4 21C4 18.8 5.8 17 8 17H16C18.2 17 20 18.8 20 21" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  const getNavigationItems = () => {
    if (userRole === 'admin') {
      return [
        { key: 'admin', label: 'Admin Panel' },
        { key: 'manager', label: 'Manager Dashboard' },
        { key: 'managerCourts', label: 'Courts' },
        { key: 'managerTeams', label: 'Teams' },
        { key: 'managerPlayers', label: 'Players' },
        { key: 'managerProfile', label: 'Profile' }
      ];
    }
    if (userRole === 'manager') {
      return [
        { key: 'manager', label: 'Dashboard' },
        { key: 'managerBookings', label: 'Bookings' },
        { key: 'managerCourts', label: 'My Courts' },
        { key: 'managerTeams', label: 'Teams' },
        { key: 'managerPlayers', label: 'Players' },
        { key: 'tournaments', label: 'Tournaments' },
        { key: 'matches', label: 'Matches' },
        { key: 'managerProfile', label: 'Profile' }
      ];
    }
    return [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'bookings', label: 'My Bookings' },
      { key: 'courts', label: 'Book Court' },
      { key: 'teams', label: 'Teams' },
      { key: 'manage-my-teams', label: 'Manage Teams' },
      { key: 'tournaments', label: 'Tournaments' },
      { key: 'matches', label: 'Matches' },
      { key: 'invite-friends', label: 'Invite Friends' },
      { key: 'profile', label: 'Profile' }
    ];
  };

  const navItems = getNavigationItems();
  const displayName = user?.username || user?.profile?.fullName || 'User';

  return (
    <header style={styles.dashboardHeader}>
      <div style={styles.headerLeft}>
        <h1 
          style={styles.logo} 
          onClick={() => navigate(userRole === 'manager' ? '/manager-dashboard' : '/dashboard')}
          onMouseEnter={(e) => e.target.style.color = '#2563eb'}
          onMouseLeave={(e) => e.target.style.color = '#3b82f6'}
        >
          FutsalGhar
        </h1>
        
        <nav style={styles.mainNav}>
          {navItems.map(item => (
            <button 
              key={item.key}
              style={activePage === item.key ? styles.navLinkActive : styles.navLink}
              onClick={() => handleNavClick(item.key)}
              onMouseEnter={(e) => {
                if (activePage !== item.key) e.target.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                if (activePage !== item.key) e.target.style.color = '#64748b';
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div style={styles.headerRight}>
        <div className="notification-wrapper" style={styles.notificationWrapper}>
          <button 
            style={styles.notificationBtn}
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(!showNotifications);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C18 4.7 15.3 2 12 2C8.7 2 6 4.7 6 8C6 11.1 8.9 13.9 12 16C15.1 13.9 18 11.1 18 8Z" stroke="#64748b" strokeWidth="1.5"/>
              <path d="M4 21C4 18.8 5.8 17 8 17H16C18.2 17 20 18.8 20 21" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {unreadCount > 0 && (
              <span style={styles.notificationBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div style={styles.notificationDropdown}>
              <div style={styles.notificationHeader}>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    style={styles.markAllBtn}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await api.markAllNotificationsRead();
                        setUnreadCount(0);
                        setNotifications(prev =>
                          prev.map(n => ({ ...n, isRead: true }))
                        );
                      } catch (error) {
                        console.error('Error marking all as read:', error);
                      }
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div style={styles.notificationList}>
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification._id}
                      style={{
                        ...styles.notificationItem,
                        backgroundColor: notification.isRead ? 'white' : '#f0f9ff'
                      }}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div style={styles.notificationIcon}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div style={styles.notificationContent}>
                        <div style={styles.notificationTitle}>{notification.title}</div>
                        <div style={styles.notificationMessage}>{notification.message}</div>
                        <div style={styles.notificationTime}>
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {!notification.isRead && <div style={styles.unreadDot}></div>}
                    </div>
                  ))
                ) : (
                  <div style={styles.noNotifications}>
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={styles.userName}>{displayName}</div>
            <div style={{...styles.userRole, color: userRole === 'admin' ? '#ef4444' : userRole === 'manager' ? '#f59e0b' : '#3b82f6'}}>
              {userRole === 'admin' ? 'Admin' : userRole === 'manager' ? 'Manager' : 'Player'}
            </div>
          </div>
        </div>
        
        <button 
          style={styles.logoutBtn} 
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.target.style.background = '#fee2e2';
            e.target.style.color = '#dc2626';
            e.target.style.borderColor = '#fecaca';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#f1f5f9';
            e.target.style.color = '#64748b';
            e.target.style.borderColor = '#e2e8f0';
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

const styles = {
  dashboardHeader: {
    background: 'white',
    padding: '0 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    height: '70px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px'
  },
  logo: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#3b82f6',
    margin: 0,
    cursor: 'pointer',
    transition: 'color 0.3s'
  },
  mainNav: {
    display: 'flex',
    gap: '20px'
  },
  navLink: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontWeight: 500,
    padding: '8px 0',
    position: 'relative',
    cursor: 'pointer',
    fontSize: '16px',
    fontFamily: 'inherit',
    transition: 'color 0.3s'
  },
  navLinkActive: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontWeight: 600,
    padding: '8px 0',
    position: 'relative',
    cursor: 'pointer',
    fontSize: '16px',
    fontFamily: 'inherit'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  notificationWrapper: {
    position: 'relative'
  },
  notificationBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    transition: 'background 0.2s'
  },
  notificationBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 5px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center'
  },
  notificationDropdown: {
    position: 'absolute',
    top: '45px',
    right: '0',
    width: '340px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e2e8f0',
    zIndex: 1001,
    overflow: 'hidden'
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: 600,
    color: '#1e293b'
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 500
  },
  notificationList: {
    maxHeight: '380px',
    overflowY: 'auto'
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background 0.2s',
    position: 'relative'
  },
  notificationIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '4px'
  },
  notificationMessage: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
    lineHeight: '1.4'
  },
  notificationTime: {
    fontSize: '10px',
    color: '#94a3b8'
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    background: '#3b82f6',
    borderRadius: '50%',
    position: 'absolute',
    top: '18px',
    right: '12px'
  },
  noNotifications: {
    padding: '30px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: '18px'
  },
  userName: {
    fontSize: '14px',
    color: '#334155',
    fontWeight: 600
  },
  userRole: {
    fontSize: '12px',
    fontWeight: 500
  },
  logoutBtn: {
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s'
  }
};

export default Header;