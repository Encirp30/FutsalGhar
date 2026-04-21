import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManageMyTeams.css';

const ManageMyTeams = () => {
  const [myOwnedTeams, setMyOwnedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [_currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Team owner check using user data from API
  const isTeamOwner = (team, user) => {
    if (!user || !team) return false;
    
    const userId = String(user._id || user.id || "").trim();
    const username = String(user.username || "").trim().toLowerCase();
    const captainId = String(team.captain?._id || team.captain?.id || team.captain || "").trim();
    const captainUsername = String(team.captain?.username || team.teamCaptain || "").trim().toLowerCase();
    
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

        const response = await api.getMe();
        const userData = response.user || response;
        setCurrentUser(userData);

        const teamsResponse = await api.getTeams();
        const allTeams = teamsResponse.data || teamsResponse.teams || [];

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

  if (loading) {
    return (
      <Layout activePage="manage-my-teams">
        <div className="manage-teams-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your teams...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout activePage="manage-my-teams">
        <div className="manage-teams-container">
          <div className="error-state">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="1.5"/>
                <path d="M12 8V12M12 16H12.01" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (myOwnedTeams.length === 0) {
    return (
      <Layout activePage="manage-my-teams">
        <div className="manage-teams-container">
          <div className="empty-state">
            <div className="empty-illustration">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="#3b82f6" strokeWidth="1.5" fill="#eff6ff"/>
                <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="#eff6ff"/>
                <path d="M17 2L19 4L23 0" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>No Teams Yet</h3>
            <p>You haven't created any teams as a captain.</p>
            <p className="empty-subtext">Create your first team to start managing players, set up matches, and lead your squad to victory!</p>
            <button className="create-team-btn" onClick={() => navigate('/create-team')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Create Your First Team
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activePage="manage-my-teams">
      <div className="manage-teams-container">
        <div className="teams-grid">
          {myOwnedTeams.map(team => (
            <div key={team._id || team.id} className="team-card">
              <div className="team-card-header">
                <div className="team-avatar">
                  {(team.name || team.teamName || 'T').charAt(0).toUpperCase()}
                </div>
                <div className="team-info">
                  <h3 className="team-name">{team.name || team.teamName}</h3>
                  <span className="team-level">{team.level || team.teamLevel || 'Recreational'}</span>
                </div>
              </div>
              
              <div className="team-stats">
                <div className="stat-item">
                  <span className="stat-value">{team.players?.length || 0}</span>
                  <span className="stat-label">Players</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">{team.totalMatches || 0}</span>
                  <span className="stat-label">Matches</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">{team.wins || 0}</span>
                  <span className="stat-label">Wins</span>
                </div>
              </div>
              
              <button 
                className="manage-team-btn"
                onClick={() => navigate(`/manage-team/${team._id || team.id}`)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 7L4 7M10 12L4 12M14 17L4 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="19" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="16" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="18" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                Manage Team
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ManageMyTeams;