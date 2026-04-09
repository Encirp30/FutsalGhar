import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerProfile.css';

const ManagerProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    joinDate: ''
  });

  useEffect(() => {
    const fetchManagerProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const userData = await api.getMe();
        const currentUser = userData.user;
        
        // Check if user is manager or admin
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

  const handleSaveProfile = async () => {
    try {
      const updateData = {
        profile: {
          fullName: profileData.fullName,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio
        }
      };
      
      const response = await api.updateProfile(user._id || user.id, updateData);
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('futsalUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = async () => {
    try {
      const userData = await api.getMe();
      const currentUser = userData.user;
      setProfileData({
        fullName: currentUser.profile?.fullName || currentUser.username || '',
        email: currentUser.email || '',
        phone: currentUser.profile?.phone || '',
        location: currentUser.profile?.location || '',
        bio: currentUser.profile?.bio || '',
        joinDate: new Date(currentUser.createdAt).toLocaleDateString()
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    setIsEditing(false);
  };

  const handleEditProfileClick = () => {
    setActiveTab('personal');
    setIsEditing(true);
  };

  const getRoleDisplay = () => {
    switch(user?.role) {
      case 'admin': return '🔴 Administrator';
      case 'manager': return '🟡 Manager';
      default: return '🔵 Staff';
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
      <div className="manager-profile-wrapper">
        <div className="manager-profile-content">
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
                  <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                    {getRoleDisplay()}
                  </p>
                  <p className="profile-member">Member since {profileData.joinDate}</p>
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
                <span className="info-value">{getRoleDisplay()}</span>
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
              <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-content">
                  <h3>Welcome back, {user?.username || 'Manager'}!</h3>
                  <p>Role: {getRoleDisplay()}</p>
                  <div className="manager-stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">🏟️</div>
                      <div className="stat-content">
                        <h4>Manage Courts</h4>
                        <p>Add and manage futsal courts</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <h4>Manage Teams</h4>
                        <p>View and manage registered teams</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">📅</div>
                      <div className="stat-content">
                        <h4>Manage Bookings</h4>
                        <p>View and confirm bookings</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">🏆</div>
                      <div className="stat-content">
                        <h4>Manage Tournaments</h4>
                        <p>Create and manage tournaments</p>
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
                          <input type="email" name="email" value={profileData.email} onChange={handleInputChange} placeholder="Enter your email" disabled />
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
                        <button className="save-btn" onClick={handleSaveProfile}>Save Changes</button>
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

              {activeTab === 'settings' && (
                <div className="settings-content">
                  <h3>Account Settings</h3>
                  <div className="settings-list">
                    <div className="setting-item">
                      <span className="setting-label">Email Notifications</span>
                      <label className="switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">SMS Notifications</span>
                      <label className="switch">
                        <input type="checkbox" />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">Booking Reminders</span>
                      <label className="switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">Tournament Alerts</span>
                      <label className="switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  <div className="danger-zone">
                    <h4>Danger Zone</h4>
                    <button className="danger-btn" onClick={() => alert('Contact support to delete manager account')}>Delete Account</button>
                    <p className="danger-note">Once you delete your account, there is no going back.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManagerProfile;