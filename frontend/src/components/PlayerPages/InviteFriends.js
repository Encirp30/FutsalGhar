import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './InviteFriends.css';

const InviteFriends = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referralStats, setReferralStats] = useState({
    totalInvites: 0,
    joinedFriends: 0,
    pendingInvites: 0,
    rewardsEarned: 0
  });
  
  const [invitedFriends, setInvitedFriends] = useState([]);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Fetch user data
        const userResponse = await api.getMe();
        const userData = userResponse.user || userResponse;
        setUser(userData);
        
        // Generate referral link
        const baseUrl = window.location.origin;
        const referralCode = userData.referralCode || userData._id;
        const link = `${baseUrl}/register?ref=${referralCode}`;
        setReferralLink(link);
        
        // Fetch referral stats from API
        try {
          const statsData = await api.getReferralStats();
          if (statsData && statsData.data) {
            const total = statsData.data.totalReferrals || 0;
            const joined = statsData.data.joinedCount || 0;
            setReferralStats({
              totalInvites: total,
              joinedFriends: joined,
              pendingInvites: total - joined,
              rewardsEarned: statsData.data.totalRewards || 0
            });
          }
        } catch (statsError) {
          console.log('Referral stats not available yet:', statsError.message);
        }
        
        // Fetch referral history - try multiple possible endpoints
        let historyData = [];
        try {
          // Try to get from getUserTeams or similar endpoint
          const teamsData = await api.getUserTeams();
          if (teamsData && teamsData.data) {
            // If we have team data, we can use it
            historyData = [];
          }
        } catch (historyError) {
          console.log('Referral history not available yet:', historyError.message);
        }
        
        // If no real data, show empty array
        setInvitedFriends(historyData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching referral data:', error);
        setLoading(false);
      }
    };
    
    fetchReferralData();
  }, [navigate]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const shareOnSocial = (platform) => {
    const text = `Join me on FutsalPro! Use my referral link to get started: ${referralLink}`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(referralLink);
    
    let shareUrl = '';
    switch(platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=Join me on FutsalPro&body=${encodedText}`;
        break;
      default:
        return;
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const sendInvite = (email) => {
    const subject = encodeURIComponent('Join me on FutsalPro!');
    const body = encodeURIComponent(`Hey! I'm inviting you to join FutsalPro - the best platform for booking futsal courts and finding teams. Use my referral link to sign up: ${referralLink}`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Layout activePage="invite-friends">
      <div className="invite-friends-page">
        <div className="invite-content">
          {/* Left Column - Invite Section */}
          <div className="invite-left">
            {/* Referral Link Card */}
            <div className="referral-card">
              <h3>Your Referral Link</h3>
              <p className="referral-description">
                Share this link with your friends. When they sign up using your link, you'll both get rewards!
              </p>
              <div className="referral-link-container">
                <input 
                  type="text" 
                  value={referralLink} 
                  readOnly 
                  className="referral-link-input"
                />
                <button 
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={copyToClipboard}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Quick Share Section */}
            <div className="share-card">
              <h3>Quick Share</h3>
              <div className="share-buttons">
                <button className="share-btn whatsapp" onClick={() => shareOnSocial('whatsapp')}>
                  <span className="share-icon"></span>
                  WhatsApp
                </button>
                <button className="share-btn facebook" onClick={() => shareOnSocial('facebook')}>
                  <span className="share-icon"></span>
                  Facebook
                </button>
                <button className="share-btn twitter" onClick={() => shareOnSocial('twitter')}>
                  <span className="share-icon"></span>
                  Twitter
                </button>
                <button className="share-btn email" onClick={() => shareOnSocial('email')}>
                  <span className="share-icon"></span>
                  Email
                </button>
              </div>
            </div>

            {/* Invite by Email */}
            <div className="email-invite-card">
              <h3>Invite by Email</h3>
              <p className="email-description">
                Enter your friend's email address and we'll send them an invitation.
              </p>
              <div className="email-input-group">
                <input 
                  type="email" 
                  placeholder="friend@example.com" 
                  className="email-input"
                  id="friendEmail"
                />
                <button 
                  className="send-invite-btn"
                  onClick={() => {
                    const email = document.getElementById('friendEmail').value;
                    if (email) {
                      sendInvite(email);
                      document.getElementById('friendEmail').value = '';
                    } else {
                      alert('Please enter an email address');
                    }
                  }}
                >
                  Send Invite
                </button>
              </div>
            </div>

            {/* Referral Rewards - Updated with Rs. currency */}
            <div className="rewards-card">
              <h3>Referral Rewards</h3>
              <div className="rewards-grid">
                <div className="reward-item">
                  <div className="reward-icon">👥</div>
                  <div className="reward-info">
                    <span className="reward-value">1 friend</span>
                    <span className="reward-label">Rs. 50 wallet credit</span>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon">👥👥</div>
                  <div className="reward-info">
                    <span className="reward-value">3 friends</span>
                    <span className="reward-label">Rs. 200 wallet credit</span>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon">🏆</div>
                  <div className="reward-info">
                    <span className="reward-value">5 friends</span>
                    <span className="reward-label">Free booking voucher</span>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon">⭐</div>
                  <div className="reward-info">
                    <span className="reward-value">10 friends</span>
                    <span className="reward-label">"Super Connector" badge</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Friends List */}
          <div className="invite-right">
            {/* Stats Card - Updated with Rs. currency */}
            <div className="stats-card">
              <h3>Your Referral Stats</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-number">{referralStats.totalInvites}</div>
                  <div className="stat-label">Total Invites</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">{referralStats.joinedFriends}</div>
                  <div className="stat-label">Joined</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">{referralStats.pendingInvites}</div>
                  <div className="stat-label">Pending</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">Rs. {referralStats.rewardsEarned}</div>
                  <div className="stat-label">Rewards Earned</div>
                </div>
              </div>
              <div className="progress-bar-container">
                <div className="progress-label">Next reward: {referralStats.joinedFriends}/3 friends</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((referralStats.joinedFriends / 3) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Invited Friends List - Shows real data when available */}
            <div className="friends-list-card">
              <h3>Friends Who Joined</h3>
              <div className="friends-list">
                {invitedFriends.filter(f => f.status === 'joined' || f.joinedDate).length > 0 ? (
                  invitedFriends.filter(f => f.status === 'joined' || f.joinedDate).map((friend, index) => (
                    <div key={friend.id || index} className="friend-item joined">
                      <div className="friend-avatar">
                        {(friend.name || friend.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-info">
                        <div className="friend-name">{friend.name || friend.username || 'User'}</div>
                        <div className="friend-email">{friend.email || 'No email'}</div>
                        {friend.joinedDate && (
                          <div className="friend-date">Joined: {new Date(friend.joinedDate).toLocaleDateString()}</div>
                        )}
                      </div>
                      <div className="friend-badge joined-badge">✓ Joined</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-friends-message">
                    <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      No friends have joined yet. Share your referral link!
                    </p>
                  </div>
                )}
              </div>
              
              <h3 className="pending-title">Pending Invites</h3>
              <div className="friends-list">
                {invitedFriends.filter(f => f.status === 'pending' && !f.joinedDate).length > 0 ? (
                  invitedFriends.filter(f => f.status === 'pending' && !f.joinedDate).map((friend, index) => (
                    <div key={friend.id || index} className="friend-item pending">
                      <div className="friend-avatar pending-avatar">
                        {(friend.name || friend.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-info">
                        <div className="friend-name">{friend.name || 'Invited User'}</div>
                        <div className="friend-email">{friend.email || 'No email'}</div>
                      </div>
                      <button 
                        className="remind-btn"
                        onClick={() => sendInvite(friend.email)}
                      >
                        Remind
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-friends-message">
                    <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      No pending invites. Send some invites to your friends!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Invite Tips */}
            <div className="tips-card">
              <h3>Tips for Better Invites</h3>
              <ul className="tips-list">
                <li>Share your personal experience with FutsalPro</li>
                <li>Invite friends who love playing futsal</li>
                <li>Share on WhatsApp groups and social media</li>
                <li>Remind friends to use your referral link</li>
                <li>Create a team together for extra fun!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InviteFriends;