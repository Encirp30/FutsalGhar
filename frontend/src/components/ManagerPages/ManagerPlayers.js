import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken, apiFetch } from '../../services/api';
import Layout from '../Layout';
import './ManagerPlayers.css';

const ManagerPlayers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerTeam, setSelectedPlayerTeam] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerDetailsMap, setPlayerDetailsMap] = useState({});

  useEffect(() => {
    const fetchManagerPlayers = async () => {
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
        const allTeams = teamsData.data || [];
        setTeams(allTeams);
        
        const allPlayers = [];
        const userIdsToFetch = [];
        
        allTeams.forEach(team => {
          (team.players || []).forEach(player => {
            let playerId = null;
            if (player.player) {
              if (typeof player.player === 'string') {
                playerId = player.player;
              } else if (player.player._id) {
                playerId = player.player._id;
              } else if (player.player.id) {
                playerId = player.player.id;
              }
            }
            
            allPlayers.push({
              ...player,
              playerId: playerId,
              teamName: team.name,
              teamId: team._id,
              teamCaptain: team.captain,
              isGuest: !playerId,
              skillLevel: playerId ? null : 'guest'
            });
            
            if (playerId && !playerDetailsMap[playerId]) {
              userIdsToFetch.push(playerId);
            }
          });
        });
        
        const detailsMap = { ...playerDetailsMap };
        for (const playerId of userIdsToFetch) {
          try {
            const response = await api.getUserById(playerId);
            if (response && response.user) {
              const userDetails = response.user;
              detailsMap[playerId] = {
                email: userDetails.email,
                phone: userDetails.profile?.phone,
                skillLevel: userDetails.profile?.skillLevel || 'beginner',
                fullName: userDetails.profile?.fullName || userDetails.username,
                preferredPosition: userDetails.profile?.preferredPosition,
                favoriteTeam: userDetails.profile?.favoriteTeam,
                location: userDetails.profile?.location,
                username: userDetails.username
              };
            }
          } catch (err) {
            console.log('Could not fetch user details for player:', playerId);
          }
        }
        setPlayerDetailsMap(detailsMap);
        
        allPlayers.forEach(player => {
          if (player.playerId && detailsMap[player.playerId]) {
            player.userDetails = detailsMap[player.playerId];
            player.email = detailsMap[player.playerId].email;
            player.phone = detailsMap[player.playerId].phone;
            player.skillLevel = detailsMap[player.playerId].skillLevel;
            player.fullName = detailsMap[player.playerId].fullName;
            player.preferredPosition = detailsMap[player.playerId].preferredPosition;
            player.favoriteTeam = detailsMap[player.playerId].favoriteTeam;
            player.location = detailsMap[player.playerId].location;
          }
        });
        
        setPlayers(allPlayers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching manager players:', error);
        setLoading(false);
      }
    };
    
    fetchManagerPlayers();
  }, [navigate]);

  const getTeamCaptainDetails = async (teamId) => {
    const team = teams.find(t => t._id === teamId);
    if (team && team.captain) {
      let captainId = team.captain;
      if (typeof captainId === 'object') {
        captainId = captainId._id || captainId.id;
      }
      try {
        const captainDetails = await api.getUserById(captainId);
        return captainDetails.user;
      } catch (err) {
        return null;
      }
    }
    return null;
  };

  const getSkillLevelBadge = (player) => {
    if (player.isGuest) {
      return <span className="skill-badge guest">Guest Player</span>;
    }
    
    const colors = {
      beginner: { bg: '#eff6ff', color: '#3b82f6', label: 'Beginner' },
      intermediate: { bg: '#fefce8', color: '#eab308', label: 'Intermediate' },
      advanced: { bg: '#fef2f2', color: '#ef4444', label: 'Advanced' },
      professional: { bg: '#f3e8ff', color: '#a855f7', label: 'Professional' }
    };
    const style = colors[player.skillLevel] || colors.beginner;
    return (
      <span className="skill-badge" style={{ background: style.bg, color: style.color }}>
        {style.label}
      </span>
    );
  };

  const handleViewProfile = async (player) => {
    setSelectedPlayer(player);
    setSelectedPlayerTeam(null);
    
    if (player.isGuest && player.teamId) {
      const captain = await getTeamCaptainDetails(player.teamId);
      setSelectedPlayerTeam(captain);
    }
    
    setShowPlayerModal(true);
  };

  const filteredPlayers = players.filter(player =>
    (player.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.teamName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPlayers = players.length;
  const totalGoals = players.reduce((sum, p) => sum + (p.goals || 0), 0);
  const totalMatches = players.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Players...</p>
      </div>
    );
  }

  return (
    <Layout activePage="managerPlayers">
      <div className="manager-players-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Players Management</h1>
            <p className="page-subtitle">View all players and their statistics</p>
          </div>
        </div>

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
                <h3>{totalPlayers}</h3>
                <p>Total Players</p>
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
                <h3>{totalMatches}</h3>
                <p>Total Matches</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{totalGoals}</h3>
                <p>Total Goals</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{teams.length}</h3>
                <p>Total Teams</p>
              </div>
            </div>
          </div>
        </div>

        <div className="search-section">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search players by name, position, or team"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="players-table-container">
          <table className="players-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Position</th>
                <th>Skill Level</th>
                <th>Matches</th>
                <th>Goals</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length > 0 ? filteredPlayers.map((player, index) => (
                <tr key={player._id || player.id || index}>
                  <td>
                    <div className="player-cell">
                      <div className="player-avatar">
                        {(player.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="player-info-cell">
                        <div className="player-name">{player.name || 'Unknown'}</div>
                        <div className="player-team">{player.teamName || 'No Team'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="player-position">{player.position || 'N/A'}</td>
                  <td>{getSkillLevelBadge(player)}</td>
                  <td className="stat-number">{player.matchesPlayed || 0}</td>
                  <td className="stat-number">{player.goals || 0}</td>
                  <td className="action-cell">
                    <button className="view-profile-btn" onClick={() => handleViewProfile(player)}>
                      View Profile
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="no-data">
                    <div className="empty-state-table">
                      <p>{searchTerm ? `No players found matching "${searchTerm}"` : 'No players found yet.'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Profile Modal */}
      {showPlayerModal && selectedPlayer && (
        <div className="modal-overlay" onClick={() => setShowPlayerModal(false)}>
          <div className="player-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Player Profile</h3>
              <button className="close-modal" onClick={() => setShowPlayerModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="player-profile-header">
                <div className="player-profile-avatar">
                  {(selectedPlayer.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="player-profile-info">
                  <h2>{selectedPlayer.name || 'Unknown Player'}</h2>
                  <div className="player-badges">
                    {selectedPlayer.isGuest ? (
                      <span className="guest-badge">Guest Player</span>
                    ) : (
                      getSkillLevelBadge(selectedPlayer)
                    )}
                    <span className="position-badge">{selectedPlayer.position || 'N/A'}</span>
                    <span className="team-badge">{selectedPlayer.teamName || 'No Team'}</span>
                  </div>
                </div>
              </div>

              <div className="stats-section-modal">
                <h4>Performance Stats</h4>
                <div className="stats-grid-modal">
                  <div className="stat-card-modal">
                    <div className="stat-value-modal">{selectedPlayer.matchesPlayed || 0}</div>
                    <div className="stat-label-modal">Matches Played</div>
                  </div>
                  <div className="stat-card-modal">
                    <div className="stat-value-modal">{selectedPlayer.goals || 0}</div>
                    <div className="stat-label-modal">Goals</div>
                  </div>
                  <div className="stat-card-modal">
                    <div className="stat-value-modal">{selectedPlayer.assists || 0}</div>
                    <div className="stat-label-modal">Assists</div>
                  </div>
                  <div className="stat-card-modal">
                    <div className="stat-value-modal">
                      {selectedPlayer.matchesPlayed > 0 
                        ? ((selectedPlayer.goals / selectedPlayer.matchesPlayed).toFixed(1)) 
                        : 0}
                    </div>
                    <div className="stat-label-modal">Goals per Match</div>
                  </div>
                </div>
              </div>

              <div className="details-section-modal">
                <h4>Player Information</h4>
                <div className="details-grid-modal">
                  <div className="detail-item-modal">
                    <span className="detail-label-modal">Jersey Number</span>
                    <span className="detail-value-modal">#{selectedPlayer.jerseyNumber || 'N/A'}</span>
                  </div>
                  
                  {!selectedPlayer.isGuest && selectedPlayer.userDetails ? (
                    <>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Full Name</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.fullName || selectedPlayer.name || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Username</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.username || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Email</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.email || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Phone</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.phone || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Skill Level</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.skillLevel ? selectedPlayer.userDetails.skillLevel.charAt(0).toUpperCase() + selectedPlayer.userDetails.skillLevel.slice(1) : 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Preferred Position</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.preferredPosition || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Favorite Team</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.favoriteTeam || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Location</span>
                        <span className="detail-value-modal">{selectedPlayer.userDetails.location || 'N/A'}</span>
                      </div>
                    </>
                  ) : selectedPlayer.isGuest && selectedPlayerTeam ? (
                    <>
                      <div className="detail-item-modal full-width">
                        <span className="detail-label-modal">Guest Player</span>
                        <span className="detail-value-modal">This player was added by the team captain</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Captain Name</span>
                        <span className="detail-value-modal">{selectedPlayerTeam.profile?.fullName || selectedPlayerTeam.username || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Captain Email</span>
                        <span className="detail-value-modal">{selectedPlayerTeam.email || 'N/A'}</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Captain Phone</span>
                        <span className="detail-value-modal">{selectedPlayerTeam.profile?.phone || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Email</span>
                        <span className="detail-value-modal">N/A</span>
                      </div>
                      <div className="detail-item-modal">
                        <span className="detail-label-modal">Phone</span>
                        <span className="detail-value-modal">N/A</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowPlayerModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerPlayers;