import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken, apiFetch } from '../../services/api';
import Layout from '../Layout';
import './Matches.css';

const Matches = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('all');
  const [filter, setFilter] = useState('all');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDataLoaded, setStatsDataLoaded] = useState(false);
  
  // Team players data
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  
  // Create match form data
  const [createMatchData, setCreateMatchData] = useState({
    tournament: '',
    teamA: '',
    teamB: '',
    court: '',
    scheduledDate: '',
    startTime: '',
    endTime: '',
    round: ''
  });
  
  // Available teams for selected tournament
  const [availableTeams, setAvailableTeams] = useState([]);
  const [courts, setCourts] = useState([]);

  // Result form data
  const [resultData, setResultData] = useState({
    teamAScore: 0,
    teamBScore: 0,
    teamAFormation: '',
    teamBFormation: '',
    resultType: 'regular_time',
    penaltyDetails: { teamAPenalty: 0, teamBPenalty: 0 },
    goalScorers: [],
    cards: [],
    manOfTheMatch: ''
  });

  // Helper function to get player ID from object or string
  const getPlayerId = (player) => {
    if (!player) return '';
    if (typeof player === 'string') return player;
    if (typeof player === 'object') {
      if (player._id) return player._id;
      if (player.id) return player.id;
      if (player.player) {
        if (typeof player.player === 'string') return player.player;
        if (typeof player.player === 'object') return player.player._id || player.player.id;
      }
      return '';
    }
    return '';
  };

  // Helper function to get player name from player object or ID
  const getPlayerName = (player, teamAList = teamAPlayers, teamBList = teamBPlayers) => {
    if (!player) return 'Unknown';
    
    // If player is already an object with name
    if (typeof player === 'object') {
      if (player.fullName) return player.fullName;
      if (player.username) return player.username;
      if (player.name) return player.name;
      return player._id || 'Unknown';
    }
    
    // If it's a string (player ID)
    if (typeof player === 'string') {
      const allList = [...teamAList, ...teamBList];
      const found = allList.find(p => p.playerId === player || p._id === player || p.player === player);
      if (found?.name) return found.name;
      return player;
    }
    
    return 'Unknown';
  };

  const getLocationString = (location) => {
    if (!location) return '';
    if (typeof location === 'object') return location.address || location.city || '';
    return location;
  };

  const getVenueDisplay = (court) => {
    if (!court) return 'Venue TBD';
    if (typeof court === 'object') {
      return court.name || court.location?.address || 'Venue TBD';
    }
    return court;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        const userResponse = await api.getMe();
        const userData = userResponse.user || userResponse;
        setUser(userData);
        
        const matchesData = await api.getMatches();
        setMatches(matchesData.data || matchesData.matches || []);
        
        const tournamentsData = await api.getTournaments();
        const tournamentsList = tournamentsData.data || tournamentsData.tournaments || [];
        setTournaments(tournamentsList);
        
        try {
          const courtsData = await api.getCourts();
          const courtsList = courtsData.data || courtsData.courts || [];
          setCourts(courtsList);
        } catch (e) {
          setCourts([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/login');
      }
    };
    
    fetchData();
  }, [navigate]);

  // Fetch player data when stats modal opens
  useEffect(() => {
    if (showStatsModal && selectedMatch && !statsDataLoaded) {
      const fetchPlayerDataForStats = async () => {
        setStatsLoading(true);
        try {
          const teamAId = selectedMatch.teamA?._id || selectedMatch.teamA;
          const teamBId = selectedMatch.teamB?._id || selectedMatch.teamB;
          
          const [teamAData, teamBData] = await Promise.all([
            apiFetch(`/teams/${teamAId}`),
            apiFetch(`/teams/${teamBId}`)
          ]);
          
          const teamAPlayersList = (teamAData.team?.players || teamAData.data?.players || []).map(p => ({
            ...p,
            playerId: p.player?._id || (typeof p.player === 'string' ? p.player : p._id),
            name: p.name,
            position: p.position || 'Player'
          }));
          
          const teamBPlayersList = (teamBData.team?.players || teamBData.data?.players || []).map(p => ({
            ...p,
            playerId: p.player?._id || (typeof p.player === 'string' ? p.player : p._id),
            name: p.name,
            position: p.position || 'Player'
          }));
          
          setTeamAPlayers(teamAPlayersList);
          setTeamBPlayers(teamBPlayersList);
          setAllPlayers([...teamAPlayersList, ...teamBPlayersList]);
          setStatsDataLoaded(true);
        } catch (error) {
          console.error('Error fetching player data for stats:', error);
        } finally {
          setStatsLoading(false);
        }
      };
      
      fetchPlayerDataForStats();
    }
  }, [showStatsModal, selectedMatch, statsDataLoaded]);

  const canEditResults = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const getFilteredMatches = () => {
    let filtered = matches;
    
    if (selectedTournament !== 'all') {
      filtered = filtered.filter(m => String(m.tournament?._id || m.tournamentId) === String(selectedTournament));
    }
    
    if (filter === 'upcoming') {
      filtered = filtered.filter(m => m.status === 'scheduled' || m.status === 'upcoming');
    } else if (filter === 'completed') {
      filtered = filtered.filter(m => m.status === 'completed');
    }
    
    return filtered;
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return { class: 'status-completed', text: 'Completed' };
    }
    return { class: 'status-upcoming', text: 'Upcoming' };
  };

const handleViewStats = async (match) => {
  // Fetch fresh match data with populated names
  try {
    const matchId = match._id || match.id;
    const response = await apiFetch(`/matches/${matchId}`);
    const freshMatch = response.match || response.data;
    setSelectedMatch(freshMatch);
    setShowStatsModal(true);
  } catch (error) {
    console.error('Error fetching match details:', error);
    setSelectedMatch(match);
    setShowStatsModal(true);
  }
};

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return;
    
    try {
      const response = await apiFetch(`/matches/${matchToDelete._id || matchToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response && response.success) {
        alert('Match deleted successfully!');
        setShowDeleteConfirm(false);
        setMatchToDelete(null);
        
        const matchesData = await api.getMatches();
        setMatches(matchesData.data || matchesData.matches || []);
      } else {
        throw new Error(response?.message || 'Failed to delete match');
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert(error.message || 'Failed to delete match');
    }
  };

  const handleTournamentChange = async (tournamentId) => {
    setCreateMatchData(prev => ({ ...prev, tournament: tournamentId, teamA: '', teamB: '' }));
    
    if (tournamentId) {
      try {
        const tournamentData = await apiFetch(`/tournaments/${tournamentId}`);
        const tournament = tournamentData.tournament || tournamentData.data;
        const registeredTeams = tournament?.registeredTeams || [];
        
        const validTeamPromises = registeredTeams
          .filter(rt => rt.team !== null && rt.team !== undefined)
          .map(async (rt) => {
            const teamId = rt.team?._id || rt.team;
            if (!teamId) return null;
            try {
              const teamData = await apiFetch(`/teams/${teamId}`);
              return teamData.team || teamData.data;
            } catch (err) {
              console.error('Error fetching team:', teamId, err);
              return null;
            }
          });
        
        const teams = await Promise.all(validTeamPromises);
        setAvailableTeams(teams.filter(t => t !== null && t !== undefined));
      } catch (error) {
        console.error('Error fetching tournament teams:', error);
        setAvailableTeams([]);
      }
    } else {
      setAvailableTeams([]);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    
    if (!createMatchData.tournament || !createMatchData.teamA || !createMatchData.teamB || !createMatchData.scheduledDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (createMatchData.teamA === createMatchData.teamB) {
      alert('Team A and Team B cannot be the same');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const payload = {
        tournament: createMatchData.tournament,
        teamA: createMatchData.teamA,
        teamB: createMatchData.teamB,
        court: createMatchData.court || null,
        scheduledDate: new Date(createMatchData.scheduledDate),
        startTime: createMatchData.startTime,
        endTime: createMatchData.endTime,
        round: createMatchData.round || 'Group Stage'
      };
      
      const response = await apiFetch('/matches', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response && response.success) {
        alert('Match created successfully!');
        setShowCreateModal(false);
        setCreateMatchData({
          tournament: '',
          teamA: '',
          teamB: '',
          court: '',
          scheduledDate: '',
          startTime: '',
          endTime: '',
          round: ''
        });
        
        const matchesData = await api.getMatches();
        setMatches(matchesData.data || matchesData.matches || []);
      } else {
        throw new Error(response?.message || 'Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert(error.message || 'Failed to create match');
    }
    
    setIsCreating(false);
  };

  const handleEnterResult = async (match) => {
    setSelectedMatch(match);
    setResultData({
      teamAScore: match.teamAScore || 0,
      teamBScore: match.teamBScore || 0,
      teamAFormation: match.teamAFormation || '',
      teamBFormation: match.teamBFormation || '',
      resultType: match.resultType || 'regular_time',
      penaltyDetails: match.penaltyDetails || { teamAPenalty: 0, teamBPenalty: 0 },
      goalScorers: match.goalScorers || [],
      cards: match.cards || [],
      manOfTheMatch: getPlayerId(match.manOfTheMatch) || ''
    });
    
    try {
      const teamAId = match.teamA?._id || match.teamA;
      const teamBId = match.teamB?._id || match.teamB;
      
      const [teamAData, teamBData] = await Promise.all([
        apiFetch(`/teams/${teamAId}`),
        apiFetch(`/teams/${teamBId}`)
      ]);
      
      // Prioritize p.player._id (User ID) over p._id (team entry ID)
      const teamAPlayersList = (teamAData.team?.players || teamAData.data?.players || []).map(p => ({
        ...p,
        playerId: p.player?._id || (typeof p.player === 'string' ? p.player : p._id),
        name: p.name,
        position: p.position || 'Player'
      }));
      
      const teamBPlayersList = (teamBData.team?.players || teamBData.data?.players || []).map(p => ({
        ...p,
        playerId: p.player?._id || (typeof p.player === 'string' ? p.player : p._id),
        name: p.name,
        position: p.position || 'Player'
      }));
      
      setTeamAPlayers(teamAPlayersList);
      setTeamBPlayers(teamBPlayersList);
      setAllPlayers([...teamAPlayersList, ...teamBPlayersList]);
    } catch (error) {
      console.error('Error fetching team players:', error);
    }
    
    setShowResultModal(true);
  };

  const addGoal = () => {
    setResultData(prev => ({
      ...prev,
      goalScorers: [...prev.goalScorers, { player: '', minute: '', assistBy: '', team: '' }]
    }));
  };

  const updateGoal = (index, field, value) => {
    const updated = [...resultData.goalScorers];
    
    if (field === 'player') {
      updated[index].player = value;
      const isTeamA = teamAPlayers.some(p => p.playerId === value);
      updated[index].team = isTeamA ? 'teamA' : 'teamB';
    } else if (field === 'assistBy') {
      updated[index].assistBy = value;
    } else {
      updated[index][field] = value;
    }
    
    setResultData(prev => ({ ...prev, goalScorers: updated }));
  };

  const removeGoal = (index) => {
    setResultData(prev => ({
      ...prev,
      goalScorers: prev.goalScorers.filter((_, i) => i !== index)
    }));
  };

  const addCard = () => {
    setResultData(prev => ({
      ...prev,
      cards: [...prev.cards, { player: '', cardType: 'yellow', minute: '', team: '', reason: '' }]
    }));
  };

  const updateCard = (index, field, value) => {
    const updated = [...resultData.cards];
    
    if (field === 'player') {
      updated[index].player = value;
      const isTeamA = teamAPlayers.some(p => p.playerId === value);
      updated[index].team = isTeamA ? 'teamA' : 'teamB';
    } else {
      updated[index][field] = value;
    }
    
    setResultData(prev => ({ ...prev, cards: updated }));
  };

  const removeCard = (index) => {
    setResultData(prev => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitResult = async () => {
    setIsSubmitting(true);
    
    try {
      const matchId = selectedMatch._id || selectedMatch.id;
      
      const payload = {
        teamAScore: parseInt(resultData.teamAScore) || 0,
        teamBScore: parseInt(resultData.teamBScore) || 0,
        teamAFormation: resultData.teamAFormation,
        teamBFormation: resultData.teamBFormation,
        resultType: resultData.resultType,
        penaltyDetails: resultData.penaltyDetails,
        goalScorers: resultData.goalScorers
          .filter(g => g.player && g.player !== '')
          .map(g => ({
            player: g.player,
            minute: parseInt(g.minute) || 0,
            assistBy: g.assistBy || null,
            team: g.team
          })),
        cards: resultData.cards
          .filter(c => c.player && c.player !== '')
          .map(c => ({
            player: c.player,
            cardType: c.cardType,
            minute: parseInt(c.minute) || 0,
            team: c.team,
            reason: c.reason || ''
          })),
        manOfTheMatch: resultData.manOfTheMatch || null
      };
      
      const response = await apiFetch(`/matches/${matchId}/result`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      if (response && response.success) {
        alert('Match result updated successfully!');
        setShowResultModal(false);
        
        const matchesData = await api.getMatches();
        setMatches(matchesData.data || matchesData.matches || []);
      } else {
        throw new Error(response?.message || 'Failed to update match result');
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      alert(error.message || 'Failed to update match result');
    }
    
    setIsSubmitting(false);
  };

  const filteredMatches = getFilteredMatches();
  const canCreateMatches = canEditResults();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading matches...</p>
      </div>
    );
  }

  return (
    <Layout activePage="matches">
      <div className="matches-page">
        <div className="filters-bar">
          <div className="filter-group">
            <label>Tournament:</label>
            <select 
              value={selectedTournament} 
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="tournament-filter"
            >
              <option value="all">All Tournaments</option>
              {tournaments.map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <div className="status-filters">
              <button 
                className={`status-filter ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`status-filter ${filter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setFilter('upcoming')}
              >
                Upcoming
              </button>
              <button 
                className={`status-filter ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
            </div>
          </div>
          
          {canCreateMatches && (
            <button className="create-match-btn" onClick={() => setShowCreateModal(true)}>
              + Create Match
            </button>
          )}
        </div>

        <div className="matches-grid">
          {filteredMatches.length > 0 ? (
            filteredMatches.map(match => {
              const statusBadge = getStatusBadge(match.status);
              const isEditable = canEditResults() && match.status !== 'completed';
              const teamAName = match.teamA?.name || match.teamAName || 'TBD';
              const teamBName = match.teamB?.name || match.teamBName || 'TBD';
              const tournamentName = match.tournament?.name || match.tournamentName || 'Tournament Match';
              const matchDate = match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString() : (match.date || 'Date TBD');
              const matchTime = match.startTime || match.time || 'Time TBD';
              const matchVenue = getVenueDisplay(match.court);
              
              return (
                <div key={match._id || match.id} className="match-card">
                  <div className="match-header">
                    <div className="match-tournament">{tournamentName}</div>
                    <div className={`match-status-badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </div>
                    {canEditResults() && (
                      <button 
                        className="delete-match-btn"
                        onClick={() => {
                          setMatchToDelete(match);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  <div className="match-round">{match.round || 'Group Stage'}</div>
                  
                  <div className="match-teams">
                    <div className="team team-left">
                      <div className="team-name">{teamAName}</div>
                      {match.status === 'completed' && (
                        <div className="team-score">{match.teamAScore || match.team1?.score || 0}</div>
                      )}
                    </div>
                    <div className="vs">VS</div>
                    <div className="team team-right">
                      <div className="team-name">{teamBName}</div>
                      {match.status === 'completed' && (
                        <div className="team-score">{match.teamBScore || match.team2?.score || 0}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="match-details">
                    <span>{matchDate}</span>
                    <span>{matchTime}</span>
                    <span>{matchVenue}</span>
                  </div>
                  
                  <div className="match-actions">
                    <button 
                      className="view-match-btn"
                      onClick={() => handleViewStats(match)}
                    >
                      View Details
                    </button>
                    {isEditable && (
                      <button 
                        className="enter-result-btn"
                        onClick={() => handleEnterResult(match)}
                      >
                        Enter Result
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 8L6 6M16 8L18 6M8 16L6 18M16 16L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>No matches found</h3>
              <p>Check back later for upcoming matches</p>
              {canCreateMatches && (
                <button className="create-first-btn" onClick={() => setShowCreateModal(true)}>
                  Create Your First Match
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Match</h3>
              <button className="close-modal" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete this match?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="delete-confirm-btn" onClick={handleDeleteMatch}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Match Stats Modal */}
      {showStatsModal && selectedMatch && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Match Details</h3>
              <button className="close-modal" onClick={() => setShowStatsModal(false)}>×</button>
            </div>
            <div className="modal-content">
              {statsLoading || !statsDataLoaded ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loading-spinner" style={{ width: '30px', height: '30px' }}></div>
                  <p>Loading match details...</p>
                </div>
              ) : (
                <>
                  <div className="match-info">
                    <div className="match-title">{selectedMatch.tournament?.name || selectedMatch.tournamentName}</div>
                    <div className="match-round">{selectedMatch.round || 'Group Stage'}</div>
                    <div className="match-date">
                      {selectedMatch.scheduledDate ? new Date(selectedMatch.scheduledDate).toLocaleDateString() : selectedMatch.date} | 
                      {selectedMatch.startTime || selectedMatch.time} | 
                      {getVenueDisplay(selectedMatch.court)}
                    </div>
                  </div>
                  
                  <div className="score-display">
                    <div className="score-team-display">
                      <div className="team-name">{selectedMatch.teamA?.name || selectedMatch.teamAName}</div>
                      <div className="team-score-large">{selectedMatch.teamAScore ?? selectedMatch.team1?.score ?? '?'}</div>
                      {selectedMatch.teamAFormation && (
                        <div className="team-formation">Formation: {selectedMatch.teamAFormation}</div>
                      )}
                    </div>
                    <div className="vs-display">VS</div>
                    <div className="score-team-display">
                      <div className="team-name">{selectedMatch.teamB?.name || selectedMatch.teamBName}</div>
                      <div className="team-score-large">{selectedMatch.teamBScore ?? selectedMatch.team2?.score ?? '?'}</div>
                      {selectedMatch.teamBFormation && (
                        <div className="team-formation">Formation: {selectedMatch.teamBFormation}</div>
                      )}
                    </div>
                  </div>
                  
                  {selectedMatch.goalScorers && selectedMatch.goalScorers.length > 0 && (
                    <div className="stats-section">
                      <h4>Goal Scorers</h4>
                      <div className="goals-list">
                        {selectedMatch.goalScorers.map((goal, idx) => (
                          <div key={idx} className="goal-item">
                            <span className="goal-minute">{goal.minute}'</span>
                            <span className="goal-player">{getPlayerName(goal.player, teamAPlayers, teamBPlayers)}</span>
                            <span className="goal-team">({goal.team === 'teamA' ? 'Team A' : 'Team B'})</span>
                            {goal.assistBy && (
                              <span className="goal-assist">Assist: {getPlayerName(goal.assistBy, teamAPlayers, teamBPlayers)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedMatch.cards && selectedMatch.cards.length > 0 && (
                    <div className="stats-section">
                      <h4>Cards</h4>
                      <div className="cards-list">
                        {selectedMatch.cards.map((card, idx) => (
                          <div key={idx} className="card-item">
                            <span className="card-minute">{card.minute}'</span>
                            <span className="card-player">{getPlayerName(card.player, teamAPlayers, teamBPlayers)}</span>
                            <span className="card-team">({card.team === 'teamA' ? 'Team A' : 'Team B'})</span>
                            <span className={`card-badge ${card.cardType === 'yellow' ? 'yellow' : 'red'}`}>
                              {card.cardType === 'yellow' ? 'Yellow Card' : 'Red Card'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedMatch.manOfTheMatch && (
                    <div className="man-of-match-display">
                      Man of the Match: <strong>{getPlayerName(selectedMatch.manOfTheMatch, teamAPlayers, teamBPlayers)}</strong>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowStatsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-match-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Match</h3>
              <button className="close-modal" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleCreateMatch}>
                <div className="form-section">
                  <h4>Match Information</h4>
                  
                  <div className="form-group">
                    <label>Tournament <span className="required">*</span></label>
                    <select
                      value={createMatchData.tournament}
                      onChange={(e) => handleTournamentChange(e.target.value)}
                      required
                    >
                      <option value="">Select Tournament</option>
                      {tournaments.filter(t => t.status === 'registration_open' || t.status === 'ongoing').map(t => (
                        <option key={t._id || t.id} value={t._id || t.id}>
                          {t.name} ({t.status === 'registration_open' ? 'Registration Open' : 'Ongoing'})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Team A <span className="required">*</span></label>
                      <select
                        value={createMatchData.teamA}
                        onChange={(e) => setCreateMatchData(prev => ({ ...prev, teamA: e.target.value }))}
                        required
                        disabled={!createMatchData.tournament}
                      >
                        <option value="">Select Team A</option>
                        {availableTeams.map(team => (
                          <option key={team._id || team.id} value={team._id || team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Team B <span className="required">*</span></label>
                      <select
                        value={createMatchData.teamB}
                        onChange={(e) => setCreateMatchData(prev => ({ ...prev, teamB: e.target.value }))}
                        required
                        disabled={!createMatchData.tournament}
                      >
                        <option value="">Select Team B</option>
                        {availableTeams.map(team => (
                          <option key={team._id || team.id} value={team._id || team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Round</label>
                    <input
                      type="text"
                      placeholder="e.g., Quarter Final, Semi Final, Final, Group Stage"
                      value={createMatchData.round}
                      onChange={(e) => setCreateMatchData(prev => ({ ...prev, round: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Schedule</h4>
                  
                  <div className="form-group">
                    <label>Date <span className="required">*</span></label>
                    <input
                      type="date"
                      value={createMatchData.scheduledDate}
                      onChange={(e) => setCreateMatchData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={createMatchData.startTime}
                        onChange={(e) => setCreateMatchData(prev => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>End Time</label>
                      <input
                        type="time"
                        value={createMatchData.endTime}
                        onChange={(e) => setCreateMatchData(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Court / Venue</label>
                    <select
                      value={createMatchData.court}
                      onChange={(e) => setCreateMatchData(prev => ({ ...prev, court: e.target.value }))}
                    >
                      <option value="">Select Court</option>
                      {courts.map(court => (
                        <option key={court._id || court.id} value={court._id || court.id}>
                          {court.name} - {getLocationString(court.location)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Match'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Result Entry Modal */}
      {showResultModal && selectedMatch && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="result-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enter Match Result</h3>
              <button className="close-modal" onClick={() => setShowResultModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="match-info">
                <div className="match-title">{selectedMatch.tournament?.name || selectedMatch.tournamentName}</div>
                <div className="match-round">{selectedMatch.round || 'Group Stage'}</div>
                <div className="match-teams-info">
                  <span className="team-name">{selectedMatch.teamA?.name || selectedMatch.teamAName}</span>
                  <span className="vs-text">vs</span>
                  <span className="team-name">{selectedMatch.teamB?.name || selectedMatch.teamBName}</span>
                </div>
              </div>

              <div className="form-section">
                <h4>Score</h4>
                <div className="score-inputs">
                  <div className="score-input">
                    <label>{selectedMatch.teamA?.name || 'Team A'}</label>
                    <input
                      type="number"
                      min="0"
                      value={resultData.teamAScore}
                      onChange={(e) => setResultData(prev => ({ ...prev, teamAScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="score-input">
                    <label>{selectedMatch.teamB?.name || 'Team B'}</label>
                    <input
                      type="number"
                      min="0"
                      value={resultData.teamBScore}
                      onChange={(e) => setResultData(prev => ({ ...prev, teamBScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Formations</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>{selectedMatch.teamA?.name || 'Team A'} Formation</label>
                    <input
                      type="text"
                      placeholder="e.g., 3-2-1"
                      value={resultData.teamAFormation}
                      onChange={(e) => setResultData(prev => ({ ...prev, teamAFormation: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{selectedMatch.teamB?.name || 'Team B'} Formation</label>
                    <input
                      type="text"
                      placeholder="e.g., 3-2-1"
                      value={resultData.teamBFormation}
                      onChange={(e) => setResultData(prev => ({ ...prev, teamBFormation: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Goal Scorers</h4>
                {resultData.goalScorers.map((goal, index) => (
                  <div key={index} className="dynamic-item">
                    <div className="dynamic-item-header">
                      <span>Goal {index + 1}</span>
                      <button type="button" className="remove-btn" onClick={() => removeGoal(index)}>Remove</button>
                    </div>
                    <div className="dynamic-item-fields">
                      <select
                        value={goal.player || ''}
                        onChange={(e) => updateGoal(index, 'player', e.target.value)}
                      >
                        <option value="">Select Player</option>
                        <optgroup label={selectedMatch.teamA?.name || 'Team A'}>
                          {teamAPlayers.map((p, idx) => (
                            <option key={p.playerId || `a_${idx}`} value={p.playerId}>
                              {p.name} - {p.position}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={selectedMatch.teamB?.name || 'Team B'}>
                          {teamBPlayers.map((p, idx) => (
                            <option key={p.playerId || `b_${idx}`} value={p.playerId}>
                              {p.name} - {p.position}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <input
                        type="number"
                        placeholder="Minute"
                        value={goal.minute}
                        onChange={(e) => updateGoal(index, 'minute', e.target.value)}
                      />
                      <select
                        value={goal.assistBy || ''}
                        onChange={(e) => updateGoal(index, 'assistBy', e.target.value)}
                      >
                        <option value="">No Assist</option>
                        {allPlayers.map((p, idx) => (
                          <option key={p.playerId || `assist_${idx}`} value={p.playerId}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <button type="button" className="add-btn" onClick={addGoal}>+ Add Goal Scorer</button>
              </div>

              <div className="form-section">
                <h4>Cards</h4>
                {resultData.cards.map((card, index) => (
                  <div key={index} className="dynamic-item">
                    <div className="dynamic-item-header">
                      <span>Card {index + 1}</span>
                      <button type="button" className="remove-btn" onClick={() => removeCard(index)}>Remove</button>
                    </div>
                    <div className="dynamic-item-fields">
                      <select
                        value={card.player || ''}
                        onChange={(e) => updateCard(index, 'player', e.target.value)}
                      >
                        <option value="">Select Player</option>
                        <optgroup label={selectedMatch.teamA?.name || 'Team A'}>
                          {teamAPlayers.map((p, idx) => (
                            <option key={p.playerId || `c_a_${idx}`} value={p.playerId}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={selectedMatch.teamB?.name || 'Team B'}>
                          {teamBPlayers.map((p, idx) => (
                            <option key={p.playerId || `c_b_${idx}`} value={p.playerId}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <select
                        value={card.cardType}
                        onChange={(e) => updateCard(index, 'cardType', e.target.value)}
                      >
                        <option value="yellow">Yellow Card</option>
                        <option value="red">Red Card</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Minute"
                        value={card.minute}
                        onChange={(e) => updateCard(index, 'minute', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <button type="button" className="add-btn" onClick={addCard}>+ Add Card</button>
              </div>

              <div className="form-section">
                <h4>Man of the Match</h4>
                <div className="form-group">
                  <select
                    value={resultData.manOfTheMatch || ''}
                    onChange={(e) => setResultData(prev => ({ ...prev, manOfTheMatch: e.target.value }))}
                  >
                    <option value="">Select Player</option>
                    <optgroup label={selectedMatch.teamA?.name || 'Team A'}>
                      {teamAPlayers.map((p, idx) => (
                        <option key={p.playerId || `m_a_${idx}`} value={p.playerId}>
                          {p.name} - {p.position}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={selectedMatch.teamB?.name || 'Team B'}>
                      {teamBPlayers.map((p, idx) => (
                        <option key={p.playerId || `m_b_${idx}`} value={p.playerId}>
                          {p.name} - {p.position}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h4>Result Type</h4>
                <div className="result-type-buttons">
                  <button
                    type="button"
                    className={`result-type-btn ${resultData.resultType === 'regular_time' ? 'active' : ''}`}
                    onClick={() => setResultData(prev => ({ ...prev, resultType: 'regular_time' }))}
                  >
                    Regular Time
                  </button>
                  <button
                    type="button"
                    className={`result-type-btn ${resultData.resultType === 'extra_time' ? 'active' : ''}`}
                    onClick={() => setResultData(prev => ({ ...prev, resultType: 'extra_time' }))}
                  >
                    Extra Time
                  </button>
                  <button
                    type="button"
                    className={`result-type-btn ${resultData.resultType === 'penalties' ? 'active' : ''}`}
                    onClick={() => setResultData(prev => ({ ...prev, resultType: 'penalties' }))}
                  >
                    Penalties
                  </button>
                </div>
                
                {resultData.resultType === 'penalties' && (
                  <div className="penalty-inputs">
                    <div className="score-input">
                      <label>Penalties - Team A</label>
                      <input
                        type="number"
                        min="0"
                        value={resultData.penaltyDetails.teamAPenalty}
                        onChange={(e) => setResultData(prev => ({
                          ...prev,
                          penaltyDetails: { ...prev.penaltyDetails, teamAPenalty: parseInt(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    <div className="score-input">
                      <label>Penalties - Team B</label>
                      <input
                        type="number"
                        min="0"
                        value={resultData.penaltyDetails.teamBPenalty}
                        onChange={(e) => setResultData(prev => ({
                          ...prev,
                          penaltyDetails: { ...prev.penaltyDetails, teamBPenalty: parseInt(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowResultModal(false)}>Cancel</button>
              <button className="submit-btn" onClick={handleSubmitResult} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Matches;