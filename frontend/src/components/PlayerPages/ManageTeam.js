import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManageTeam.css';

const ManageTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Join Requests State
  const [joinRequests, setJoinRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  
  // View Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Add Player Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    position: 'forward',
    jerseyNumber: '',
    isActive: true
  });
  const [isAdding, setIsAdding] = useState(false);

  const ALLOWED_POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward', 'striker'];

  useEffect(() => {
    const initPage = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }

        // 1. Get current user from API
        const userResponse = await api.getMe();
        const userData = userResponse.user || userResponse;
        setCurrentUser(userData);

        // 2. Get Team data
        const teamResponse = await api.getTeam(id);
        const teamData = teamResponse.team || teamResponse;
        setTeam(teamData);
        
        // 3. Set join requests from team data
        if (teamData.joinRequests && teamData.joinRequests.length > 0) {
          setJoinRequests(teamData.joinRequests);
        } else {
          setJoinRequests([]);
        }

      } catch (err) {
        console.error("Initialization error:", err);
        setError('Failed to load team management data');
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [id, navigate]);

  // Authorization Logic
  const isAuthorized = () => {
    if (!currentUser || !team) return false;
    if (currentUser.role === 'admin') return true;

    const userId = String(currentUser._id || currentUser.id || "").trim();
    const captainId = String(team.captain?._id || team.captain?.id || team.captain || "").trim();

    return userId && captainId && userId === captainId;
  };

  // Check if a player is the captain
  const isCaptain = (player) => {
    if (!team || !team.captain) return false;
    const captainId = String(team.captain?._id || team.captain?.id || team.captain || "");
    const playerId = String(player.player?._id || player.player?.id || player.player || "");
    return captainId && playerId && captainId === playerId;
  };

  // Handle View Profile
  const handleViewProfile = async (playerId, playerName) => {
    setViewingPlayer({ id: playerId, name: playerName });
    setShowProfileModal(true);
    setLoadingProfile(true);
    setPlayerProfile(null);
    
    try {
      const response = await api.getUserById(playerId);
      const userData = response.user || response;
      setPlayerProfile(userData);
    } catch (err) {
      console.error('Error fetching player profile:', err);
      setError('Failed to load player profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handle Approve Join Request
  const handleApproveRequest = async (requestId) => {
    if (!window.confirm('Approve this player to join the team?')) return;
    
    setProcessingRequestId(requestId);
    try {
      await api.approveJoinRequest(id, requestId);
      setSuccess('Player joined the team successfully!');
      
      // Refresh team data
      const teamResponse = await api.getTeam(id);
      const teamData = teamResponse.team || teamResponse;
      setTeam(teamData);
      setJoinRequests(teamData.joinRequests || []);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to approve request');
      setTimeout(() => setError(''), 3000);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Handle Reject Join Request
  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Reject this player\'s request to join?')) return;
    
    setProcessingRequestId(requestId);
    try {
      await api.rejectJoinRequest(id, requestId);
      setSuccess('Join request rejected');
      
      // Refresh team data
      const teamResponse = await api.getTeam(id);
      const teamData = teamResponse.team || teamResponse;
      setTeam(teamData);
      setJoinRequests(teamData.joinRequests || []);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reject request');
      setTimeout(() => setError(''), 3000);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Handle Edit Player
  const handleEditClick = (index, player) => {
    setEditingIndex(index);
    setEditFormData({
      name: player.player?.fullName || player.name || '',
      position: player.position || 'forward',
      jerseyNumber: player.jerseyNumber || 0,
      isActive: player.isActive !== false
    });
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditFormData({});
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: field === 'jerseyNumber' ? Number(value) : value
    }));
  };

  const handleEditSave = async (index) => {
    try {
      setIsSaving(true);
      setError('');
      
      await api.updateTeamRoster(id, {
        playerIndex: index,
        ...editFormData
      });

      setSuccess('Player updated successfully!');
      setEditingIndex(null);
      
      const teamResponse = await api.getTeam(id);
      setTeam(teamResponse.team || teamResponse);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update player');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Remove Player
  const handleRemovePlayer = async (index) => {
    if (!window.confirm('Are you sure you want to remove this player from the roster?')) return;

    try {
      setError('');
      await api.removePlayer(id, index);
      setSuccess('Player removed');
      
      const teamResponse = await api.getTeam(id);
      setTeam(teamResponse.team || teamResponse);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to remove player');
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (index, currentStatus) => {
    try {
      await api.updateTeamRoster(id, {
        playerIndex: index,
        isActive: !currentStatus
      });
      const teamResponse = await api.getTeam(id);
      setTeam(teamResponse.team || teamResponse);
    } catch (err) {
      setError('Failed to update status');
    }
  };

  // Handle Add New Player
  const handleAddPlayer = async () => {
    if (!newPlayer.name.trim()) {
      setError('Player name is required');
      return;
    }

    if (!newPlayer.jerseyNumber) {
      setError('Jersey number is required');
      return;
    }

    // Check for duplicate jersey number
    const jerseyExists = team.players.some(p => p.jerseyNumber === Number(newPlayer.jerseyNumber));
    if (jerseyExists) {
      setError('Jersey number already exists. Please choose a different number.');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      // Create new player object
      const newPlayerData = {
        name: newPlayer.name,
        position: newPlayer.position.toLowerCase(),
        jerseyNumber: Number(newPlayer.jerseyNumber),
        isActive: newPlayer.isActive,
        player: null // Guest player
      };
      
      // Get current players and add new one
      const updatedPlayers = [...team.players, newPlayerData];
      
      // Update team using updateTeam
      await api.updateTeam(id, { players: updatedPlayers });
      
      setSuccess('Player added successfully!');
      setShowAddModal(false);
      setNewPlayer({ name: '', position: 'forward', jerseyNumber: '', isActive: true });
      
      // Fetch fresh team data to update the UI
      const freshTeamResponse = await api.getTeam(id);
      const freshTeamData = freshTeamResponse.team || freshTeamResponse;
      setTeam(freshTeamData);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add player error:', err);
      setError(err.message || 'Failed to add player');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async () => {
    if (!window.confirm('Delete this team and all roster data? This action cannot be undone.')) return;

    try {
      await api.deleteTeam(id);
      setSuccess('Team deleted. Redirecting...');
      setTimeout(() => navigate('/teams-list'), 2000);
    } catch (err) {
      setError('Failed to delete team');
    }
  };

  if (loading) {
    return (
      <Layout activePage="teams">
        <div className="loading-state">Loading Team Management...</div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout activePage="teams">
        <div className="error-state">Team not found.</div>
      </Layout>
    );
  }

  if (!isAuthorized()) {
    return (
      <Layout activePage="teams">
        <div className="unauthorized-card">
          <h2>Access Restricted</h2>
          <p>You are not the registered captain of <strong>{team.name || team.teamName}</strong>.</p>
          <button onClick={() => navigate('/teams-list')}>Return to Teams</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activePage="teams">
      <div className="manage-team-container">
        {/* Header */}
        <div className="manage-team-header">
          <div className="header-info">
            <span className="level-tag">{team.level || team.teamLevel}</span>
            <h1>{team.name || team.teamName}</h1>
            <p>{team.players?.length || 0} Members in Roster</p>
          </div>
          <div className="header-actions">
            <button className="add-player-btn" onClick={() => setShowAddModal(true)}>
              + Add Player
            </button>
            <button className="delete-btn-outline" onClick={handleDeleteTeam}>Delete Team</button>
            <button className="back-btn" onClick={() => navigate('/teams-list')}>Back</button>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="banner error">{error}</div>}
        {success && <div className="banner success">{success}</div>}

        {/* JOIN REQUESTS SECTION WITH VIEW PROFILE BUTTON */}
        {joinRequests.length > 0 && (
          <div className="join-requests-card">
            <div className="card-header">
              <h2>Pending Join Requests</h2>
              <p>Players requesting to join your team</p>
            </div>
            <div className="join-requests-list">
              {joinRequests.map((request) => (
                <div key={request._id} className="join-request-item">
                  <div className="request-info">
                    <div className="request-player">
                      <span className="player-name">
                        {request.player?.fullName || request.player?.username || 'Unknown Player'}
                      </span>
                      <span className="request-status pending">Pending</span>
                    </div>
                    {request.message && (
                      <div className="request-message">
                        <strong>Message:</strong> {request.message}
                      </div>
                    )}
                    <div className="request-date">
                      Requested: {new Date(request.requestedAt || request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="view-profile-btn"
                      onClick={() => handleViewProfile(request.player?._id || request.player?.id, request.player?.fullName || request.player?.username)}
                    >
                      View Profile
                    </button>
                    <button 
                      className="approve-request-btn"
                      onClick={() => handleApproveRequest(request._id)}
                      disabled={processingRequestId === request._id}
                    >
                      {processingRequestId === request._id ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className="reject-request-btn"
                      onClick={() => handleRejectRequest(request._id)}
                      disabled={processingRequestId === request._id}
                    >
                      {processingRequestId === request._id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roster Table */}
        <div className="roster-card">
          <div className="card-header">
            <h2>Team Roster</h2>
            <p>Click the edit button to modify player details. Captain badge shows team leader.</p>
          </div>

          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Jersey</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.players?.map((player, index) => {
                  const isTeamCaptain = isCaptain(player);
                  return (
                    <tr key={index} className={player.isActive === false ? 'row-inactive' : ''}>
                      {editingIndex === index ? (
                        <>
                          <td>
                            <input 
                              value={editFormData.name} 
                              onChange={e => handleEditChange('name', e.target.value)} 
                              className="table-input" 
                            />
                          </td>
                           <td>
                            <select 
                              value={editFormData.position} 
                              onChange={e => handleEditChange('position', e.target.value)} 
                              className="table-select"
                            >
                              {ALLOWED_POSITIONS.map(p => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                           <td>
                            <input 
                              type="number" 
                              value={editFormData.jerseyNumber} 
                              onChange={e => handleEditChange('jerseyNumber', e.target.value)} 
                              className="table-input small" 
                            />
                          </td>
                           <td>
                            <button 
                              className={`status-pill ${editFormData.isActive ? 'active' : 'inactive'}`}
                              onClick={() => handleEditChange('isActive', !editFormData.isActive)}
                            >
                              {editFormData.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="actions">
                            <button className="save-btn-small" onClick={() => handleEditSave(index)} disabled={isSaving}>
                              Save
                            </button>
                            <button className="cancel-btn-small" onClick={handleEditCancel}>
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                           <td>
                            <div className="player-cell">
                              <span className="p-name">{player.player?.fullName || player.name}</span>
                              {isTeamCaptain && <span className="badge-captain">Captain</span>}
                              {!player.player && !isTeamCaptain && <span className="badge-guest">Guest</span>}
                            </div>
                           </td>
                          <td className="capitalize">{player.position}</td>
                          <td><strong>#{player.jerseyNumber}</strong></td>
                          <td>
                            <button 
                              className={`status-pill ${player.isActive !== false ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleActive(index, player.isActive)}
                            >
                              {player.isActive !== false ? 'Active' : 'Inactive'}
                            </button>
                           </td>
                          <td className="actions">
                            <button className="edit-btn" onClick={() => handleEditClick(index, player)} title="Edit">
                              Edit
                            </button>
                            <button className="remove-btn" onClick={() => handleRemovePlayer(index)} title="Remove">
                              Remove
                            </button>
                           </td>
                        </>
                      )}
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Player Profile</h3>
              <button className="close-modal" onClick={() => setShowProfileModal(false)}>×</button>
            </div>
            <div className="modal-content">
              {loadingProfile ? (
                <div className="profile-loading">Loading player details...</div>
              ) : playerProfile ? (
                <div className="player-profile-details">
                  <div className="profile-avatar-large">
                    {playerProfile.username?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  <div className="profile-info-section">
                    <div className="profile-row">
                      <span className="profile-label">Full Name:</span>
                      <span className="profile-value">{playerProfile.profile?.fullName || playerProfile.username || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Username:</span>
                      <span className="profile-value">{playerProfile.username || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Email:</span>
                      <span className="profile-value">{playerProfile.email || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Phone:</span>
                      <span className="profile-value">{playerProfile.profile?.phone || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Location:</span>
                      <span className="profile-value">{playerProfile.profile?.location || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Skill Level:</span>
                      <span className="profile-value">{playerProfile.profile?.skillLevel || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Preferred Position:</span>
                      <span className="profile-value">{playerProfile.profile?.preferredPosition || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Favorite Team:</span>
                      <span className="profile-value">{playerProfile.profile?.favoriteTeam || 'Not set'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-label">Member Since:</span>
                      <span className="profile-value">{playerProfile.createdAt ? new Date(playerProfile.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="profile-error">Failed to load player profile</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-modal-btn" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Player</h3>
              <button className="close-modal" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Player Name *</label>
                <input
                  type="text"
                  placeholder="Enter player name"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                  className="modal-input"
                />
              </div>
              
              <div className="form-group">
                <label>Position</label>
                <select
                  value={newPlayer.position}
                  onChange={(e) => setNewPlayer({...newPlayer, position: e.target.value})}
                  className="modal-select"
                >
                  {ALLOWED_POSITIONS.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Jersey Number *</label>
                <input
                  type="number"
                  placeholder="Enter jersey number"
                  value={newPlayer.jerseyNumber}
                  onChange={(e) => setNewPlayer({...newPlayer, jerseyNumber: e.target.value})}
                  className="modal-input"
                  min="1"
                  max="99"
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPlayer.isActive}
                    onChange={(e) => setNewPlayer({...newPlayer, isActive: e.target.checked})}
                  />
                  Active Player
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-modal-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="confirm-modal-btn" onClick={handleAddPlayer} disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManageTeam;