import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken, apiFetch } from '../../services/api';
import Layout from '../Layout';
import './ManagerProfile.css';

const ManagerProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Show/hide password states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    joinDate: ''
  });

  const [managerStats, setManagerStats] = useState({
    totalCourts: 0,
    totalTournaments: 0,
    totalTeams: 0,
    totalPlayers: 0,
    totalMatches: 0
  });
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    publicProfile: true
  });

  useEffect(() => {
    const fetchManagerProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const userResponse = await api.getMe();
        const currentUser = userResponse.user || userResponse;
        
        if (currentUser.role !== 'manager' && currentUser.role !== 'admin') {
          alert('Access Denied! This page is for managers only.');
          navigate('/dashboard');
          return;
        }
        
        setUser(currentUser);
        
        setProfileData({
          fullName: currentUser.profile?.fullName || currentUser.username || '',
          email: currentUser.email || '',
          phone: currentUser.profile?.phone || '',
          location: currentUser.profile?.location || '',
          bio: currentUser.profile?.bio || '',
          joinDate: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }) : 'N/A'
        });
        
        // Fetch manager stats
        try {
          const [courtsData, tournamentsData, teamsData, matchesData] = await Promise.all([
            api.getCourts(),
            api.getTournaments(),
            api.getTeams(),
            api.getMatches()
          ]);
          
          // Calculate total players from all teams
          let totalPlayers = 0;
          const teamsList = teamsData.data || teamsData.teams || [];
          teamsList.forEach(team => {
            if (team.players && Array.isArray(team.players)) {
              totalPlayers += team.players.length;
            }
          });
          
          setManagerStats({
            totalCourts: courtsData.data?.length || courtsData.courts?.length || 0,
            totalTournaments: tournamentsData.tournaments?.length || tournamentsData.data?.length || 0,
            totalTeams: teamsData.data?.length || teamsData.teams?.length || 0,
            totalPlayers: totalPlayers,
            totalMatches: matchesData.matches?.length || matchesData.data?.length || 0
          });
        } catch (statsError) {
          console.log('Error fetching manager stats:', statsError);
          setManagerStats({
            totalCourts: 0,
            totalTournaments: 0,
            totalTeams: 0,
            totalPlayers: 0,
            totalMatches: 0
          });
        }
        
        // Load settings
        const savedSettings = localStorage.getItem('managerSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
        
      } catch (error) {
        console.error('Error fetching manager profile:', error);
        navigate('/login');
      }
      setLoading(false);
    };
    
    fetchManagerProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingChange = (setting) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting] };
      localStorage.setItem('managerSettings', JSON.stringify(newSettings));
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
        bio: profileData.bio
      };
      
      const response = await api.updateProfile(updateData);
      
      if (response && response.success) {
        alert('Profile updated successfully!');
        setIsEditing(false);
        
        const userResponse = await api.getMe();
        const currentUser = userResponse.user || userResponse;
        setUser(currentUser);
        
        setProfileData({
          fullName: currentUser.profile?.fullName || currentUser.username || '',
          email: currentUser.email || '',
          phone: currentUser.profile?.phone || '',
          location: currentUser.profile?.location || '',
          bio: currentUser.profile?.bio || '',
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

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }
    
    setUpdatingPassword(true);
    try {
      const response = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword
        })
      });
      
      if (response && response.success) {
        alert('Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        throw new Error(response?.message || 'Failed to change password');
      }
    } catch (error) {
      alert(error.message || 'Failed to change password. Please check your current password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      fullName: user?.profile?.fullName || user?.username || '',
      email: user?.email || '',
      phone: user?.profile?.phone || '',
      location: user?.profile?.location || '',
      bio: user?.profile?.bio || '',
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
      const response = await apiFetch('/users/me', {
        method: 'DELETE'
      });
      
      if (response && response.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('managerSettings');
        alert('Your account has been deleted successfully.');
        navigate('/login');
      } else {
        throw new Error(response?.message || 'Failed to delete account');
      }
    } catch (error) {
      alert(error.message || 'Failed to delete account. Please contact support.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getRoleDisplay = () => {
    switch(user?.role) {
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      default: return 'Staff';
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
                  {user?.username?.charAt(0).toUpperCase() || 'M'}
                </div>
                <div className="profile-info">
                  <h2>{profileData.fullName || user?.username || 'Manager'}</h2>
                  <p className="profile-email">{profileData.email || user?.email}</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px', color: getRoleColor() }}>
                    {getRoleDisplay()}
                  </p>
                  <p className="profile-member">Member since {profileData.joinDate}</p>
                </div>
              </div>

              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number">{managerStats.totalCourts}</span>
                  <span className="stat-label">Courts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{managerStats.totalTournaments}</span>
                  <span className="stat-label">Tournaments</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{managerStats.totalTeams}</span>
                  <span className="stat-label">Teams</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{managerStats.totalPlayers}</span>
                  <span className="stat-label">Players</span>
                </div>
              </div>

              {!isEditing && (
                <button className="edit-profile-btn" onClick={handleEditProfileClick}>
                  Edit Profile
                </button>
              )}
            </div>

            <div className="info-card">
              <h3>Manager Information</h3>
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">{user?.username || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value" style={{ color: getRoleColor() }}>{getRoleDisplay()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{profileData.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone:</span>
                <span className="info-value">{profileData.phone || 'Not set'}</span>
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
              <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</button>
              <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-content">
                  <h3>Welcome back, {user?.username || 'Manager'}!</h3>
                  <p>Role: <span style={{ color: getRoleColor(), fontWeight: 600 }}>{getRoleDisplay()}</span></p>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h4>{managerStats.totalCourts}</h4>
                        <p>Courts Managed</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h4>{managerStats.totalTournaments}</h4>
                        <p>Tournaments Created</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h4>{managerStats.totalTeams}</h4>
                        <p>Teams Registered</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h4>{managerStats.totalPlayers}</h4>
                        <p>Registered Players</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="personal-content">
                  {isEditing ? (
                    <div className="edit-form">
                      <h3>Edit Manager Information</h3>
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

              {activeTab === 'security' && (
                <div className="security-content">
                  <h3>Security</h3>
                  
                  <div className="security-section">
                    <h4>Change Password</h4>
                    <p className="security-description">Update your password to keep your account secure.</p>
                    <button className="change-password-btn" onClick={() => setShowPasswordModal(true)}>
                      Change Password
                    </button>
                  </div>

                  <div className="danger-zone">
                    <h4>Danger Zone</h4>
                    <button className="danger-btn" onClick={() => setShowDeleteModal(true)}>
                      Delete Account
                    </button>
                    <p className="danger-note">Once you delete your account, there is no going back. All your data will be permanently removed.</p>
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal with Show/Hide Toggle */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-modal" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Current Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your current password"
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#64748b" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth="1.5"/>
                        <path d="M20 4L4 20" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#64748b" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#64748b" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth="1.5"/>
                        <path d="M20 4L4 20" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#64748b" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm your new password"
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#64748b" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth="1.5"/>
                        <path d="M20 4L4 20" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#64748b" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="#64748b" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={handleChangePassword} disabled={updatingPassword}>
                {updatingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="warning-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12M12 16H12.01M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p>Are you sure you want to delete your account?</p>
                <p className="warning-text">This action cannot be undone. All your data will be permanently removed.</p>
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

export default ManagerProfile;