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
  
  // Edit Tournament State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    format: 'knockout',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    venue: '',
    entryFee: '',
    maxTeams: 8,
    priceDistribution: {
      first: 0,
      second: 0,
      third: 0,
      total: 0
    },
    rulesDescription: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
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

  const canEditTournament = (tournament) => {
    const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
    // Only show edit button if tournament is in registration_open status
    const isEditable = tournament?.status === 'registration_open';
    return isManagerOrAdmin && isEditable;
  };

  const shouldShowRegisterButton = () => {
    return user?.role === 'user';
  };

  const getFilteredTournaments = () => {
    if (filter === 'all') return tournaments;
    return tournaments.filter(t => t.status === filter);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'registration_open': 
        return { class: 'status-registration', text: 'Registration Open' };
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

  // Delete Tournament Handler
  const handleDeleteTournament = async (tournament) => {
    if (window.confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone.`)) {
      try {
        const response = await apiFetch(`/tournaments/${tournament._id}`, {
          method: 'DELETE'
        });
        
        if (response && response.success) {
          alert('Tournament deleted successfully!');
          // Refresh tournaments list
          const refreshedResponse = await apiFetch('/tournaments');
          if (refreshedResponse && refreshedResponse.success && refreshedResponse.tournaments) {
            setTournaments(refreshedResponse.tournaments);
          }
        } else {
          throw new Error(response?.message || 'Failed to delete tournament');
        }
      } catch (error) {
        console.error('Error deleting tournament:', error);
        alert(error.message || 'Failed to delete tournament');
      }
    }
  };

  // Edit Tournament Handlers
  const handleEditClick = (tournament) => {
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setEditingTournament(tournament);
    setEditFormData({
      name: tournament.name || '',
      description: tournament.description || '',
      format: tournament.format || 'knockout',
      startDate: formatDateForInput(tournament.startDate),
      endDate: formatDateForInput(tournament.endDate),
      registrationDeadline: formatDateForInput(tournament.registrationDeadline),
      venue: tournament.venue?.address || tournament.venue || '',
      entryFee: tournament.entryFee || 0,
      maxTeams: tournament.maxTeams || 8,
      priceDistribution: {
        first: tournament.priceDistribution?.first || 0,
        second: tournament.priceDistribution?.second || 0,
        third: tournament.priceDistribution?.third || 0,
        total: tournament.priceDistribution?.total || 0
      },
      rulesDescription: tournament.rulesDescription || ''
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditPriceChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 0;
    
    setEditFormData(prev => {
      const newDistribution = {
        ...prev.priceDistribution,
        [name]: numValue
      };
      newDistribution.total = newDistribution.first + newDistribution.second + newDistribution.third;
      
      return {
        ...prev,
        priceDistribution: newDistribution
      };
    });
  };

  const handleUpdateTournament = async (e) => {
    e.preventDefault();
    
    if (!editFormData.name || !editFormData.startDate || !editFormData.endDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const tournamentData = {
        name: editFormData.name,
        description: editFormData.description || 'No description provided',
        venue: {
          address: editFormData.venue || 'FutsalPro Arena',
          city: 'Kathmandu'
        },
        startDate: new Date(editFormData.startDate),
        endDate: new Date(editFormData.endDate),
        registrationDeadline: editFormData.registrationDeadline ? new Date(editFormData.registrationDeadline) : new Date(editFormData.startDate),
        format: editFormData.format,
        maxTeams: parseInt(editFormData.maxTeams),
        entryFee: parseInt(editFormData.entryFee) || 0,
        priceDistribution: {
          first: editFormData.priceDistribution.first,
          second: editFormData.priceDistribution.second,
          third: editFormData.priceDistribution.third,
          total: editFormData.priceDistribution.total
        },
        rulesDescription: editFormData.rulesDescription || 'Standard tournament rules apply.'
      };
      
      const response = await apiFetch(`/tournaments/${editingTournament._id}`, {
        method: 'PUT',
        body: JSON.stringify(tournamentData)
      });
      
      if (response && response.success) {
        alert('Tournament updated successfully!');
        setShowEditModal(false);
        
        const refreshedResponse = await apiFetch('/tournaments');
        if (refreshedResponse && refreshedResponse.success && refreshedResponse.tournaments) {
          setTournaments(refreshedResponse.tournaments);
        }
      } else {
        throw new Error(response?.message || 'Failed to update tournament');
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      alert(error.message || 'Failed to update tournament. Please try again.');
    }
    
    setIsUpdating(false);
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
        <div className="page-header">
          <h1 className="page-title">Tournaments</h1>
          <p className="page-subtitle">Discover and join competitive futsal tournaments</p>
        </div>

        <div className="tournaments-action-bar">
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All ({tournaments.length})
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
              const showEditButton = canEditTournament(tournament);
              
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
                        <div className="detail-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </div>
                        <div>
                          <div className="detail-label">Start Date</div>
                          <div className="detail-value">{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'}</div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <div className="detail-label">Prize Pool</div>
                          <div className="detail-value">Rs. {tournament.priceDistribution?.total || 0}</div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                            <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          </svg>
                        </div>
                        <div>
                          <div className="detail-label">Teams</div>
                          <div className="detail-value">{registeredCount}/{tournament.maxTeams || 0}</div>
                        </div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div>
                          <div className="detail-label">Entry Fee</div>
                          <div className="detail-value">Rs. {tournament.entryFee || 0}</div>
                        </div>
                      </div>
                    </div>
                    
                    {tournament.registrationDeadline && (
                      <div className="detail-item deadline-item">
                        <div className="detail-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
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
                    
                    {showEditButton && (
                      <button className="edit-tournament-btn" onClick={() => handleEditClick(tournament)}>
                        Edit Tournament
                      </button>
                    )}
                    
                    {/* Delete Button for Managers/Admins */}
                    {canEditTournament(tournament) && (
                      <button className="delete-tournament-btn" onClick={() => handleDeleteTournament(tournament)}>
                        Delete
                      </button>
                    )}
                    
                    {tournament.status === 'registration_open' && shouldShowRegisterButton() && (
                      isTeamRegistered ? (
                        <button className="registered-badge" disabled>Team Registered</button>
                      ) : (
                        <button className="register-btn" onClick={() => handleOpenRegistrationModal(tournament)}>
                          Register Team
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <h3>No tournaments found</h3>
              <p>Check back later for upcoming tournaments!</p>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Details Modal - Improved UI */}
      {showDetailsModal && selectedTournament && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="tournament-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tournament Details</h3>
              <button className="close-modal" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="modal-content">
              {/* Tournament Name Section */}
              <div className="tournament-detail-header">
                <div className="tournament-detail-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <div className="tournament-detail-title">
                  <h2>{selectedTournament.name}</h2>
                  <p>{selectedTournament.description}</p>
                </div>
              </div>

              {/* Info Cards Grid */}
              <div className="detail-info-cards">
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Start Date</span>
                    <span className="info-card-value">{selectedTournament.startDate ? new Date(selectedTournament.startDate).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">End Date</span>
                    <span className="info-card-value">{selectedTournament.endDate ? new Date(selectedTournament.endDate).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Registration Deadline</span>
                    <span className="info-card-value">{selectedTournament.registrationDeadline ? new Date(selectedTournament.registrationDeadline).toLocaleDateString() : 'Not set'}</span>
                  </div>
                </div>
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Venue</span>
                    <span className="info-card-value">{selectedTournament.venue?.address || selectedTournament.venue || 'TBD'}</span>
                  </div>
                </div>
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Entry Fee</span>
                    <span className="info-card-value">Rs. {selectedTournament.entryFee || 0}</span>
                  </div>
                </div>
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Max Teams</span>
                    <span className="info-card-value">{selectedTournament.maxTeams || 0}</span>
                  </div>
                </div>
                <div className="detail-info-card">
                  <div className="info-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Format</span>
                    <span className="info-card-value">{selectedTournament.format === 'knockout' ? 'Knockout' : 'League'}</span>
                  </div>
                </div>
              </div>

              {/* Prize Distribution Section */}
              <div className="detail-prize-section">
                <h4>Prize Distribution</h4>
                <div className="prize-distribution-cards">
                  <div className="prize-card first">
                    <div className="prize-medal">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" fill="#fef3c7"/>
                      </svg>
                    </div>
                    <div className="prize-info">
                      <span className="prize-rank">1st Place</span>
                      <span className="prize-amount">Rs. {selectedTournament.priceDistribution?.first || 0}</span>
                    </div>
                  </div>
                  <div className="prize-card second">
                    <div className="prize-medal">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" fill="#f1f5f9"/>
                      </svg>
                    </div>
                    <div className="prize-info">
                      <span className="prize-rank">2nd Place</span>
                      <span className="prize-amount">Rs. {selectedTournament.priceDistribution?.second || 0}</span>
                    </div>
                  </div>
                  <div className="prize-card third">
                    <div className="prize-medal">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round" fill="#ffedd5"/>
                      </svg>
                    </div>
                    <div className="prize-info">
                      <span className="prize-rank">3rd Place</span>
                      <span className="prize-amount">Rs. {selectedTournament.priceDistribution?.third || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="total-prize-card">
                  <span>Total Prize Pool</span>
                  <strong>Rs. {selectedTournament.priceDistribution?.total || 0}</strong>
                </div>
              </div>

              {/* Rules Section */}
              {selectedTournament.rulesDescription && (
                <div className="detail-rules-section">
                  <h4>Rules & Regulations</h4>
                  <p>{selectedTournament.rulesDescription}</p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDetailsModal(false)}>Close</button>
              {selectedTournament.status === 'registration_open' && shouldShowRegisterButton() && (
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
                      <p>No teams found.</p>
                      <button onClick={() => navigate('/create-team')}>Create a team first</button>
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

      {/* Edit Tournament Modal */}
      {showEditModal && editingTournament && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-tournament-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Tournament</h3>
              <button className="close-modal" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleUpdateTournament}>
                <div className="form-section">
                  <h4>Basic Information</h4>
                  <div className="form-group">
                    <label>Tournament Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditChange}
                      rows="3"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Format</label>
                      <select name="format" value={editFormData.format} onChange={handleEditChange}>
                        <option value="knockout">Knockout</option>
                        <option value="league">League</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Max Teams</label>
                      <select name="maxTeams" value={editFormData.maxTeams} onChange={handleEditChange}>
                        <option value={4}>4 Teams</option>
                        <option value={8}>8 Teams</option>
                        <option value={16}>16 Teams</option>
                        <option value={32}>32 Teams</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Schedule & Venue</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date <span className="required">*</span></label>
                      <input
                        type="date"
                        name="startDate"
                        value={editFormData.startDate}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date <span className="required">*</span></label>
                      <input
                        type="date"
                        name="endDate"
                        value={editFormData.endDate}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Registration Deadline</label>
                    <input
                      type="date"
                      name="registrationDeadline"
                      value={editFormData.registrationDeadline}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue / Location</label>
                    <input
                      type="text"
                      name="venue"
                      value={editFormData.venue}
                      onChange={handleEditChange}
                      placeholder="e.g., FutsalPro Arena, Kathmandu"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Prizes & Fees</h4>
                  <div className="form-group">
                    <label>Entry Fee (Rs.)</label>
                    <input
                      type="number"
                      name="entryFee"
                      value={editFormData.entryFee}
                      onChange={handleEditChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Prize Distribution (Rs.)</label>
                    <div className="prize-grid">
                      <div className="prize-input">
                        <label>1st Place</label>
                        <input
                          type="number"
                          name="first"
                          value={editFormData.priceDistribution.first}
                          onChange={handleEditPriceChange}
                          min="0"
                        />
                      </div>
                      <div className="prize-input">
                        <label>2nd Place</label>
                        <input
                          type="number"
                          name="second"
                          value={editFormData.priceDistribution.second}
                          onChange={handleEditPriceChange}
                          min="0"
                        />
                      </div>
                      <div className="prize-input">
                        <label>3rd Place</label>
                        <input
                          type="number"
                          name="third"
                          value={editFormData.priceDistribution.third}
                          onChange={handleEditPriceChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="total-prize">
                      Total Prize Pool: <strong>Rs. {editFormData.priceDistribution.total.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Rules & Regulations</h4>
                  <div className="form-group">
                    <textarea
                      name="rulesDescription"
                      value={editFormData.rulesDescription}
                      onChange={handleEditChange}
                      rows="4"
                      placeholder="Enter tournament rules, match format, player eligibility, etc..."
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={isUpdating}>
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Tournaments;