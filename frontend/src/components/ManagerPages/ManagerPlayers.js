import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerDashboard.css';

const ManagerPlayers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

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
        
        // Fetch all teams
        const teamsData = await api.getTeams();
        const allPlayers = [];
        const allBookings = [];
        
        // Collect all players from teams
        (teamsData.data || []).forEach(team => {
          (team.players || []).forEach(player => {
            if (!allPlayers.find(p => (p._id || p.id) === (player._id || player.id))) {
              allPlayers.push({
                ...player,
                teamName: team.name,
                teamId: team._id
              });
            }
          });
        });
        
        // Fetch all bookings to get reviews
        try {
          const bookingsData = await api.getBookings(1, 100, 'all');
          const reviews = [];
          
          // Collect all reviews from bookings
          if (bookingsData.data && bookingsData.data.length > 0) {
            bookingsData.data.forEach(booking => {
              if (booking.review && booking.review.rating) {
                reviews.push({
                  userId: booking.userId,
                  rating: booking.review.rating,
                  comment: booking.review.comment
                });
              }
            });
          }
          
          // Calculate average rating per player
          const playerRatings = {};
          reviews.forEach(review => {
            if (!playerRatings[review.userId]) {
              playerRatings[review.userId] = {
                sum: 0,
                count: 0
              };
            }
            playerRatings[review.userId].sum += review.rating;
            playerRatings[review.userId].count++;
          });
          
          // Add rating to each player
          allPlayers.forEach(player => {
            const playerId = player.player?._id || player.player?.id || player._id || player.id;
            if (playerId && playerRatings[playerId]) {
              player.rating = (playerRatings[playerId].sum / playerRatings[playerId].count).toFixed(1);
            } else {
              player.rating = null;
            }
          });
          
          // Calculate overall average rating across all players with reviews
          const ratingsWithValues = reviews.filter(r => r.rating).map(r => r.rating);
          if (ratingsWithValues.length > 0) {
            const avg = ratingsWithValues.reduce((a, b) => a + b, 0) / ratingsWithValues.length;
            setAverageRating(parseFloat(avg.toFixed(1)));
          } else {
            setAverageRating(0);
          }
          
        } catch (reviewError) {
          console.error('Error fetching reviews:', reviewError);
          setAverageRating(0);
        }
        
        setPlayers(allPlayers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching manager players:', error);
        navigate('/login');
      }
    };
    
    fetchManagerPlayers();
  }, [navigate]);

  const getSkillLevelBadge = (level) => {
    const colors = {
      beginner: { bg: '#dbeafe', color: '#1d4ed8' },
      intermediate: { bg: '#fef3c7', color: '#92400e' },
      advanced: { bg: '#fee2e2', color: '#dc2626' },
      professional: { bg: '#ede9fe', color: '#5b21b6' }
    };
    const style = colors[level] || colors.beginner;
    return (
      <span style={{ background: style.bg, color: style.color, padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
        {level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Beginner'}
      </span>
    );
  };

  const filteredPlayers = players.filter(player =>
    (player.name || player.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.position || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="manager-dashboard">
        <div className="manager-header">
          <h1 className="manager-title">Players Management</h1>
          <p className="manager-subtitle">View all registered players and their profiles</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">👤</div>
            <div className="stat-info">
              <h3>{players.length}</h3>
              <p>Total Players</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">⚽</div>
            <div className="stat-info">
              <h3>{players.reduce((sum, p) => sum + (p.goals || 0), 0)}</h3>
              <p>Total Goals</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">🏆</div>
            <div className="stat-info">
              <h3>{players.reduce((sum, p) => sum + (p.totalMatches || 0), 0)}</h3>
              <p>Total Matches</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">⭐</div>
            <div className="stat-info">
              <h3>{averageRating > 0 ? averageRating : 'N/A'}</h3>
              <p>Avg Rating</p>
            </div>
          </div>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search players by name, email, or position..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                <th>Rating</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length > 0 ? filteredPlayers.map((player, index) => (
                <tr key={player._id || player.id || index}>
                  <td>
                    <div className="player-cell">
                      <div className="player-avatar-small">
                        {(player.name || player.username || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="player-name-cell">{player.name || player.username}</div>
                        <div className="player-email-cell">{player.email || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{player.position || 'N/A'}</td>
                  <td>{getSkillLevelBadge(player.skillLevel || 'beginner')}</td>
                  <td>{player.totalMatches || 0}</td>
                  <td>{player.goals || 0}</td>
                  <td>
                    <span className="rating-badge">
                      {player.rating ? `${player.rating} ★` : 'No reviews'}
                    </span>
                  </td>
                  <td>
                    <button className="view-profile-btn" onClick={() => {
                      setSelectedPlayer(player);
                      setShowPlayerModal(true);
                    }}>
                      View Profile
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    {searchTerm ? `No players found matching "${searchTerm}"` : 'No players found yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPlayerModal && selectedPlayer && (
        <div className="modal-overlay" onClick={() => setShowPlayerModal(false)}>
          <div className="modal player-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Player Profile</h3>
              <button className="close-modal" onClick={() => setShowPlayerModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="player-profile-header">
                <div className="player-profile-avatar">
                  {(selectedPlayer.name || selectedPlayer.username || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="player-profile-info">
                  <h2>{selectedPlayer.name || selectedPlayer.username}</h2>
                  <div className="player-badges">
                    {getSkillLevelBadge(selectedPlayer.skillLevel || 'beginner')}
                    <span className="position-badge">{selectedPlayer.position || 'N/A'}</span>
                    {selectedPlayer.rating && (
                      <span className="rating-badge-modal">
                        ⭐ {selectedPlayer.rating} / 5
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="player-stats-grid">
                <div className="player-stat-card">
                  <div className="stat-value">{selectedPlayer.totalMatches || 0}</div>
                  <div className="stat-label">Matches</div>
                </div>
                <div className="player-stat-card">
                  <div className="stat-value">{selectedPlayer.goals || 0}</div>
                  <div className="stat-label">Goals</div>
                </div>
                <div className="player-stat-card">
                  <div className="stat-value">
                    {selectedPlayer.goals > 0 && selectedPlayer.totalMatches > 0
                      ? Math.round((selectedPlayer.goals / selectedPlayer.totalMatches) * 10) / 10
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
                {selectedPlayer.teamName && (
                  <div className="detail-row">
                    <span className="detail-label">Team:</span>
                    <span className="detail-value">{selectedPlayer.teamName}</span>
                  </div>
                )}
                {selectedPlayer.rating && (
                  <div className="detail-row">
                    <span className="detail-label">Average Rating:</span>
                    <span className="detail-value">⭐ {selectedPlayer.rating} / 5</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowPlayerModal(false)}>Close</button>
              <button className="confirm-btn" onClick={() => alert(`Contact ${selectedPlayer.name || selectedPlayer.username} feature coming soon!`)}>
                Contact Player
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerPlayers;