import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManageMyTeams.css';

const ManageMyTeams = () => {
  const [myOwnedTeams, setMyOwnedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Team owner check using user data from API
  const isTeamOwner = (team, user) => {
    if (!user || !team) return false;
    
    // Get user identifiers from API response
    const userId = String(user._id || user.id || "").trim();
    const username = String(user.username || "").trim().toLowerCase();
    
    // Get team captain identifiers
    const captainId = String(team.captain?._id || team.captain?.id || team.captain || "").trim();
    const captainUsername = String(team.captain?.username || team.teamCaptain || "").trim().toLowerCase();
    
    // Check if user is captain
    if (userId && captainId && userId === captainId) return true;
    if (username && captainUsername && username === captainUsername) return true;
    
    return false;
  };

  useEffect(() => {
    const fetchUserAndTeams = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }

        // 1. Get current user from API
        const response = await api.getMe();
        const userData = response.user || response;
        setCurrentUser(userData);

        // 2. Fetch all teams
        const teamsResponse = await api.getTeams();
        const allTeams = teamsResponse.data || teamsResponse.teams || [];

        // 3. Filter teams where user is captain/owner
        const owned = allTeams.filter(team => isTeamOwner(team, userData));
        
        setMyOwnedTeams(owned);
      } catch (err) {
        console.error("Error fetching managed teams:", err);
        setError('Failed to load teams. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTeams();
  }, [navigate]);

  // Show loading state
  if (loading) {
    return (
      <Layout activePage="manage-my-teams">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your teams...</p>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout activePage="manage-my-teams">
        <div className="manage-teams-container">
          <div className="error-message">{error}</div>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  // Show empty state when no teams
  if (myOwnedTeams.length === 0) {
    return (
      <Layout activePage="manage-my-teams">
        <div className="manage-teams-container">
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <h3>You haven't created any teams yet.</h3>
            <p>Create your first team to start managing players and setting up matches!</p>
            <button className="create-btn" onClick={() => navigate('/create-team')}>
              + Create Your First Team
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Show teams
  return (
    <Layout activePage="manage-my-teams">
      <div className="manage-teams-container">
        <div className="manage-teams-header">
          <h1>Manage Your Teams</h1>
          <p>As a Captain, you can edit rosters, change jersey numbers, and update team details here.</p>
        </div>

        <div className="teams-grid">
          {myOwnedTeams.map(team => (
            <div key={team._id || team.id} className="team-card">
              <div className="team-card-header">
                <div className="team-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="white" strokeWidth="1.5" fill="none"/>
                    <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
                <h3>{team.name || team.teamName}</h3>
              </div>
              <div className="team-stats">
                <div className="stat">
                  <span className="stat-value">{team.players?.length || 0}</span>
                  <span className="stat-label">Members</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{team.level || team.teamLevel || 'N/A'}</span>
                  <span className="stat-label">Level</span>
                </div>
              </div>
              <button 
                className="manage-btn"
                onClick={() => navigate(`/manage-team/${team._id || team.id}`)}
              >
                Manage Roster & Settings
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ManageMyTeams;