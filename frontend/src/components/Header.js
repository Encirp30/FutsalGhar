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
        case 'booking': navigate('/my-bookings'); break;
        case 'team': navigate('/teams-list'); break;
        case 'match': navigate('/matches'); break;
        case 'tournament': navigate('/tournaments'); break;
        default: break;
      }
    }
    
    setShowNotifications(false);
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'booking_confirmation': return '📅';
      case 'booking_cancelled': return '❌';
      case 'team_join_request': return '👥';
      case 'team_join_approved': return '✅';
      case 'team_join_rejected': return '❌';
      case 'match_scheduled': return '⚽';
      case 'match_result': return '🏆';
      case 'reward_earned': return '🎁';
      default: return '🔔';
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
        {/* Notification Bell */}
        <div className="notification-wrapper" style={styles.notificationWrapper}>
          <button 
            style={styles.notificationBtn}
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(!showNotifications);
            }}
          >
            🔔
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
    fontSize: '18px',
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
    width: '320px',
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
    maxHeight: '350px',
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
    fontSize: '20px'
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
    marginBottom: '4px'
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
    fontSize: '15px',
    color: '#334155',
    fontWeight: 600
  },
  userRole: {
    fontSize: '12px',
    fontWeight: 500
  },
  logoutBtn: {
    background: '#f1f5f9',
    border: '2px solid #e2e8f0',
    color: '#64748b',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s'
  }
};

export default Header;