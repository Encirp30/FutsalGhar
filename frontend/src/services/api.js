const API_URL = 'http://localhost:5000/api';

// ================= TOKEN =================
export const setAuthToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

// ================= FETCH with cache prevention =================
export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add timestamp to URL to prevent caching
  const timestamp = Date.now();
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_URL}${endpoint}${separator}_t=${timestamp}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

// ================= API =================
export const api = {
  // --- Auth ---
  register: (userData) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  login: (credentials) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  getMe: () => apiFetch('/auth/me'),

  // --- Profile Update ---
  updateProfile: (data) =>
    apiFetch('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // --- Avatar ---
  uploadAvatar: (id, formData) => {
    return fetch(`${API_URL}/users/${id}/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        'Cache-Control': 'no-cache',
      },
      body: formData,
    }).then((res) => res.json());
  },

  // --- Bookings ---
  getBookings: (page = 1, limit = 4, status = 'all') => 
    apiFetch(`/bookings/my-bookings?page=${page}&limit=${limit}&status=${status}`),
  
  getBooking: (id) => apiFetch(`/bookings/${id}`),

  createBooking: (data) =>
    apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),

  rescheduleBooking: (id, data) =>
    apiFetch(`/bookings/${id}/reschedule`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),

  getBookedSlots: (courtId, date) =>
    apiFetch(`/bookings/booked-slots?courtId=${courtId}&date=${date}`),

  cancelBooking: (id, reason = "Cancelled by user") =>
    apiFetch(`/bookings/${id}/cancel`, { 
      method: 'PUT', 
      body: JSON.stringify({ reason }) 
    }),

  addReview: (id, review) =>
    apiFetch(`/bookings/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    }),

  // --- Courts ---
  getCourts: () => apiFetch('/courts'),
  getCourt: (id) => apiFetch(`/courts/${id}`),
  getCourtAvailability: (id, date) =>
    apiFetch(`/courts/${id}/availability?date=${date}`),

  createCourt: (courtData) =>
    apiFetch('/courts', { method: 'POST', body: JSON.stringify(courtData) }),

  updateCourt: (id, courtData) =>
    apiFetch(`/courts/${id}`, { method: 'PUT', body: JSON.stringify(courtData) }),

  deleteCourt: (id) =>
    apiFetch(`/courts/${id}`, { method: 'DELETE' }),

  // --- Teams ---
  getTeams: () => apiFetch('/teams'),
  getTeam: (id) => apiFetch(`/teams/${id}`),
  createTeam: (data) =>
    apiFetch('/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id, data) =>
    apiFetch(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTeamRoster: (id, playerUpdate) =>
    apiFetch(`/teams/${id}/roster`, { method: 'PUT', body: JSON.stringify(playerUpdate) }),
  removePlayer: (teamId, playerIndex) =>
    apiFetch(`/teams/${teamId}/remove-player/${playerIndex}`, { method: 'PUT' }),
  deleteTeam: (id) =>
    apiFetch(`/teams/${id}`, { method: 'DELETE' }),
  requestJoinTeam: (teamId, message) =>
    apiFetch(`/teams/${teamId}/join-request`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Approve join request
  approveJoinRequest: (teamId, requestId) =>
    apiFetch(`/teams/${teamId}/join-request/${requestId}/approve`, {
      method: 'PUT',
    }),

  // Reject join request
  rejectJoinRequest: (teamId, requestId) =>
    apiFetch(`/teams/${teamId}/join-request/${requestId}/reject`, {
      method: 'PUT',
    }),

  // Get user by ID (for viewing player profiles)
  getUserById: (userId) => apiFetch(`/users/${userId}`),

  getUserTeams: async () => {
    try {
      return await apiFetch('/teams/user/teams');
    } catch (error) {
      console.error('Error fetching user teams:', error);
      return { data: [], teams: [], success: true };
    }
  },

  // --- Tournaments ---
  getTournaments: () => apiFetch('/tournaments'),
  getTournament: (id) => apiFetch(`/tournaments/${id}`),
  createTournament: (data) =>
    apiFetch('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  registerForTournament: (id, teamId) =>
    apiFetch(`/tournaments/${id}/register`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    }),

  // --- Matches ---
  getMatches: () => apiFetch('/matches'),
  getMatch: (id) => apiFetch(`/matches/${id}`),

  // --- Challenges ---
  getChallenges: () => apiFetch('/challenges'),
  createChallenge: (data) =>
    apiFetch('/challenges', { method: 'POST', body: JSON.stringify(data) }),
  respondToChallenge: (id, status) =>
    apiFetch(`/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // --- Matchmaking ---
  requestMatchmaking: (data) =>
    apiFetch('/matchmaking/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMatchmakingSuggestions: () =>
    apiFetch('/matchmaking/suggestions'),

  // --- Notifications ---
  getNotifications: () => apiFetch('/notifications'),
  markNotificationRead: (id) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
  
  markAllNotificationsRead: () => apiFetch('/notifications/mark-all-read', { method: 'PUT' }),

  // --- Dashboard ---
  getPlayerStats: () => apiFetch('/dashboard/player/stats'),
  getManagerStats: () => apiFetch('/dashboard/manager/stats'),
  getAdminStats: () => apiFetch('/dashboard/admin/stats'),

  // --- Referrals ---
  // FIXED: Changed from '/users/referral/stats' to '/referrals/stats'
  getReferralStats: () => apiFetch('/referrals/stats'),
};