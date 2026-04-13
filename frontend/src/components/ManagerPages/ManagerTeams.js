import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerTeams.css';

const ManagerTeams = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState(null);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(null);
  const [editingStats, setEditingStats] = useState(false);
  const [playerStats, setPlayerStats] = useState({
    name: '',
    position: '',
    jerseyNumber: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    yellowCards: 0,
    redCards: 0,
    isActive: true
  });
  
  // Team Details Modal State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
    const fetchManagerTeams = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const userData = await api.getMe();

        if (userData.user.role !== 'manager' && userData.user.role !== 'admin') {
          alert('Access Denied! Manager privileges required.');
          navigate('/dashboard');
          return;
        }
        
        const teamsData = await api.getTeams();
        setTeams(teamsData.data || []);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching manager teams:', error);
        navigate('/login');
      }
    };
    
    fetchManagerTeams();
  }, [navigate]);

  const getLevelBadge = (level) => {
    const colors = {
      beginner: { bg: '#eff6ff', color: '#3b82f6', label: 'Beginner' },
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

  // Get captain player from team
  const getCaptainPlayer = (team) => {
    if (!team.players) return null;
    
    const captainId = team.captain?._id || team.captain?.id || team.captain;
    if (!captainId) return null;
    
    const captain = team.players.find(p => {
      const playerId = p.player?._id || p.player?.id || p._id || p.id;
      return playerId === captainId;
    });
    
    return captain;
  };

  const handleViewTeam = async (team) => {
    setSelectedTeam(team);
    setShowTeamModal(true);
    setLoadingTeam(true);
    setTeamDetails(null);
    
    try {
      const response = await api.getTeam(team._id || team.id);
      const teamData = response.team || response;
      setTeamDetails(teamData);
    } catch (error) {
      console.error('Error fetching team details:', error);
      alert('Failed to load team details');
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleViewPlayer = (player, teamId = null, playerIndex = null) => {
    setSelectedPlayer(player);
    setSelectedTeamForPlayer(teamId);
    setSelectedPlayerIndex(playerIndex);
    
    if (teamId !== null && playerIndex !== null) {
      const team = teams.find(t => (t._id || t.id) === teamId);
      if (team && team.players && team.players[playerIndex]) {
        const p = team.players[playerIndex];
        setPlayerStats({
          name: p.name || p.player?.fullName || '',
          position: p.position || '',
          jerseyNumber: p.jerseyNumber || 0,
          goals: p.goals || 0,
          assists: p.assists || 0,
          matchesPlayed: p.matchesPlayed || 0,
          yellowCards: p.yellowCards || 0,
          redCards: p.redCards || 0,
          isActive: p.isActive !== false
        });
        setEditingStats(false);
        setShowPlayerModal(true);
        return;
      }
    }
    
    // If we don't have teamId/playerIndex, try to find the player
    for (const team of teams) {
      if (!team.players) continue;
      const index = team.players.findIndex(p => {
        const playerId = p.player?._id || p.player?.id || p._id || p.id;
        const targetId = player._id || player.id;
        return playerId === targetId;
      });
      if (index !== -1) {
        setSelectedTeamForPlayer(team._id || team.id);
        setSelectedPlayerIndex(index);
        const p = team.players[index];
        setPlayerStats({
          name: p.name || p.player?.fullName || '',
          position: p.position || '',
          jerseyNumber: p.jerseyNumber || 0,
          goals: p.goals || 0,
          assists: p.assists || 0,
          matchesPlayed: p.matchesPlayed || 0,
          yellowCards: p.yellowCards || 0,
          redCards: p.redCards || 0,
          isActive: p.isActive !== false
        });
        setEditingStats(false);
        setShowPlayerModal(true);
        return;
      }
    }
    
    // Fallback
    setPlayerStats({
      name: player.name || player.username || '',
      position: player.position || '',
      jerseyNumber: player.jerseyNumber || 0,
      goals: player.goals || 0,
      assists: player.assists || 0,
      matchesPlayed: player.matchesPlayed || 0,
      yellowCards: player.yellowCards || 0,
      redCards: player.redCards || 0,
      isActive: player.isActive !== false
    });
    setEditingStats(false);
    setShowPlayerModal(true);
  };

  const handleStatsChange = (e) => {
    const { name, value } = e.target;
    setPlayerStats(prev => ({ ...prev, [name]: name === 'jerseyNumber' ? parseInt(value) || 0 : parseInt(value) || 0 }));
  };

  const handleSaveStats = async () => {
    if (selectedTeamForPlayer === null || selectedPlayerIndex === null) {
      alert('Cannot find player in team. Please refresh and try again.');
      return;
    }
    
    // Check for duplicate jersey number within the same team
    const team = teams.find(t => (t._id || t.id) === selectedTeamForPlayer);
    if (team && team.players) {
      const duplicateJersey = team.players.some((p, idx) => 
        idx !== selectedPlayerIndex && p.jerseyNumber === playerStats.jerseyNumber && playerStats.jerseyNumber !== 0
      );
      if (duplicateJersey) {
        alert('Another player in this team already has this jersey number. Please choose a different number.');
        return;
      }
    }
    
    try {
      const response = await api.updateTeamRoster(selectedTeamForPlayer, {
        playerIndex: selectedPlayerIndex,
        name: playerStats.name,
        position: playerStats.position,
        jerseyNumber: playerStats.jerseyNumber,
        goals: playerStats.goals,
        assists: playerStats.assists,
        matchesPlayed: playerStats.matchesPlayed,
        yellowCards: playerStats.yellowCards,
        redCards: playerStats.redCards,
        isActive: playerStats.isActive
      });
      
      if (response && response.success) {
        alert('Player stats updated successfully!');
        setEditingStats(false);
        
        // Refresh teams data
        const teamsData = await api.getTeams();
        setTeams(teamsData.data || []);
        
        // Refresh team details if modal is open
        if (showTeamModal && selectedTeam) {
          const updatedTeamResponse = await api.getTeam(selectedTeam._id || selectedTeam.id);
          setTeamDetails(updatedTeamResponse.team || updatedTeamResponse);
        }
      } else {
        throw new Error(response?.message || 'Failed to update stats');
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
      alert(error.message || 'Failed to update player stats. Please try again.');
    }
  };

  const getCaptainName = (team) => {
    const captain = team.captain;
    if (!captain) return "Unknown Captain";
    return captain?.profile?.fullName || captain?.username || "Unknown Captain";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Teams...</p>
      </div>
    );
  }

  return (
    <Layout activePage="managerTeams">
      <div className="manager-teams-page">
        {/* Stats Section - No Header */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{teams.length}</h3>
                <p>Total Teams</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{teams.reduce((sum, t) => sum + (t.totalMatches || 0), 0)}</h3>
                <p>Total Matches</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{teams.reduce((sum, t) => sum + (t.wins || 0), 0)}</h3>
                <p>Total Wins</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{teams.reduce((sum, t) => sum + (t.players?.length || 0), 0)}</h3>
                <p>Total Players</p>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="teams-section">
          <div className="teams-grid">
            {teams.length > 0 ? teams.map(team => {
              const captainPlayer = getCaptainPlayer(team);
              const teamId = team._id || team.id;
              return (
                <div key={teamId} className="team-card">
                  <div className="team-card-header">
                    <div className="team-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="white" strokeWidth="1.5" fill="none"/>
                        <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                    <div className="team-header-info">
                      <h3 className="team-name">{team.name}</h3>
                      {getLevelBadge(team.level)}
                    </div>
                  </div>
                  
                  <div className="team-stats">
                    <div className="team-stat">
                      <span className="stat-value">{team.players?.length || 0}</span>
                      <span className="stat-label">Players</span>
                    </div>
                    <div className="team-stat">
                      <span className="stat-value">{team.totalMatches || 0}</span>
                      <span className="stat-label">Matches</span>
                    </div>
                    <div className="team-stat">
                      <span className="stat-value">{team.wins || 0}</span>
                      <span className="stat-label">Wins</span>
                    </div>
                    <div className="team-stat">
                      <span className="stat-value">
                        {team.totalMatches > 0 ? Math.round((team.wins / team.totalMatches) * 100) : 0}%
                      </span>
                      <span className="stat-label">Win Rate</span>
                    </div>
                  </div>
                  
                  {/* Captain Info */}
                  <div className="team-captain-section">
                    <h4>Team Captain</h4>
                    {captainPlayer ? (
                      <div className="captain-info-display">
                        <div className="captain-avatar-small">
                          {(captainPlayer.name || captainPlayer.player?.username || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="captain-details">
                          <div className="captain-name">{captainPlayer.name || captainPlayer.player?.username || 'Captain'}</div>
                          <div className="captain-position">{captainPlayer.position || 'Player'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="no-captain-message">No captain assigned</div>
                    )}
                  </div>
                  
                  <div className="team-footer">
                    <span className="team-created">Created: {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}</span>
                    <button className="view-team-btn" onClick={() => handleViewTeam(team)}>View Details</button>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
                <p>No teams registered yet.</p>
                <p className="empty-subtext">Teams are created by players. Check back later!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Details Modal */}
      {showTeamModal && selectedTeam && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="team-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Team Details</h3>
              <button className="close-modal" onClick={() => setShowTeamModal(false)}>×</button>
            </div>
            <div className="modal-content">
              {loadingTeam ? (
                <div className="loading-team-details">
                  <div className="loading-spinner-small"></div>
                  <p>Loading team details...</p>
                </div>
              ) : teamDetails ? (
                <>
                  <div className="team-info-section">
                    <div className="team-info-header">
                      <h2>{teamDetails.name}</h2>
                      {getLevelBadge(teamDetails.level)}
                    </div>
                    <div className="team-info-details">
                      <div className="info-row">
                        <span className="info-label">Captain</span>
                        <span className="info-value">{getCaptainName(teamDetails)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Description</span>
                        <p className="info-description">{teamDetails.bio || teamDetails.teamDescription || teamDetails.description || 'No description provided.'}</p>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Created</span>
                        <span className="info-value">{teamDetails.createdAt ? new Date(teamDetails.createdAt).toLocaleDateString() : 'Unknown'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Visibility</span>
                        <span className="info-value">{teamDetails.visibility === 'public' ? 'Public' : 'Private'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="team-players-full">
                    <h4>Team Roster ({teamDetails.players?.length || 0})</h4>
                    <div className="players-full-list">
                      {teamDetails.players?.map((player, index) => {
                        const currentTeamId = teamDetails._id || teamDetails.id;
                        return (
                          <div key={index} className="player-full-item">
                            <div className="player-full-avatar">
                              {(player.player?.fullName || player.name || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div className="player-full-info">
                              <div className="player-full-name">{player.player?.fullName || player.name || 'Player'}</div>
                              <div className="player-full-position">{player.position}</div>
                              <div className="player-full-stats">
                                <span>Jersey: #{player.jerseyNumber || 'N/A'}</span>
                                <span>Goals: {player.goals || 0}</span>
                                <span>Assists: {player.assists || 0}</span>
                                <span>Matches: {player.matchesPlayed || 0}</span>
                              </div>
                            </div>
                            {player.isCaptain && <span className="captain-badge">Captain</span>}
                            <button className="view-player-stats-btn" onClick={() => handleViewPlayer(player, currentTeamId, index)}>
                              View Stats
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="error-team-details">
                  <p>Failed to load team details</p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowTeamModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Player Stats Modal */}
      {showPlayerModal && selectedPlayer && (
        <div className="modal-overlay" onClick={() => setShowPlayerModal(false)}>
          <div className="modal player-modal stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Player Statistics</h3>
              <button className="close-modal" onClick={() => setShowPlayerModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="player-profile-header">
                <div className="player-profile-avatar">
                  {(playerStats.name || selectedPlayer.name || selectedPlayer.username || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="player-profile-info">
                  <h2>{playerStats.name || selectedPlayer.name || selectedPlayer.username}</h2>
                  <p className="player-position-badge">{playerStats.position || selectedPlayer.position || 'Player'}</p>
                </div>
              </div>
              
              {editingStats ? (
                <div className="stats-edit-form">
                  <h4>Edit Player Statistics</h4>
                  <div className="stats-form-grid">
                    <div className="stat-input-group">
                      <label>Jersey Number</label>
                      <input
                        type="number"
                        name="jerseyNumber"
                        value={playerStats.jerseyNumber}
                        onChange={handleStatsChange}
                        min="0"
                        max="99"
                      />
                    </div>
                    <div className="stat-input-group">
                      <label>Position</label>
                      <input
                        type="text"
                        name="position"
                        value={playerStats.position}
                        onChange={handleStatsChange}
                        placeholder="Position"
                      />
                    </div>
                    <div className="stat-input-group">
                      <label>Goals</label>
                      <input
                        type="number"
                        name="goals"
                        value={playerStats.goals}
                        onChange={handleStatsChange}
                        min="0"
                      />
                    </div>
                    <div className="stat-input-group">
                      <label>Assists</label>
                      <input
                        type="number"
                        name="assists"
                        value={playerStats.assists}
                        onChange={handleStatsChange}
                        min="0"
                      />
                    </div>
                    <div className="stat-input-group">
                      <label>Matches Played</label>
                      <input
                        type="number"
                        name="matchesPlayed"
                        value={playerStats.matchesPlayed}
                        onChange={handleStatsChange}
                        min="0"
                      />
                    </div>
                    <div className="stat-input-group">
                      <label>Yellow Cards</label>
                      <input
                        type="number"
                        name="yellowCards"
                        value={playerStats.yellowCards}
                        onChange={handleStatsChange}
                        min="0"
                      />
                    </div>
                    <div className="stat-input-group">
                      <label>Red Cards</label>
                      <input
                        type="number"
                        name="redCards"
                        value={playerStats.redCards}
                        onChange={handleStatsChange}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="player-stats-display">
                  <div className="player-stats-grid">
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.jerseyNumber || selectedPlayer.jerseyNumber || 'N/A'}</div>
                      <div className="stat-label">Jersey</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.position || selectedPlayer.position || 'N/A'}</div>
                      <div className="stat-label">Position</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.goals || selectedPlayer.goals || 0}</div>
                      <div className="stat-label">Goals</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.assists || selectedPlayer.assists || 0}</div>
                      <div className="stat-label">Assists</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.matchesPlayed || selectedPlayer.matchesPlayed || 0}</div>
                      <div className="stat-label">Matches</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.yellowCards || selectedPlayer.yellowCards || 0}</div>
                      <div className="stat-label">Yellow Cards</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{playerStats.redCards || selectedPlayer.redCards || 0}</div>
                      <div className="stat-label">Red Cards</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowPlayerModal(false)}>Close</button>
              {editingStats ? (
                <>
                  <button className="cancel-btn" onClick={() => setEditingStats(false)}>Cancel</button>
                  <button className="confirm-btn" onClick={handleSaveStats}>Save Stats</button>
                </>
              ) : (
                <button className="confirm-btn" onClick={() => setEditingStats(true)}>Edit Stats</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerTeams;