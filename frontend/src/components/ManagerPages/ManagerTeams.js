import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken, apiFetch } from '../../services/api';
import Layout from '../Layout';
import './ManagerDashboard.css';

const ManagerTeams = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editingStats, setEditingStats] = useState(false);
  const [playerStats, setPlayerStats] = useState({
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    yellowCards: 0,
    redCards: 0
  });

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
        
        setUser(userData.user);
        
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

  const getLevelColor = (level) => {
    switch(level) {
      case 'beginner': return '#3b82f6';
      case 'intermediate': return '#f59e0b';
      case 'competitive': return '#ef4444';
      case 'professional': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const handleViewPlayer = (player) => {
    setSelectedPlayer(player);
    setPlayerStats({
      goals: player.goals || 0,
      assists: player.assists || 0,
      matchesPlayed: player.matchesPlayed || 0,
      yellowCards: player.yellowCards || 0,
      redCards: player.redCards || 0
    });
    setEditingStats(false);
    setShowPlayerModal(true);
  };

  const handleStatsChange = (e) => {
    const { name, value } = e.target;
    setPlayerStats(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleSaveStats = async () => {
    try {
      // API call to update player stats
      const response = await apiFetch(`/players/${selectedPlayer._id}/stats`, {
        method: 'PUT',
        body: JSON.stringify(playerStats)
      });
      
      if (response && response.success) {
        alert('Player stats updated successfully!');
        setEditingStats(false);
        
        // Update local state
        const updatedTeams = teams.map(team => ({
          ...team,
          players: team.players?.map(p => 
            (p._id === selectedPlayer._id) ? { ...p, ...playerStats } : p
          )
        }));
        setTeams(updatedTeams);
      } else {
        throw new Error(response?.message || 'Failed to update stats');
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
      alert(error.message || 'Failed to update player stats');
    }
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
      <div className="manager-dashboard">
        <div className="manager-header">
          <h1 className="manager-title">Teams Management</h1>
          <p className="manager-subtitle">View all registered teams and manage player statistics</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">👥</div>
            <div className="stat-info">
              <h3>{teams.length}</h3>
              <p>Total Teams</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">⚽</div>
            <div className="stat-info">
              <h3>{teams.reduce((sum, t) => sum + (t.matchesPlayed || 0), 0)}</h3>
              <p>Total Matches</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">🏆</div>
            <div className="stat-info">
              <h3>{teams.reduce((sum, t) => sum + (t.matchesWon || 0), 0)}</h3>
              <p>Total Wins</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">👤</div>
            <div className="stat-info">
              <h3>{teams.reduce((sum, t) => sum + (t.players?.length || 0), 0)}</h3>
              <p>Total Players</p>
            </div>
          </div>
        </div>

        <div className="teams-grid">
          {teams.length > 0 ? teams.map(team => (
            <div key={team._id || team.id} className="team-card">
              <div className="team-card-header">
                <div className="team-icon" style={{ background: getLevelColor(team.level) }}>
                  ⚽
                </div>
                <div>
                  <h3 className="team-name">{team.name}</h3>
                  <p className="team-level" style={{ color: getLevelColor(team.level) }}>
                    {team.level ? team.level.charAt(0).toUpperCase() + team.level.slice(1) : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="team-stats">
                <div className="team-stat">
                  <span className="stat-value">{team.players?.length || 0}</span>
                  <span className="stat-label">Players</span>
                </div>
                <div className="team-stat">
                  <span className="stat-value">{team.matchesPlayed || 0}</span>
                  <span className="stat-label">Matches</span>
                </div>
                <div className="team-stat">
                  <span className="stat-value">{team.matchesWon || 0}</span>
                  <span className="stat-label">Wins</span>
                </div>
                <div className="team-stat">
                  <span className="stat-value">
                    {team.matchesPlayed > 0 ? Math.round((team.matchesWon / team.matchesPlayed) * 100) : 0}%
                  </span>
                  <span className="stat-label">Win Rate</span>
                </div>
              </div>
              
              <div className="team-players">
                <h4>Players ({team.players?.length || 0})</h4>
                <div className="players-list">
                  {(team.players || []).slice(0, 3).map((player, index) => (
                    <div key={player._id || player.id || index} className="player-item" onClick={() => handleViewPlayer(player)}>
                      <div className="player-avatar">
                        {(player.name || player.username || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="player-info">
                        <div className="player-name">{player.name || player.username}</div>
                        <div className="player-position">{player.position || 'Player'}</div>
                        <div className="player-stats-badge">
                          ⚽ {player.goals || 0} | 🎯 {player.assists || 0} | 📊 {player.matchesPlayed || 0}
                        </div>
                      </div>
                      <button className="view-player-btn">Manage Stats</button>
                    </div>
                  ))}
                </div>
                {team.players?.length > 3 && (
                  <button className="view-all-btn">
                    View all {team.players.length} players →
                  </button>
                )}
              </div>
              
              <div className="team-footer">
                <span className="team-created">Created: {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}</span>
                <button className="view-team-btn">View Details</button>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>No teams registered yet.</p>
              <p style={{ fontSize: '14px', marginTop: '10px' }}>Teams are created by players. Check back later!</p>
            </div>
          )}
        </div>
      </div>

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
                  {(selectedPlayer.name || selectedPlayer.username || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="player-profile-info">
                  <h2>{selectedPlayer.name || selectedPlayer.username}</h2>
                  <p className="player-position-badge">{selectedPlayer.position || 'Player'}</p>
                </div>
              </div>
              
              {editingStats ? (
                <div className="stats-edit-form">
                  <h4>Edit Player Statistics</h4>
                  <div className="stats-form-grid">
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
                      <div className="stat-value">{selectedPlayer.goals || 0}</div>
                      <div className="stat-label">Goals</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{selectedPlayer.assists || 0}</div>
                      <div className="stat-label">Assists</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">{selectedPlayer.matchesPlayed || 0}</div>
                      <div className="stat-label">Matches</div>
                    </div>
                    <div className="player-stat-card">
                      <div className="stat-value">
                        {selectedPlayer.matchesPlayed > 0 
                          ? ((selectedPlayer.goals / selectedPlayer.matchesPlayed).toFixed(1)) 
                          : 0}
                      </div>
                      <div className="stat-label">Goals/Match</div>
                    </div>
                  </div>
                  
                  <div className="player-details">
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedPlayer.email || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedPlayer.phone || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Yellow Cards:</span>
                      <span className="detail-value">{selectedPlayer.yellowCards || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Red Cards:</span>
                      <span className="detail-value">{selectedPlayer.redCards || 0}</span>
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