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
  const [myTeams, setMyTeams] = useState([]);
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
        
        // FIXED: Extract user from response (response.user contains the actual user object)
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

  // FIXED: Get user team status
  const getUserTeamStatus = (team) => {
    if (!user || !team) return 'not_member';
    
    // Get user ID from user object
    const currentUserId = String(user._id || user.id || "");
    
    // Check if user is captain
    const captainId = String(team.captain?._id || team.captain?.id || team.captain || "");
    if (currentUserId && captainId && currentUserId === captainId) {
      return 'owner';
    }
    
    // Check if user is a member
    let isMember = false;
    
    if (team.players && Array.isArray(team.players)) {
      isMember = team.players.some(p => {
        let playerId = String(
          p.player?._id || 
          p.player?.id || 
          p.player || 
          p._id || 
          p.id || 
          ""
        );
        return playerId === currentUserId;
      });
    }
    
    if (isMember) return 'member';
    
    return 'not_member';
  };

  const getLevelBadge = (level) => {
    const colors = {
      beginner: { bg: '#dbeafe', color: '#1d4ed8', label: 'Beginner' },
      recreational: { bg: '#d1fae5', color: '#065f46', label: 'Recreational' },
      intermediate: { bg: '#fef3c7', color: '#92400e', label: 'Intermediate' },
      competitive: { bg: '#fee2e2', color: '#dc2626', label: 'Competitive' },
      professional: { bg: '#ede9fe', color: '#5b21b6', label: 'Professional' }
    };
    const style = colors[level] || colors.beginner;
    return (
      <span style={{ background: style.bg, color: style.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
        {style.label}
      </span>
    );
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'beginner': return '#3b82f6';
      case 'recreational': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'competitive': return '#ef4444';
      case 'professional': return '#8b5cf6';
      default: return '#64748b';
    }
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
      alert('Failed to send join request. Please try again.');
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
        {/* Header Section */}
        <div className="teams-header-section">
          <div>
            <h1 className="teams-main-title">Teams</h1>
            <p className="teams-subtitle">Discover and join teams to play together</p>
          </div>
          <button className="create-team-btn-header" onClick={() => navigate('/create-team')}>
            + Create New Team
          </button>
        </div>

        {/* Filter Bar */}
        <div className="teams-filter-bar">
          <div className="filter-tabs">
            <button 
              className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Teams ({allTeams.length})
            </button>
            <button 
              className={`filter-chip ${filter === 'recreational' ? 'active' : ''}`}
              onClick={() => setFilter('recreational')}
            >
              Recreational
            </button>
            <button 
              className={`filter-chip ${filter === 'intermediate' ? 'active' : ''}`}
              onClick={() => setFilter('intermediate')}
            >
              Intermediate
            </button>
            <button 
              className={`filter-chip ${filter === 'competitive' ? 'active' : ''}`}
              onClick={() => setFilter('competitive')}
            >
              Competitive
            </button>
            <button 
              className={`filter-chip ${filter === 'professional' ? 'active' : ''}`}
              onClick={() => setFilter('professional')}
            >
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
            <span className="search-icon"></span>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="teams-grid">
          {filteredTeams.length > 0 ? (
            filteredTeams.map(team => {
              const userStatus = getUserTeamStatus(team);
              const isOwner = userStatus === 'owner';
              const isMember = userStatus === 'member';
              const canJoin = userStatus === 'not_member';
              
              return (
                <div key={team._id || team.id} className="team-card-new">
                  <div className="team-card-header-new">
                    <div className="team-icon-new" style={{ background: getLevelColor(team.level || team.teamLevel) }}>
                      <span>⚽</span>
                    </div>
                    <div className="team-info-new">
                      <h3 className="team-name-new">{team.name || team.teamName}</h3>
                      {getLevelBadge(team.level || team.teamLevel)}
                    </div>
                  </div>
                  
                  <div className="team-stats-new">
                    <div className="stat-item-new">
                      <span className="stat-number">{team.players?.length || 0}</span>
                      <span className="stat-label-new">Players</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item-new">
                      <span className="stat-number">{team.matchesPlayed || team.totalMatches || 0}</span>
                      <span className="stat-label-new">Matches</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item-new">
                      <span className="stat-number">{team.matchesWon || team.wins || 0}</span>
                      <span className="stat-label-new">Wins</span>
                    </div>
                  </div>
                  
                  <div className="team-captain-new">
                    <span className="captain-label-new">Captain</span>
                    <span className="captain-name-new">{getCaptainName(team)}</span>
                  </div>
                  
                  <div className="team-actions-new">
                    <button className="view-details-btn" onClick={() => handleViewTeam(team)}>
                      View Details
                    </button>
                    
                    {canJoin && (
                      <button className="join-team-btn-new" onClick={() => handleJoinRequest(team)}>
                        Request to Join →
                      </button>
                    )}
                    
                    {isOwner && (
                      <button className="manage-team-btn" onClick={() => navigate(`/manage-team/${team._id || team.id}`)}>
                        Manage Team
                      </button>
                    )}
                    
                    {isMember && !isOwner && (
                      <button className="member-badge" disabled>
                        ✓ Member
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state-new">
              <div className="empty-icon-new">👥</div>
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
          <div className="team-modal-new" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-new">
              <div>
                <h2>{selectedTeam.name || selectedTeam.teamName}</h2>
                {getLevelBadge(selectedTeam.level || selectedTeam.teamLevel)}
              </div>
              <button className="close-modal-new" onClick={() => setShowTeamModal(false)}>×</button>
            </div>
            <div className="modal-body-new">
              <div className="info-row">
                <span className="info-label">Captain:</span>
                <span className="info-value">{getCaptainName(selectedTeam)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Description:</span>
                <p className="info-description">{selectedTeam.bio || selectedTeam.teamDescription || selectedTeam.description || 'No description provided.'}</p>
              </div>
              <div className="info-row">
                <span className="info-label">Created:</span>
                <span className="info-value">{selectedTeam.createdAt ? new Date(selectedTeam.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Visibility:</span>
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
            <div className="modal-footer-new">
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
          <div className="join-modal-new" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-new">
              <h2>Request to Join {joinTeam.name || joinTeam.teamName}</h2>
              <button className="close-modal-new" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            <div className="modal-body-new">
              <div className="team-info-preview">
                <p><strong>Captain:</strong> {getCaptainName(joinTeam)}</p>
                <p><strong>Level:</strong> {joinTeam.level || joinTeam.teamLevel}</p>
                <p><strong>Players:</strong> {joinTeam.players?.length || 0}</p>
              </div>
              
              <div className="message-section">
                <label>Message to Captain:</label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Introduce yourself and why you want to join this team..."
                  rows="4"
                  className="message-input"
                />
              </div>
            </div>
            <div className="modal-footer-new">
              <button className="cancel-btn-new" onClick={() => setShowJoinModal(false)}>Cancel</button>
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