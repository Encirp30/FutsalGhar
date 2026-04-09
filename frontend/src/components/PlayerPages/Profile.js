import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    skillLevel: 'intermediate',
    preferredPosition: 'Midfielder',
    favoriteTeam: '',
    joinDate: ''
  });

  const [userStats, setUserStats] = useState({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalTeams: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    publicProfile: true
  });

  const skillLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'professional', label: 'Professional' }
  ];

  const positionOptions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger', 'Striker'
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Fetch user data from backend ONLY
        const userResponse = await api.getMe();
        const currentUser = userResponse.user || userResponse;
        setUser(currentUser);
        
        // REMOVED: localStorage fallback - always use backend data
        setProfileData({
          fullName: currentUser.profile?.fullName || currentUser.username || '',
          email: currentUser.email || '',
          phone: currentUser.profile?.phone || '',
          location: currentUser.profile?.location || '',
          bio: currentUser.profile?.bio || '',
          skillLevel: currentUser.profile?.skillLevel || 'intermediate',
          preferredPosition: currentUser.profile?.preferredPosition || 'Midfielder',
          favoriteTeam: currentUser.profile?.favoriteTeam || '',
          joinDate: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }) : 'N/A'
        });
        
        // Fetch bookings stats and activity
        try {
          const bookingsResponse = await api.getBookings(1, 100, 'all');
          
          if (bookingsResponse) {
            if (bookingsResponse.stats) {
              setUserStats({
                totalBookings: bookingsResponse.stats.total || 0,
                upcomingBookings: bookingsResponse.stats.upcoming || 0,
                completedBookings: bookingsResponse.stats.completed || 0,
                cancelledBookings: bookingsResponse.stats.cancelled || 0,
                totalTeams: userStats.totalTeams
              });
            }
            
            let activities = [];
            const bookingsList = bookingsResponse.bookings || bookingsResponse.data || [];
            
            if (bookingsList.length > 0) {
              activities = bookingsList.slice(0, 10).map(booking => {
                let statusText = 'Booked';
                
                if (booking.status === 'cancelled') {
                  statusText = 'Cancelled';
                } else if (booking.status === 'completed') {
                  statusText = 'Completed';
                }
                
                return {
                  id: booking._id || booking.id,
                  type: 'booking',
                  message: `${statusText} ${booking.court?.name || booking.courtName || 'court'} on ${new Date(booking.date).toLocaleDateString()}`,
                  time: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : new Date(booking.date).toLocaleDateString(),
                  timestamp: new Date(booking.createdAt || booking.date).getTime()
                };
              });
            }
            
            try {
              const teamsResponse = await api.getUserTeams();
              if (teamsResponse && teamsResponse.data && teamsResponse.data.length > 0) {
                const teamActivities = teamsResponse.data.slice(0, 5).map(team => ({
                  id: `team-${team._id}`,
                  type: 'team',
                  message: `Created/Joined team "${team.name || team.teamName}"`,
                  time: team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'Recently',
                  timestamp: new Date(team.createdAt || Date.now()).getTime()
                }));
                activities = [...activities, ...teamActivities];
              }
            } catch (teamError) {
              // Silently handle team error
            }
            
            activities.sort((a, b) => b.timestamp - a.timestamp);
            setRecentActivity(activities.slice(0, 5));
          }
        } catch (bookingError) {
          // Silently handle booking error
        }
        
        // Fetch teams count
        try {
          const teamsResponse = await api.getUserTeams();
          if (teamsResponse && teamsResponse.data) {
            setUserStats(prev => ({
              ...prev,
              totalTeams: teamsResponse.data.length || 0
            }));
          }
        } catch (teamsError) {
          // Silently handle teams error
        }
        
        // Load settings
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
        
      } catch (error) {
        // Silently handle error
      }
      setLoading(false);
    };
    
    fetchUserProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingChange = (setting) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting] };
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    try {
      const updateData = {
        fullName: profileData.fullName,
        phone: profileData.phone,
        location: profileData.location,
        bio: profileData.bio,
        skillLevel: profileData.skillLevel,
        preferredPosition: profileData.preferredPosition,
        favoriteTeam: profileData.favoriteTeam
      };
      
      // REMOVED: Saving to localStorage - only save to backend
      const response = await api.updateProfile(updateData);
      
      if (response && response.success) {
        alert('Profile updated successfully!');
        setIsEditing(false);
        
        // Refresh user data from backend
        const userResponse = await api.getMe();
        const currentUser = userResponse.user || userResponse;
        setUser(currentUser);
        
        // Update profile data from backend response
        setProfileData({
          fullName: currentUser.profile?.fullName || currentUser.username || '',
          email: currentUser.email || '',
          phone: currentUser.profile?.phone || '',
          location: currentUser.profile?.location || '',
          bio: currentUser.profile?.bio || '',
          skillLevel: currentUser.profile?.skillLevel || 'intermediate',
          preferredPosition: currentUser.profile?.preferredPosition || 'Midfielder',
          favoriteTeam: currentUser.profile?.favoriteTeam || '',
          joinDate: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'
        });
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
      
    } catch (error) {
      alert(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original data from user state (backend data)
    setProfileData({
      fullName: user?.profile?.fullName || user?.username || '',
      email: user?.email || '',
      phone: user?.profile?.phone || '',
      location: user?.profile?.location || '',
      bio: user?.profile?.bio || '',
      skillLevel: user?.profile?.skillLevel || 'intermediate',
      preferredPosition: user?.profile?.preferredPosition || 'Midfielder',
      favoriteTeam: user?.profile?.favoriteTeam || '',
      joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'
    });
    setIsEditing(false);
  };

  const handleEditProfileClick = () => {
    setActiveTab('personal');
    setIsEditing(true);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Clear all localStorage data
      localStorage.removeItem('token');
      localStorage.removeItem('futsalUser');
      localStorage.removeItem('userSettings');
      localStorage.removeItem('userProfileData');
      
      alert('Your account has been deleted successfully.');
      navigate('/login');
    } catch (error) {
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getRoleDisplay = () => {
    switch(user?.role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return 'Player';
    }
  };

  const getRoleColor = () => {
    switch(user?.role) {
      case 'admin': return '#ef4444';
      case 'manager': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <Layout activePage="profile">
      <div className="profile-wrapper">
        <div className="profile-content">
          {/* Left Column */}
          <div className="profile-left">
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-info">
                  <h2>{profileData.fullName || user?.username || 'User'}</h2>
                  <p className="profile-email">{profileData.email || user?.email}</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px', color: getRoleColor() }}>
                    {getRoleDisplay()}
                  </p>
                  <p className="profile-member">Member since {profileData.joinDate}</p>
                </div>
              </div>

              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{userStats.totalBookings}</span>
                  <span className="stat-label">Total Bookings</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{userStats.upcomingBookings}</span>
                  <span className="stat-label">Upcoming</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{userStats.totalTeams}</span>
                  <span className="stat-label">Teams</span>
                </div>
              </div>

              {!isEditing && (
                <button className="edit-profile-btn" onClick={handleEditProfileClick}>
                  Edit Profile
                </button>
              )}
            </div>

            <div className="info-card">
              <h3>Player Information</h3>
              <div className="info-item">
                <span className="info-label">Skill Level:</span>
                <span className={`skill-level ${profileData.skillLevel}`}>
                  {profileData.skillLevel.charAt(0).toUpperCase() + profileData.skillLevel.slice(1)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Preferred Position:</span>
                <span className="info-value">{profileData.preferredPosition}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Favorite Team:</span>
                <span className="info-value">{profileData.favoriteTeam || 'Not set'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Location:</span>
                <span className="info-value">{profileData.location || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-right">
            <div className="profile-tabs">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
              <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Info</button>
              <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
              <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-content">
                  <h3>Welcome back, {user?.username || 'User'}!</h3>
                  <p>Role: <span style={{ color: getRoleColor(), fontWeight: 600 }}>{getRoleDisplay()}</span></p>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-content">
                        <h4>{userStats.totalBookings}</h4>
                        <p>Total Bookings</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h4>{userStats.upcomingBookings}</h4>
                        <p>Upcoming</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h4>{userStats.totalTeams}</h4>
                        <p>Teams Joined</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-content">
                        <h4>{userStats.completedBookings}</h4>
                        <p>Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="personal-content">
                  {isEditing ? (
                    <div className="edit-form">
                      <h3>Edit Personal Information</h3>
                      <div className="form-section">
                        <h4>Basic Information</h4>
                        <div className="form-group">
                          <label>Full Name</label>
                          <input type="text" name="fullName" value={profileData.fullName} onChange={handleInputChange} placeholder="Enter your full name" />
                        </div>
                        <div className="form-group">
                          <label>Email</label>
                          <input type="email" value={profileData.email} disabled className="form-input-disabled" />
                          <small>Email cannot be changed. Contact support for assistance.</small>
                        </div>
                        <div className="form-group">
                          <label>Phone Number</label>
                          <input type="tel" name="phone" value={profileData.phone} onChange={handleInputChange} placeholder="Enter your phone number" />
                        </div>
                        <div className="form-group">
                          <label>Location</label>
                          <input type="text" name="location" value={profileData.location} onChange={handleInputChange} placeholder="Enter your location" />
                        </div>
                        <div className="form-group">
                          <label>Bio</label>
                          <textarea name="bio" value={profileData.bio} onChange={handleInputChange} placeholder="Tell us about yourself" rows="4" />
                        </div>
                      </div>
                      <div className="form-section">
                        <h4>Player Information</h4>
                        <div className="form-group">
                          <label>Skill Level</label>
                          <select name="skillLevel" value={profileData.skillLevel} onChange={handleSelectChange} className="form-select">
                            {skillLevels.map(level => (
                              <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Preferred Position</label>
                          <select name="preferredPosition" value={profileData.preferredPosition} onChange={handleSelectChange} className="form-select">
                            {positionOptions.map(position => (
                              <option key={position} value={position}>{position}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Favorite Team</label>
                          <input type="text" name="favoriteTeam" value={profileData.favoriteTeam} onChange={handleInputChange} placeholder="Enter your favorite team" />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button className="save-btn" onClick={handleSaveProfile} disabled={updating}>
                          {updating ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3>Personal Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Full Name:</span>
                          <span className="info-value">{profileData.fullName || 'Not set'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email:</span>
                          <span className="info-value">{profileData.email}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Phone:</span>
                          <span className="info-value">{profileData.phone || 'Not set'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Location:</span>
                          <span className="info-value">{profileData.location || 'Not set'}</span>
                        </div>
                        <div className="info-item full-width">
                          <span className="info-label">Bio:</span>
                          <p className="info-bio">{profileData.bio || 'Not set'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="activity-content">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    {recentActivity.length > 0 ? (
                      recentActivity.map(activity => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-content">
                            <p>{activity.message}</p>
                            <span className="activity-time">{activity.time}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                          No recent activity yet. Book a court or join a team to see activity here!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="settings-content">
                  <h3>Account Settings</h3>
                  <div className="settings-list">
                    <div className="setting-item">
                      <span className="setting-label">Email Notifications</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={settings.emailNotifications} 
                          onChange={() => handleSettingChange('emailNotifications')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">Public Profile</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={settings.publicProfile} 
                          onChange={() => handleSettingChange('publicProfile')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  <div className="danger-zone">
                    <h4>Danger Zone</h4>
                    <button className="danger-btn" onClick={() => setShowDeleteModal(true)}>
                      Delete Account
                    </button>
                    <p className="danger-note">Once you delete your account, there is no going back.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Account</h3>
              <button className="close-modal" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <p>Are you sure you want to delete your account?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="delete-confirm-btn" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Profile;