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
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({
    totalInvites: 0,
    joinedFriends: 0,
    pendingInvites: 0,
    rewardsEarned: 0,
    nextMilestone: 1,
    nextReward: 500
  });
  
  const [invitedFriends, setInvitedFriends] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

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
        
        // Get referral link from backend
        try {
          const linkResponse = await api.getReferralLink();
          if (linkResponse && linkResponse.referralLink) {
            setReferralLink(linkResponse.referralLink);
            setReferralCode(linkResponse.referralCode);
          }
        } catch (linkError) {
          console.log('Error fetching referral link:', linkError);
          const fallbackLink = `${window.location.origin}/register?ref=${userData._id}`;
          setReferralLink(fallbackLink);
        }
        
        // Fetch referral stats
        try {
          const statsData = await api.getReferralStats();
          console.log('Stats API response:', statsData);
          if (statsData && statsData.stats) {
            const joinedCount = statsData.stats.joinedFriends || 0;
            setReferralStats({
              totalInvites: statsData.stats.totalInvites || 0,
              joinedFriends: joinedCount,
              pendingInvites: statsData.stats.pendingInvites || 0,
              rewardsEarned: statsData.stats.rewardsEarned || 0,
              nextMilestone: joinedCount + 1,
              nextReward: 500
            });
          } else if (statsData && statsData.data) {
            const joinedCount = statsData.data.joinedCount || 0;
            setReferralStats({
              totalInvites: statsData.data.totalReferrals || 0,
              joinedFriends: joinedCount,
              pendingInvites: statsData.data.pendingCount || 0,
              rewardsEarned: statsData.data.totalRewards || 0,
              nextMilestone: joinedCount + 1,
              nextReward: 500
            });
          }
        } catch (statsError) {
          console.log('Referral stats error:', statsError.message);
        }
        
        // Fetch referral history
        try {
          const historyData = await api.getReferralHistory(1, 50);
          console.log('History API response:', historyData);
          if (historyData && historyData.referrals) {
            const joined = historyData.referrals.filter(r => r.status === 'joined');
            const pending = historyData.referrals.filter(r => r.status === 'pending');
            setInvitedFriends(joined);
            setPendingInvites(pending);
          }
        } catch (historyError) {
          console.log('Referral history error:', historyError.message);
        }
        
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
      
      try {
        await api.shareReferralLink('link_copy');
      } catch (e) {
        console.log('Error tracking copy:', e);
      }
    } catch (err) {
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const shareOnSocial = async (platform) => {
    const text = `Join me on FutsalGhar! Use my referral link to get started: ${referralLink}`;
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
        shareUrl = `mailto:?subject=Join me on FutsalGhar&body=${encodedText}`;
        break;
      default:
        return;
    }
    
    try {
      await api.shareReferralLink(platform);
    } catch (e) {
      console.log('Error tracking share:', e);
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const sendInvite = async (email) => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }
    
    try {
      await api.sendReferralInvite(email, '');
      alert(`Invite sent to ${email}!`);
      
      const emailInput = document.getElementById('friendEmail');
      if (emailInput) emailInput.value = '';
      
      // Refresh stats after sending invite
      const statsData = await api.getReferralStats();
      if (statsData && statsData.stats) {
        const joinedCount = statsData.stats.joinedFriends || 0;
        setReferralStats(prev => ({
          ...prev,
          pendingInvites: statsData.stats.pendingInvites || 0,
          totalInvites: statsData.stats.totalInvites || 0,
          joinedFriends: joinedCount,
          nextMilestone: joinedCount + 1,
          nextReward: 500
        }));
      }
      
      // Refresh history
      const historyData = await api.getReferralHistory(1, 50);
      if (historyData && historyData.referrals) {
        const joined = historyData.referrals.filter(r => r.status === 'joined');
        const pending = historyData.referrals.filter(r => r.status === 'pending');
        setInvitedFriends(joined);
        setPendingInvites(pending);
      }
    } catch (error) {
      alert('Failed to send invite: ' + error.message);
    }
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
              {referralCode && (
                <p className="referral-code-hint">Your code: <strong>{referralCode}</strong></p>
              )}
            </div>

            {/* Quick Share Section */}
            <div className="share-card">
              <h3>Quick Share</h3>
              <div className="share-buttons">
                <button className="share-btn whatsapp" onClick={() => shareOnSocial('whatsapp')}>
                  WhatsApp
                </button>
                <button className="share-btn facebook" onClick={() => shareOnSocial('facebook')}>
                  Facebook
                </button>
                <button className="share-btn twitter" onClick={() => shareOnSocial('twitter')}>
                  Twitter
                </button>
                <button className="share-btn email" onClick={() => shareOnSocial('email')}>
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
                    sendInvite(email);
                  }}
                >
                  Send Invite
                </button>
              </div>
            </div>

            {/* Referral Rewards - Updated to match backend (500 per friend) */}
            <div className="rewards-card">
              <h3>Referral Rewards</h3>
              <div className="rewards-grid">
                <div className="reward-item">
                  <div className="reward-icon-svg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                      <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                  <div className="reward-info">
                    <span className="reward-value">1 friend</span>
                    <span className="reward-label">Rs. 500 wallet credit</span>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon-svg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
                      <path d="M5 20V19C5 15.13 8.13 12 12 12C15.87 12 19 15.13 19 19V20" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                      <path d="M17 2L19 4L23 0" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="reward-info">
                    <span className="reward-value">2 friends</span>
                    <span className="reward-label">Rs. 500 wallet credit</span>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon-svg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  <div className="reward-info">
                    <span className="reward-value">3 friends</span>
                    <span className="reward-label">Rs. 500 wallet credit</span>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon-svg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                      <circle cx="12" cy="12" r="3" fill="#8b5cf6"/>
                    </svg>
                  </div>
                  <div className="reward-info">
                    <span className="reward-value">5+ friends</span>
                    <span className="reward-label">Rs. 500+ wallet credit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Friends List */}
          <div className="invite-right">
            {/* Stats Card */}
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
                <div className="progress-label">Next reward: Invite {referralStats.nextMilestone} friend to earn Rs. {referralStats.nextReward}</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((referralStats.joinedFriends / Math.max(1, referralStats.nextMilestone)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="progress-reward-hint">
                  Invite {Math.max(0, referralStats.nextMilestone - referralStats.joinedFriends)} more friend to earn Rs. {referralStats.nextReward}!
                </div>
              </div>
            </div>

            {/* Invited Friends List */}
            <div className="friends-list-card">
              <h3>Friends Who Joined ({invitedFriends.length})</h3>
              <div className="friends-list">
                {invitedFriends.length > 0 ? (
                  invitedFriends.map((friend, index) => (
                    <div key={friend._id || index} className="friend-item joined">
                      <div className="friend-avatar">
                        {(friend.referredUser?.username || friend.referredEmail || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-info">
                        <div className="friend-name">{friend.referredUser?.fullName || friend.referredUser?.username || 'User'}</div>
                        <div className="friend-email">{friend.referredEmail || friend.referredUser?.email || 'No email'}</div>
                        {friend.joinedAt && (
                          <div className="friend-date">Joined: {new Date(friend.joinedAt).toLocaleDateString()}</div>
                        )}
                      </div>
                      <div className="friend-badge joined-badge">✓ Joined</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-friends-message">
                    <p>No friends have joined yet. Share your referral link!</p>
                  </div>
                )}
              </div>
              
              <h3 className="pending-title">Pending Invites ({pendingInvites.length})</h3>
              <div className="friends-list">
                {pendingInvites.length > 0 ? (
                  pendingInvites.map((invite, index) => (
                    <div key={invite._id || index} className="friend-item pending">
                      <div className="friend-avatar pending-avatar">
                        {(invite.referredEmail || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-info">
                        <div className="friend-name">Invited via {invite.sharedVia || 'link'}</div>
                        <div className="friend-email">{invite.referredEmail || 'Email sent'}</div>
                        <div className="friend-date">Sent: {new Date(invite.createdAt).toLocaleDateString()}</div>
                      </div>
                      <button 
                        className="remind-btn"
                        onClick={() => sendInvite(invite.referredEmail)}
                      >
                        Remind
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-friends-message">
                    <p>No pending invites. Send some invites to your friends!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invite Tips */}
            <div className="tips-card">
              <h3>Tips for Better Invites</h3>
              <ul className="tips-list">
                <li>Share your personal experience with FutsalGhar</li>
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