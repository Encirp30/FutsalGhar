import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Layout from '../Layout';
import './CreateTeam.css';

const CreateTeam = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('futsalUser') || '{}');

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [newTeamId, setNewTeamId] = useState(null);

    // Strict Positions for Backend Enum
    const ALLOWED_POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Striker'];

    const [teamData, setTeamData] = useState({
        teamName: '',
        teamLevel: 'recreational',
        teamDescription: '',
        isPublic: true
    });

    const [players, setPlayers] = useState([
        { 
            id: 'owner', 
            name: user?.fullName || user?.name || user?.username || 'Encirp', 
            position: 'Forward', 
            jerseyNumber: 10, 
            isCaptain: true, 
            isActive: true,
            player: user?._id || user?.id
        }
    ]);

    const [newPlayer, setNewPlayer] = useState({ 
        name: '', 
        position: 'Forward', 
        jerseyNumber: '' 
    });

    const handlePlayerInputChange = (e) => {
        const { name, value } = e.target;
        setNewPlayer(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPlayer = () => {
        if (!newPlayer.name.trim()) return;
        const playerObj = {
            id: Date.now(),
            name: newPlayer.name,
            position: newPlayer.position,
            jerseyNumber: newPlayer.jerseyNumber,
            isCaptain: false,
            isActive: true
        };
        setPlayers([...players, playerObj]);
        setNewPlayer({ name: '', position: 'Forward', jerseyNumber: '' });
    };

    const toggleActive = (id) => {
        setPlayers(players.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    };

    // Set captain by the user
    const handleSetCaptain = (id) => {
        setPlayers(players.map(p => ({ ...p, isCaptain: p.id === id })));
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const activePlayers = players.filter(p => p.isActive);
            
            // Frontend validation: Minimum 6 players required
            if (activePlayers.length < 6) {
                setError('A team must have a minimum of 6 players.');
                setIsSubmitting(false);
                return;
            }
            
            // Frontend validation: Check for duplicate jersey numbers
            const jerseyNumbers = activePlayers.map(p => Number(p.jerseyNumber) || 0).filter(n => n !== 0);
            const uniqueJerseys = new Set(jerseyNumbers);
            if (uniqueJerseys.size !== jerseyNumbers.length) {
                setError('Duplicate jersey numbers are not allowed.');
                setIsSubmitting(false);
                return;
            }
            
            // Find captain player and extract their ID and name
            const captainPlayer = activePlayers.find(p => p.isCaptain);
            let captainId = user._id; // Default to current user
            // Explicitly set teamCaptain: use captain player name or first player or fallback
            let captainName = captainPlayer?.name || activePlayers[0]?.name || user.username || 'Unknown';
            
            if (captainPlayer) {
                if (captainPlayer.id === 'owner') {
                    // Owner should use the user ID
                    captainId = user._id;
                } else if (captainPlayer.player && /^[a-f0-9]{24}$/.test(captainPlayer.player)) {
                    // Valid MongoDB ObjectId
                    captainId = captainPlayer.player;
                }
            }
            
            const payload = {
                name: teamData.teamName,
                bio: teamData.teamDescription,
                level: teamData.teamLevel.toLowerCase(),
                visibility: teamData.isPublic ? 'public' : 'private',
                captain: captainId,
                teamCaptain: captainName,
                players: activePlayers.map(p => {
                    let playerId = null;
                    
                    // Handle owner player explicitly
                    if (p.id === 'owner') {
                        playerId = user._id;
                    } else if (p.player && typeof p.player === 'string' && /^[a-f0-9]{24}$/.test(p.player)) {
                        // Valid MongoDB ObjectId
                        playerId = p.player;
                    }
                    // else: guest player with playerId = null
                    
                    return {
                        player: playerId,
                        name: p.name,
                        position: p.position.toLowerCase(),
                        jerseyNumber: Number(p.jerseyNumber) || 0
                    };
                })
            };

            // Use api.createTeam instead of api.post
            const response = await api.createTeam(payload);
            // Capture the new team ID from the response
            if (response.team && response.team._id) {
              setNewTeamId(response.team._id);
            }
            setCurrentStep(3);
        } catch (err) {
            console.error("Submission Error:", err);
            setError(err.response?.data?.message || err.message || "Connection Error: Backend server is not responding. Check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout activePage="teams">
            {/* Full-page wrapper */}
            <div className="create-team-page-container">
                <div className="create-team-wrapper">
                    
                    <div className="progress-steps">
                        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                            <div className="step-circle">1</div>
                            <span className="step-label">Details</span>
                        </div>
                        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                            <div className="step-circle">2</div>
                            <span className="step-label">Players</span>
                        </div>
                        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                            <div className="step-circle">3</div>
                            <span className="step-label">Success</span>
                        </div>
                    </div>

                    {error && <div className="form-error-message">{error}</div>}

                    {currentStep === 1 && (
                        <div className="step-section">
                            <div className="step-content">
                                <div className="step-header"><h2>Team Details</h2></div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Team Name</label>
                                        <input 
                                            type="text" 
                                            value={teamData.teamName} 
                                            onChange={(e) => setTeamData({...teamData, teamName: e.target.value})} 
                                            placeholder="Enter team name" 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Level</label>
                                        <select 
                                            value={teamData.teamLevel} 
                                            onChange={(e) => setTeamData({...teamData, teamLevel: e.target.value})}
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="recreational">Recreational</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="professional">Professional</option>
                                        </select>
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Description</label>
                                        <textarea 
                                            value={teamData.teamDescription} 
                                            onChange={(e) => setTeamData({...teamData, teamDescription: e.target.value})} 
                                            placeholder="Tell us about your team..."
                                        />
                                    </div>
                                </div>
                                <div className="step-actions">
                                    <button className="next-btn" onClick={() => setCurrentStep(2)}>Next: Add Players →</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="step-section">
                            <div className="step-content">
                                <div className="step-header"><h3>Add Team Roster</h3></div>
                                
                                <div className="add-player-form">
                                    <div className="player-input-grid">
                                        <input 
                                            type="text" 
                                            name="name" 
                                            placeholder="Name" 
                                            className="player-input"
                                            value={newPlayer.name}
                                            onChange={handlePlayerInputChange}
                                        />
                                        <select 
                                            name="position" 
                                            className="player-input"
                                            value={newPlayer.position}
                                            onChange={handlePlayerInputChange}
                                        >
                                            {ALLOWED_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                        </select>
                                        <input 
                                            type="number" 
                                            name="jerseyNumber" 
                                            placeholder="#" 
                                            className="player-input"
                                            value={newPlayer.jerseyNumber}
                                            onChange={handlePlayerInputChange}
                                        />
                                        <button className="add-player-btn" onClick={handleAddPlayer}>Add</button>
                                    </div>
                                </div>

                                <div className="players-grid">
                                    {players.map(player => (
                                        <div key={player.id} className={`player-card ${player.isCaptain ? 'captain' : ''} ${!player.isActive ? 'inactive' : ''}`}>
                                            <div className="player-header">
                                                <div className="player-jersey">#{player.jerseyNumber}</div>
                                                <div className="player-actions">
                                                    <button className="action-btn" onClick={() => toggleActive(player.id)}>
                                                        {player.isActive ? '✅' : '❌'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="player-info">
                                                <h4>{player.name}</h4>
                                                <div className="player-position">{player.position}</div>
                                            </div>
                                            <div className="player-footer">
                                                {/* Allowed selection */}
                                                <button 
                                                    className={`captain-btn ${player.isCaptain ? 'is-captain' : ''}`}
                                                    onClick={() => handleSetCaptain(player.id)}
                                                    disabled={player.isCaptain}
                                                >
                                                    {player.isCaptain ? '✓ Captain' : 'Set Captain'}
                                                </button>
                                                <span className="player-status">{player.isActive ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="step-actions">
                                    <button className="back-btn" onClick={() => setCurrentStep(1)}>← Back</button>
                                    <button className="create-team-btn" onClick={handleFinalSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? <div className="spinner"></div> : "Finalize Team"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="step-section">
                            <div className="step-content">
                                <div className="success-section">
                                    <div className="success-icon">🎉</div>
                                    <h2>Team Registered!</h2>
                                    <p className="success-message">Your team is ready for action.</p>
                                    <div className="step-actions" style={{gap: '10px', justifyContent: 'center'}}>
                                        {newTeamId && (
                                            <button className="next-btn" onClick={() => navigate('/teams-list')}>
                                                View All Teams
                                            </button>
                                        )}
                                        <button className="next-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default CreateTeam;