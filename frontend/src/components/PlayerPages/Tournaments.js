import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken, apiFetch } from '../../services/api';
import Layout from '../Layout';
import './Tournaments.css';

const Tournaments = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registeringTournament, setRegisteringTournament] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Get user data
        const userResponse = await api.getMe();
        
        let userData = null;
        if (userResponse && userResponse.user) {
          userData = userResponse.user;
        } else if (userResponse && userResponse._id) {
          userData = userResponse;
        } else {
          userData = userResponse;
        }
        
        setUser(userData);
        
        // Fetch tournaments
        try {
          const response = await apiFetch('/tournaments');
          
          let allTournaments = [];
          if (response && response.success && response.tournaments) {
            allTournaments = response.tournaments;
          } else if (response && response.data) {
            allTournaments = response.data;
          } else if (Array.isArray(response)) {
            allTournaments = response;
          }
          
          setTournaments(allTournaments);
        } catch (e) {
          setTournaments([]);
        }
        
        // Fetch user teams
        try {
          let teamsData = null;
          
          try {
            teamsData = await api.getUserTeams();
          } catch (e) {
            try {
              teamsData = await apiFetch('/teams/user/teams');
            } catch (e2) {
              teamsData = { data: [] };
            }
          }
          
          let userTeamsList = [];
          if (teamsData && teamsData.data && Array.isArray(teamsData.data)) {
            userTeamsList = teamsData.data;
          } else if (teamsData && teamsData.teams && Array.isArray(teamsData.teams)) {
            userTeamsList = teamsData.teams;
          } else if (Array.isArray(teamsData)) {
            userTeamsList = teamsData;
          }
          
          setUserTeams(userTeamsList);
          
        } catch (e) {
          setUserTeams([]);
        }
        
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const canCreateTournament = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const getFilteredTournaments = () => {
    if (filter === 'all') return tournaments;
    return tournaments.filter(t => t.status === filter);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'registration_open': 
        return { class: 'status-upcoming', text: 'Registration Open' };
      case 'ongoing': 
        return { class: 'status-ongoing', text: 'Ongoing' };
      case 'completed': 
        return { class: 'status-completed', text: 'Completed' };
      default: 
        return { class: 'status-upcoming', text: status || 'Upcoming' };
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'knockout') return { class: 'type-knockout', text: 'Knockout' };
    return { class: 'type-league', text: 'League' };
  };

  const handleViewDetails = (tournament) => {
    setSelectedTournament(tournament);
    setShowDetailsModal(true);
  };

  const handleOpenRegistrationModal = (tournament) => {
    if (userTeams.length === 0) {
      alert('You don\'t have any teams! Please create a team first.');
      navigate('/create-team');
      return;
    }
    setRegisteringTournament(tournament);
    setSelectedTeam(null);
    setShowRegistrationModal(true);
  };

  const handleRegisterTeam = async () => {
    if (!selectedTeam) {
      alert('Please select a team to register');
      return;
    }
    
    setIsRegistering(true);
    try {
      const teamId = selectedTeam._id || selectedTeam.id;
      const tournamentId = registeringTournament._id || registeringTournament.id;
      
      const response = await apiFetch(`/tournaments/${tournamentId}/register`, {
        method: 'POST',
        body: JSON.stringify({ teamId })
      });
      
      if (response && response.success) {
        alert(`Team "${selectedTeam.name || selectedTeam.teamName}" successfully registered for ${registeringTournament.name}!`);
        
        const refreshedResponse = await apiFetch('/tournaments');
        if (refreshedResponse && refreshedResponse.success && refreshedResponse.tournaments) {
          setTournaments(refreshedResponse.tournaments);
        }
        
        setShowRegistrationModal(false);
        setRegisteringTournament(null);
        setSelectedTeam(null);
      } else {
        throw new Error(response?.message || 'Registration failed');
      }
    } catch (error) {
      alert(error.message || 'Failed to register team. Please try again.');
    }
    setIsRegistering(false);
  };

  const filteredTournaments = getFilteredTournaments();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading tournaments...</p>
      </div>
    );
  }

  return (
    <Layout activePage="tournaments">
      <div className="tournaments-page">
        <div className="tournaments-action-bar">
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All Tournaments ({tournaments.length})
            </button>
            <button className={`filter-tab ${filter === 'registration_open' ? 'active' : ''}`} onClick={() => setFilter('registration_open')}>
              Registration Open ({tournaments.filter(t => t.status === 'registration_open').length})
            </button>
            <button className={`filter-tab ${filter === 'ongoing' ? 'active' : ''}`} onClick={() => setFilter('ongoing')}>
              Ongoing ({tournaments.filter(t => t.status === 'ongoing').length})
            </button>
            <button className={`filter-tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
              Completed ({tournaments.filter(t => t.status === 'completed').length})
            </button>
          </div>
          
          {canCreateTournament() && (
            <button className="create-tournament-btn" onClick={() => navigate('/tournament-create')}>
              + Create Tournament
            </button>
          )}
        </div>

        <div className="tournaments-grid">
          {filteredTournaments.length > 0 ? (
            filteredTournaments.map(tournament => {
              const statusBadge = getStatusBadge(tournament.status);
              const typeBadge = getTypeBadge(tournament.format);
              const isTeamRegistered = tournament.registeredTeams?.some(registeredTeam => 
                userTeams.some(ut => {
                  const userTeamId = ut._id || ut.id;
                  const registeredTeamId = registeredTeam.team?._id || registeredTeam.team;
                  return userTeamId === registeredTeamId;
                })
              );
              
              const registeredCount = tournament.registeredTeams?.length || 0;
              
              return (
                <div key={tournament._id} className="tournament-card">
                  <div className="tournament-card-header">
                    <div className="tournament-type-badge">
                      <span className={typeBadge.class}>{typeBadge.text}</span>
                    </div>
                    <div className={`tournament-status-badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </div>
                  </div>
                  
                  <div className="tournament-card-content">
                    <h3 className="tournament-name">{tournament.name}</h3>
                    <p className="tournament-description">{tournament.description}</p>
                    
                    <div className="tournament-details-grid">
                      <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <div>
                          <div className="detail-label">Start Date</div>
                          <div className="detail-value">{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'}</div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">🏆</span>
                        <div>
                          <div className="detail-label">Prize Pool</div>
                          <div className="detail-value">Rs. {tournament.priceDistribution?.total || 0}</div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">👥</span>
                        <div>
                          <div className="detail-label">Teams</div>
                          <div className="detail-value">{registeredCount}/{tournament.maxTeams || 0}</div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">💰</span>
                        <div>
                          <div className="detail-label">Entry Fee</div>
                          <div className="detail-value">Rs. {tournament.entryFee || 0}</div>
                        </div>
                      </div>
                    </div>
                    
                    {tournament.registrationDeadline && (
                      <div className="detail-item" style={{ marginTop: '10px' }}>
                        <span className="detail-icon">⏰</span>
                        <div>
                          <div className="detail-label">Registration Deadline</div>
                          <div className="detail-value">{new Date(tournament.registrationDeadline).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="registration-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${tournament.maxTeams > 0 ? (registeredCount / tournament.maxTeams) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        {registeredCount} / {tournament.maxTeams || 0} teams registered
                      </div>
                    </div>
                  </div>
                  
                  <div className="tournament-card-footer">
                    <button className="view-details-btn" onClick={() => handleViewDetails(tournament)}>
                      View Details
                    </button>
                    {tournament.status === 'registration_open' && (
                      isTeamRegistered ? (
                        <button className="registered-badge" disabled>✓ Team Registered</button>
                      ) : (
                        <button className="register-btn" onClick={() => handleOpenRegistrationModal(tournament)}>
                          Register Team →
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <h3>No tournaments found</h3>
              <p>Check back later for upcoming tournaments!</p>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Details Modal */}
      {showDetailsModal && selectedTournament && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="tournament-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTournament.name}</h3>
              <button className="close-modal" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="tournament-info-section">
                <p className="tournament-modal-description">{selectedTournament.description}</p>
                <div className="info-grid">
                  <div><strong>Start Date:</strong> {selectedTournament.startDate ? new Date(selectedTournament.startDate).toLocaleDateString() : 'TBD'}</div>
                  <div><strong>End Date:</strong> {selectedTournament.endDate ? new Date(selectedTournament.endDate).toLocaleDateString() : 'TBD'}</div>
                  <div><strong>Registration Deadline:</strong> {selectedTournament.registrationDeadline ? new Date(selectedTournament.registrationDeadline).toLocaleDateString() : 'Not set'}</div>
                  <div><strong>Venue:</strong> {selectedTournament.venue || 'TBD'}</div>
                  <div><strong>Prize Pool:</strong> Rs. {selectedTournament.priceDistribution?.total || 0}</div>
                  <div><strong>Entry Fee:</strong> Rs. {selectedTournament.entryFee || 0}</div>
                  <div><strong>Format:</strong> {selectedTournament.format === 'knockout' ? 'Knockout' : 'League'}</div>
                  <div><strong>Max Teams:</strong> {selectedTournament.maxTeams || 0}</div>
                </div>
                {selectedTournament.rulesDescription && (
                  <div className="rules-section">
                    <h4>Rules & Regulations</h4>
                    <p>{selectedTournament.rulesDescription}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDetailsModal(false)}>Close</button>
              {selectedTournament.status === 'registration_open' && (
                <button className="confirm-btn" onClick={() => handleOpenRegistrationModal(selectedTournament)}>
                  Register Team
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Registration Modal */}
      {showRegistrationModal && registeringTournament && (
        <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
          <div className="tournament-modal registration-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register Team for {registeringTournament.name}</h3>
              <button className="close-modal" onClick={() => setShowRegistrationModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="registration-info">
                <div className="info-box">
                  <p><strong>Entry Fee:</strong> Rs. {registeringTournament.entryFee || 0}</p>
                  <p><strong>Registration Deadline:</strong> {registeringTournament.registrationDeadline ? new Date(registeringTournament.registrationDeadline).toLocaleDateString() : 'Not set'}</p>
                  <p><strong>Slots Available:</strong> {(registeringTournament.maxTeams || 0) - (registeringTournament.registeredTeams?.length || 0)} / {registeringTournament.maxTeams || 0}</p>
                </div>
              </div>
              
              <div className="team-selection">
                <h4>Select Your Team</h4>
                <div className="teams-list-select">
                  {userTeams.length > 0 ? userTeams.map(team => (
                    <div 
                      key={team._id || team.id} 
                      className={`team-select-item ${(selectedTeam?._id || selectedTeam?.id) === (team._id || team.id) ? 'selected' : ''}`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="team-select-avatar">
                        {(team.name || team.teamName || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div className="team-select-info">
                        <div className="team-select-name">{team.name || team.teamName || 'Unknown Team'}</div>
                        <div className="team-select-players">{team.players?.length || 0} players</div>
                      </div>
                      {(selectedTeam?._id || selectedTeam?.id) === (team._id || team.id) && (
                        <div className="check-mark">✓</div>
                      )}
                    </div>
                  )) : (
                    <div className="no-teams-message">
                      <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        No teams found. 
                        <button 
                          onClick={() => navigate('/create-team')} 
                          style={{ marginLeft: '10px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                        >
                          Create a team first
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowRegistrationModal(false)}>Cancel</button>
              <button 
                className="confirm-btn" 
                onClick={handleRegisterTeam}
                disabled={isRegistering || !selectedTeam || userTeams.length === 0}
              >
                {isRegistering ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Tournaments;