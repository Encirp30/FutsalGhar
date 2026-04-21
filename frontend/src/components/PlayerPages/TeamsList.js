import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './TeamsList.css';

const TeamsList = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allTeams, setAllTeams] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [_myTeams, setMyTeams] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTeam, setJoinTeam] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await api.getMe();
        if (!response) {
          navigate('/login');
          return;
        }
        
        const userData = response.user || response;
        setUser(userData);
        
        const teamsData = await api.getTeams();
        const publicTeams = (teamsData.data || []).filter(team => team.visibility !== 'private');
        setAllTeams(publicTeams);
        
        const userTeamsData = await api.getUserTeams();
        setMyTeams(userTeamsData.data || []);
      } catch (error) {
        console.error('Error fetching teams:', error);
        navigate('/login');
      }
      
      setLoading(false);
    };
    
    fetchTeams();
  }, [navigate]);

  const getCaptainName = (team) => {
    const captain = team.captain;
    if (!captain) return "Unknown Captain";
    return captain?.profile?.fullName || captain?.username || "Unknown Captain";
  };

  const getUserTeamStatus = (team) => {
    if (!user || !team) return 'not_member';
    
    const currentUserId = String(user._id || user.id || "");
    const captainId = String(team.captain?._id || team.captain?.id || team.captain || "");
    if (currentUserId && captainId && currentUserId === captainId) {
      return 'owner';
    }
    
    let isMember = false;
    if (team.players && Array.isArray(team.players)) {
      isMember = team.players.some(p => {
        let playerId = String(p.player?._id || p.player?.id || p.player || p._id || p.id || "");
        return playerId === currentUserId;
      });
    }
    if (isMember) return 'member';
    return 'not_member';
  };

  const getLevelBadge = (level) => {
    const colors = {
      beginner: { bg: '#eff6ff', color: '#3b82f6', label: 'Beginner' },
      recreational: { bg: '#f0fdf4', color: '#22c55e', label: 'Recreational' },
      intermediate: { bg: '#fefce8', color: '#eab308', label: 'Intermediate' },
      competitive: { bg: '#fef2f2', color: '#ef4444', label: 'Competitive' },
      professional: { bg: '#f3e8ff', color: '#a855f7', label: 'Professional' }
    };
    const style = colors[level] || colors.beginner;
    return (
      <span className="level-badge" style={{ background: style.bg, color: style.color }}>
        {style.label}
      </span>
    );
  };

  const handleViewTeam = (team) => {
    setSelectedTeam(team);
    setShowTeamModal(true);
  };

  const handleJoinRequest = (team) => {
    setJoinTeam(team);
    setJoinMessage('');
    setShowJoinModal(true);
  };

  // submitJoinRequest with proper error messages
  const submitJoinRequest = async () => {
    if (!joinMessage.trim()) {
      alert('Please enter a message for the team captain');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.requestJoinTeam(joinTeam._id || joinTeam.id, joinMessage);
      alert(`Join request sent to "${joinTeam.name}"! The captain will review your request.`);
      setShowJoinModal(false);
      setJoinTeam(null);
      setJoinMessage('');
    } catch (error) {
      console.error('Error sending join request:', error);
      
      // Display specific error message from backend
      const errorMessage = error.message;
      
      if (errorMessage === 'Join request already sent') {
        alert('You have already sent a join request to this team. Please wait for the captain to respond.');
      } else if (errorMessage === 'You are already a member of this team') {
        alert('You are already a member of this team.');
      } else if (errorMessage === 'Team not found') {
        alert('Team not found. Please refresh and try again.');
      } else if (errorMessage && errorMessage.includes('Cast to ObjectId failed')) {
        alert('Invalid team. Please refresh the page and try again.');
      } else {
        alert(errorMessage || 'Failed to send join request. Please try again.');
      }
    }
    
    setIsSubmitting(false);
  };

  const getFilteredTeams = () => {
    let filtered = allTeams;
    if (filter !== 'all') {
      filtered = filtered.filter(team => {
        const teamLevel = team.level || team.teamLevel;
        return teamLevel === filter;
      });
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(team => {
        const teamName = team.name || team.teamName || '';
        const captainName = getCaptainName(team).toLowerCase();
        return teamName.toLowerCase().includes(searchLower) || captainName.includes(searchLower);
      });
    }
    return filtered;
  };

  const filteredTeams = getFilteredTeams();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading teams...</p>
      </div>
    );
  }

  return (
    <Layout activePage="teams">
      <div className="teams-list-page">
        <div className="teams-filter-bar">
          <div className="filter-tabs">
            <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All Teams ({allTeams.length})
            </button>
            <button className={`filter-chip ${filter === 'recreational' ? 'active' : ''}`} onClick={() => setFilter('recreational')}>
              Recreational
            </button>
            <button className={`filter-chip ${filter === 'intermediate' ? 'active' : ''}`} onClick={() => setFilter('intermediate')}>
              Intermediate
            </button>
            <button className={`filter-chip ${filter === 'competitive' ? 'active' : ''}`} onClick={() => setFilter('competitive')}>
              Competitive
            </button>
            <button className={`filter-chip ${filter === 'professional' ? 'active' : ''}`} onClick={() => setFilter('professional')}>
              Professional
            </button>
          </div>
          
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search teams by name or captain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <button className="create-team-btn-header" onClick={() => navigate('/create-team')}>
            + Create New Team
          </button>
        </div>

        <div className="teams-grid">
          {filteredTeams.length > 0 ? (
            filteredTeams.map(team => {
              const userStatus = getUserTeamStatus(team);
              const isOwner = userStatus === 'owner';
              const isMember = userStatus === 'member';
              const canJoin = userStatus === 'not_member';
              
              return (
                <div key={team._id || team.id} className="team-card">
                  <div className="team-card-header">
                    <div className="team-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                    <div className="team-info">
                      <h3 className="team-name">{team.name || team.teamName}</h3>
                      {getLevelBadge(team.level || team.teamLevel)}
                    </div>
                  </div>
                  
                  <div className="team-stats">
                    <div className="stat-item">
                      <span className="stat-number">{team.players?.length || 0}</span>
                      <span className="stat-label">Players</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                      <span className="stat-number">{team.totalMatches || 0}</span>
                      <span className="stat-label">Matches</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                      <span className="stat-number">{team.wins || 0}</span>
                      <span className="stat-label">Wins</span>
                    </div>
                  </div>
                  
                  <div className="team-captain">
                    <span className="captain-label">Captain</span>
                    <span className="captain-name">{getCaptainName(team)}</span>
                  </div>
                  
                  <div className="team-actions">
                    <button className="view-details-btn" onClick={() => handleViewTeam(team)}>
                      View Details
                    </button>
                    
                    {canJoin && (
                      <button className="join-team-btn" onClick={() => handleJoinRequest(team)}>
                        Request to Join
                      </button>
                    )}
                    
                    {isOwner && (
                      <button className="manage-team-btn" onClick={() => navigate(`/manage-team/${team._id || team.id}`)}>
                        Manage Team
                      </button>
                    )}
                    
                    {isMember && !isOwner && (
                      <button className="member-badge" disabled>
                        Member
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <h3>No teams found</h3>
              <p>Try adjusting your search or create a new team</p>
              <button className="create-team-empty-btn" onClick={() => navigate('/create-team')}>
                + Create Your First Team
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Team Details Modal */}
      {showTeamModal && selectedTeam && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedTeam.name || selectedTeam.teamName}</h2>
                {getLevelBadge(selectedTeam.level || selectedTeam.teamLevel)}
              </div>
              <button className="close-modal" onClick={() => setShowTeamModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-row">
                <span className="info-label">Captain</span>
                <span className="info-value">{getCaptainName(selectedTeam)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Description</span>
                <p className="info-description">{selectedTeam.bio || selectedTeam.teamDescription || selectedTeam.description || 'No description provided.'}</p>
              </div>
              <div className="info-row">
                <span className="info-label">Created</span>
                <span className="info-value">{selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Visibility</span>
                <span className="info-value">{selectedTeam.visibility === 'public' ? 'Public' : 'Private'}</span>
              </div>
              
              <div className="roster-section">
                <h4>Team Roster ({selectedTeam.players?.length || 0})</h4>
                <div className="roster-list">
                  {selectedTeam.players?.map((player, index) => (
                    <div key={index} className="roster-item">
                      <div className="roster-avatar">
                        {(player.player?.fullName || player.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="roster-info">
                        <span className="roster-name">{player.player?.fullName || player.name || 'Player'}</span>
                        <span className="roster-position">{player.position}</span>
                      </div>
                      {player.isCaptain && <span className="captain-badge">Captain</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="close-btn" onClick={() => setShowTeamModal(false)}>Close</button>
              {getUserTeamStatus(selectedTeam) === 'not_member' && (
                <button className="join-btn" onClick={() => {
                  setShowTeamModal(false);
                  handleJoinRequest(selectedTeam);
                }}>
                  Request to Join
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join Request Modal */}
      {showJoinModal && joinTeam && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="join-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request to Join {joinTeam.name || joinTeam.teamName}</h2>
              <button className="close-modal" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="team-info-preview">
                <p><strong>Captain:</strong> {getCaptainName(joinTeam)}</p>
                <p><strong>Level:</strong> {joinTeam.level || joinTeam.teamLevel}</p>
                <p><strong>Players:</strong> {joinTeam.players?.length || 0}</p>
              </div>
              
              <div className="message-section">
                <label>Message to Captain</label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Introduce yourself and why you want to join this team..."
                  rows="4"
                  className="message-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button className="send-btn" onClick={submitJoinRequest} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TeamsList;