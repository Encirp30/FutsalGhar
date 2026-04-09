import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
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
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Fetch user data - FIXED: extract user properly
        const userResponse = await api.getMe();
        const userData = userResponse.user || userResponse;
        setUser(userData);
        
        // Fetch matches from API
        const matchesData = await api.getMatches();
        setMatches(matchesData.data || []);
        
        // Fetch tournaments for filter
        const tournamentsData = await api.getTournaments();
        const tournamentsList = tournamentsData.data || tournamentsData.tournaments || [];
        setTournaments(tournamentsList);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/login');
      }
    };
    
    fetchData();
  }, [navigate]);

  const canEditResults = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const getFilteredMatches = () => {
    let filtered = matches;
    
    if (selectedTournament !== 'all') {
      filtered = filtered.filter(m => String(m.tournamentId) === String(selectedTournament));
    }
    
    if (filter === 'upcoming') {
      filtered = filtered.filter(m => m.status === 'upcoming');
    } else if (filter === 'completed') {
      filtered = filtered.filter(m => m.status === 'completed');
    }
    
    return filtered;
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return { class: 'status-completed', text: '✅ Completed' };
    }
    return { class: 'status-upcoming', text: '⏳ Upcoming' };
  };

  const handleViewMatch = (match) => {
    console.log('Opening match:', match);
    setSelectedMatch(match);
    setShowScoreModal(true);
  };

  const filteredMatches = getFilteredMatches();

  const renderCardBadge = (type) => {
    if (type === 'yellow') {
      return <span className="card-badge yellow">🟨 Yellow Card</span>;
    }
    return <span className="card-badge red">🟥 Red Card</span>;
  };

  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <span className="rating-stars">
        {'★'.repeat(fullStars)}
        {halfStar && '½'}
        {'☆'.repeat(emptyStars)}
      </span>
    );
  };

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
        {/* Filters Bar */}
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
        </div>

        {/* Matches Grid */}
        <div className="matches-grid">
          {filteredMatches.length > 0 ? (
            filteredMatches.map(match => {
              const statusBadge = getStatusBadge(match.status);
              const isEditable = canEditResults() && match.status === 'upcoming';
              
              return (
                <div key={match._id || match.id} className="match-card">
                  <div className="match-header">
                    <div className="match-tournament">{match.tournamentName}</div>
                    <div className={`match-status-badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </div>
                  </div>
                  
                  <div className="match-round">{match.round}</div>
                  
                  <div className="match-teams">
                    <div className="team team-left">
                      <div className="team-name">{match.team1?.name}</div>
                      {match.status === 'completed' && (
                        <div className="team-score">{match.team1?.score}</div>
                      )}
                    </div>
                    <div className="vs">VS</div>
                    <div className="team team-right">
                      <div className="team-name">{match.team2?.name}</div>
                      {match.status === 'completed' && (
                        <div className="team-score">{match.team2?.score}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="match-details">
                    <span>📅 {match.date}</span>
                    <span>🕐 {match.time}</span>
                    <span>📍 {match.venue}</span>
                  </div>
                  
                  <div className="match-actions">
                    <button 
                      className="view-match-btn"
                      onClick={() => handleViewMatch(match)}
                    >
                      {match.status === 'completed' ? 'View Stats' : 'View Details'}
                    </button>
                    {isEditable && (
                      <button 
                        className="enter-result-btn"
                        onClick={() => handleViewMatch(match)}
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
              <div className="empty-icon">⚽</div>
              <h3>No matches found</h3>
              <p>Check back later for upcoming matches!</p>
            </div>
          )}
        </div>
      </div>

      {/* Match Stats Modal */}
      {showScoreModal && selectedMatch && (
        <div className="modal-overlay" onClick={() => setShowScoreModal(false)}>
          <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Match Statistics</h3>
              <button className="close-modal" onClick={() => setShowScoreModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="match-info">
                <div className="match-title">{selectedMatch.tournamentName}</div>
                <div className="match-round">{selectedMatch.round}</div>
                <div className="match-date">{selectedMatch.date} | {selectedMatch.time} | {selectedMatch.venue}</div>
              </div>
              
              {/* Score Display */}
              <div className="score-display">
                <div className="score-team-display">
                  <div className="team-name">{selectedMatch.team1?.name}</div>
                  <div className="team-score-large">{selectedMatch.team1?.score !== null ? selectedMatch.team1?.score : '?'}</div>
                  {selectedMatch.formation1 && (
                    <div className="team-formation">Formation: {selectedMatch.formation1}</div>
                  )}
                </div>
                <div className="vs-display">VS</div>
                <div className="score-team-display">
                  <div className="team-name">{selectedMatch.team2?.name}</div>
                  <div className="team-score-large">{selectedMatch.team2?.score !== null ? selectedMatch.team2?.score : '?'}</div>
                  {selectedMatch.formation2 && (
                    <div className="team-formation">Formation: {selectedMatch.formation2}</div>
                  )}
                </div>
              </div>
              
              {/* Goalscorers Section */}
              {selectedMatch.goals && selectedMatch.goals.length > 0 ? (
                <div className="stats-section">
                  <h4>⚽ Goalscorers</h4>
                  <div className="goals-list">
                    {selectedMatch.goals.map((goal, idx) => (
                      <div key={idx} className="goal-item">
                        <span className="goal-minute">{goal.minute}'</span>
                        <span className="goal-player">{goal.player}</span>
                        <span className="goal-team">({goal.team})</span>
                        {goal.assist && (
                          <span className="goal-assist">Assist: {goal.assist}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedMatch.status === 'completed' ? (
                <div className="stats-section">
                  <h4>⚽ Goalscorers</h4>
                  <p className="no-stats">No goals recorded for this match.</p>
                </div>
              ) : null}
              
              {/* Cards Section */}
              {selectedMatch.cards && selectedMatch.cards.length > 0 ? (
                <div className="stats-section">
                  <h4>🃏 Cards</h4>
                  <div className="cards-list">
                    {selectedMatch.cards.map((card, idx) => (
                      <div key={idx} className="card-item">
                        <span className="card-minute">{card.minute}'</span>
                        <span className="card-player">{card.player}</span>
                        <span className="card-team">({card.team})</span>
                        {renderCardBadge(card.type)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedMatch.status === 'completed' ? (
                <div className="stats-section">
                  <h4>🃏 Cards</h4>
                  <p className="no-stats">No cards shown in this match.</p>
                </div>
              ) : null}
              
              {/* Man of the Match */}
              {selectedMatch.manOfTheMatch && (
                <div className="man-of-match-display">
                  ⭐ Man of the Match: <strong>{selectedMatch.manOfTheMatch}</strong>
                </div>
              )}
              
              {/* Player Ratings Section */}
              {selectedMatch.playerRatings && (
                <div className="stats-section">
                  <h4>⭐ Player Ratings</h4>
                  <div className="ratings-container">
                    <div className="team-ratings">
                      <h5>{selectedMatch.team1?.name}</h5>
                      {selectedMatch.playerRatings.team1 && selectedMatch.playerRatings.team1.length > 0 ? (
                        selectedMatch.playerRatings.team1.map((player, idx) => (
                          <div key={idx} className="rating-item">
                            <span className="rating-player">{player.player}</span>
                            <span className="rating-value">{player.rating}</span>
                            {renderRatingStars(player.rating)}
                          </div>
                        ))
                      ) : (
                        <p className="no-ratings">No ratings available</p>
                      )}
                    </div>
                    <div className="team-ratings">
                      <h5>{selectedMatch.team2?.name}</h5>
                      {selectedMatch.playerRatings.team2 && selectedMatch.playerRatings.team2.length > 0 ? (
                        selectedMatch.playerRatings.team2.map((player, idx) => (
                          <div key={idx} className="rating-item">
                            <span className="rating-player">{player.player}</span>
                            <span className="rating-value">{player.rating}</span>
                            {renderRatingStars(player.rating)}
                          </div>
                        ))
                      ) : (
                        <p className="no-ratings">No ratings available</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Result Locked Notice */}
              {selectedMatch.status === 'completed' && (
                <div className="result-locked-notice">
                  🔒 Final statistics - Match completed.
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowScoreModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Matches;