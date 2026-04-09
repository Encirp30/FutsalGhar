# Frontend Integration Guide

This guide explains how to connect your existing React frontend to the newly built Node.js/Express backend.

## 🔌 Backend Connection Setup

### 1. Configure API Base URL

Create a new file `src/config/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    GET_CURRENT_USER: `${API_BASE_URL}/auth/me`,
    UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  },
  
  // Courts
  COURTS: {
    GET_ALL: `${API_BASE_URL}/courts`,
    GET_BY_ID: (id) => `${API_BASE_URL}/courts/${id}`,
    CREATE: `${API_BASE_URL}/courts`,
    UPDATE: (id) => `${API_BASE_URL}/courts/${id}`,
    GET_MANAGER_COURTS: `${API_BASE_URL}/courts/manager/courts`,
    BLOCK_SLOT: (id) => `${API_BASE_URL}/courts/${id}/block-slot`,
  },

  // Bookings
  BOOKINGS: {
    CREATE: `${API_BASE_URL}/bookings`,
    GET_MY_BOOKINGS: `${API_BASE_URL}/bookings/my-bookings`,
    GET_BY_ID: (id) => `${API_BASE_URL}/bookings/${id}`,
    CANCEL: (id) => `${API_BASE_URL}/bookings/${id}/cancel`,
    RESCHEDULE: (id) => `${API_BASE_URL}/bookings/${id}/reschedule`,
    ADD_REVIEW: (id) => `${API_BASE_URL}/bookings/${id}/review`,
  },

  // Teams
  TEAMS: {
    GET_ALL: `${API_BASE_URL}/teams`,
    GET_BY_ID: (id) => `${API_BASE_URL}/teams/${id}`,
    CREATE: `${API_BASE_URL}/teams`,
    GET_MY_TEAMS: `${API_BASE_URL}/teams/user/teams`,
    SEND_JOIN_REQUEST: (id) => `${API_BASE_URL}/teams/${id}/join-request`,
    APPROVE_REQUEST: (teamId, requestId) => `${API_BASE_URL}/teams/${teamId}/approve-request/${requestId}`,
    REJECT_REQUEST: (teamId, requestId) => `${API_BASE_URL}/teams/${teamId}/reject-request/${requestId}`,
    UPDATE: (id) => `${API_BASE_URL}/teams/${id}`,
    REMOVE_PLAYER: (teamId, playerId) => `${API_BASE_URL}/teams/${teamId}/remove-player/${playerId}`,
    LEAVE_TEAM: (id) => `${API_BASE_URL}/teams/${id}/leave`,
  },

  // Tournaments
  TOURNAMENTS: {
    GET_ALL: `${API_BASE_URL}/tournaments`,
    GET_BY_ID: (id) => `${API_BASE_URL}/tournaments/${id}`,
    CREATE: `${API_BASE_URL}/tournaments`,
    REGISTER_TEAM: (id) => `${API_BASE_URL}/tournaments/${id}/register`,
    GET_TEAM_TOURNAMENTS: `${API_BASE_URL}/tournaments/team/tournaments`,
  },

  // Matches
  MATCHES: {
    GET_ALL: `${API_BASE_URL}/matches`,
    GET_BY_ID: (id) => `${API_BASE_URL}/matches/${id}`,
    GET_TEAM_MATCHES: `${API_BASE_URL}/matches/team/matches`,
    GET_PLAYER_STATS: `${API_BASE_URL}/matches/player/statistics`,
    CREATE: `${API_BASE_URL}/matches`,
    UPDATE_RESULT: (id) => `${API_BASE_URL}/matches/${id}/result`,
  },

  // Challenges
  CHALLENGES: {
    CREATE: `${API_BASE_URL}/challenges`,
    GET_INCOMING: `${API_BASE_URL}/challenges/incoming`,
    GET_OUTGOING: `${API_BASE_URL}/challenges/outgoing`,
    ACCEPT: (id) => `${API_BASE_URL}/challenges/${id}/accept`,
    REJECT: (id) => `${API_BASE_URL}/challenges/${id}/reject`,
    CANCEL: (id) => `${API_BASE_URL}/challenges/${id}/cancel`,
    PROPOSE_DATES: (id) => `${API_BASE_URL}/challenges/${id}/propose-dates`,
  },

  // Referrals
  REFERRALS: {
    GET_LINK: `${API_BASE_URL}/referrals/link`,
    SEND_INVITE: `${API_BASE_URL}/referrals/send-invite`,
    SHARE: `${API_BASE_URL}/referrals/share`,
    GET_STATS: `${API_BASE_URL}/referrals/stats`,
    GET_HISTORY: `${API_BASE_URL}/referrals/history`,
    VERIFY: `${API_BASE_URL}/referrals/verify`,
  },

  // Users
  USERS: {
    GET_DASHBOARD: `${API_BASE_URL}/users/dashboard`,
    GET_NOTIFICATIONS: `${API_BASE_URL}/users/notifications`,
    MARK_READ: (id) => `${API_BASE_URL}/users/notifications/${id}/read`,
    GET_STATISTICS: `${API_BASE_URL}/users/statistics`,
    GET_UPCOMING_MATCHES: `${API_BASE_URL}/users/upcoming-matches`,
    GET_BOOKING_TRENDS: `${API_BASE_URL}/users/booking-trends`,
  },

  // Manager
  MANAGER: {
    GET_BOOKINGS: `${API_BASE_URL}/manager/bookings`,
    CONFIRM_BOOKING: (id) => `${API_BASE_URL}/manager/bookings/${id}/confirm`,
    COMPLETE_BOOKING: (id) => `${API_BASE_URL}/manager/bookings/${id}/complete`,
    GET_REVENUE: `${API_BASE_URL}/manager/revenue`,
    GET_WALLET: `${API_BASE_URL}/manager/wallet`,
    REQUEST_WITHDRAWAL: `${API_BASE_URL}/manager/withdrawal-request`,
    GET_WITHDRAWALS: `${API_BASE_URL}/manager/withdrawals`,
    GET_TRANSACTIONS: `${API_BASE_URL}/manager/transactions`,
    GET_UTILIZATION: `${API_BASE_URL}/manager/court-utilization`,
  },

  // Admin
  ADMIN: {
    GET_USERS: `${API_BASE_URL}/admin/users`,
    UPDATE_USER_ROLE: (id) => `${API_BASE_URL}/admin/users/${id}/role`,
    DISABLE_USER: (id) => `${API_BASE_URL}/admin/users/${id}/disable`,
    ENABLE_USER: (id) => `${API_BASE_URL}/admin/users/${id}/enable`,
    GET_COURTS: `${API_BASE_URL}/admin/courts`,
    DELETE_COURT: (id) => `${API_BASE_URL}/admin/courts/${id}`,
    ASSIGN_COURT: `${API_BASE_URL}/admin/courts/assign`,
    GET_STATISTICS: `${API_BASE_URL}/admin/statistics`,
    GET_TRANSACTIONS: `${API_BASE_URL}/admin/transactions`,
    GET_WITHDRAWALS: `${API_BASE_URL}/admin/withdrawals`,
    APPROVE_WITHDRAWAL: (id) => `${API_BASE_URL}/admin/withdrawals/${id}/approve`,
    REJECT_WITHDRAWAL: (id) => `${API_BASE_URL}/admin/withdrawals/${id}/reject`,
    GET_REVENUE_REPORT: `${API_BASE_URL}/admin/revenue-report`,
  },
};

export default API_BASE_URL;
```

### 2. Create API Service Module

Create `src/services/api.js`:

```javascript
import API_BASE_URL from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Set auth token
  setAuthToken(token) {
    localStorage.setItem('token', token);
  }

  // Remove auth token
  removeAuthToken() {
    localStorage.removeItem('token');
  }

  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API Error');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT request
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE request
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();
```

### 3. Create Authentication Context

Create `src/context/AuthContext.js`:

```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = apiService.getAuthToken();
      if (token) {
        try {
          const response = await apiService.get('/auth/me');
          setUser(response.user);
        } catch (error) {
          apiService.removeAuthToken();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Register
  const register = async (fullName, email, password, confirmPassword) => {
    const response = await apiService.post('/auth/register', {
      fullName,
      email,
      password,
      confirmPassword,
    });
    apiService.setAuthToken(response.token);
    setUser(response.user);
    return response;
  };

  // Login
  const login = async (email, password) => {
    const response = await apiService.post('/auth/login', { email, password });
    apiService.setAuthToken(response.token);
    setUser(response.user);
    return response;
  };

  // Logout
  const logout = () => {
    apiService.removeAuthToken();
    setUser(null);
  };

  // Update profile
  const updateProfile = async (updates) => {
    const response = await apiService.put('/auth/profile', updates);
    setUser(response.user);
    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 4. Update Login Component

Example: `src/components/PlayerPages/LoginPage.js`

```javascript
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        // ... form fields ...
      </form>
    </div>
  );
};

export default LoginPage;
```

### 5. Update Court Booking Component

Example: `src/components/PlayerPages/BookCourt.js`

```javascript
import React, { useState, useEffect } from 'react';
import apiService, { API_ENDPOINTS } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BookCourt = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch courts on component mount
  useEffect(() => {
    const fetchCourts = async () => {
      setLoading(true);
      try {
        const response = await apiService.get('/courts?page=1&limit=10');
        setCourts(response.data);
      } catch (error) {
        console.error('Error fetching courts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourts();
  }, []);

  // Create booking
  const handleBooking = async (courtId, date, startTime, endTime) => {
    if (!isAuthenticated) {
      alert('Please login to book a court');
      return;
    }

    try {
      const response = await apiService.post('/bookings', {
        courtId,
        date,
        startTime,
        endTime,
        paymentMethod: 'wallet',
      });
      alert('Booking successful!');
      // Redirect to bookings page
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="book-court">
      {/* Courts list and booking form */}
    </div>
  );
};

export default BookCourt;
```

### 6. Update Team Management Component

```javascript
import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TeamsList = () => {
  const [teams, setTeams] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      // Get public teams
      const publicResponse = await apiService.get('/teams?page=1&limit=10');
      setTeams(publicResponse.teams);

      // Get user's teams
      const myTeamsResponse = await apiService.get('/teams/user/teams');
      setUserTeams(myTeamsResponse.teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (teamId, message) => {
    try {
      await apiService.post(`/teams/${teamId}/join-request`, { message });
      alert('Join request sent!');
      fetchTeams();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="teams-list">
      {/* Teams display */}
    </div>
  );
};

export default TeamsList;
```

## 📝 Step-by-Step Migration Checklist

- [ ] Install required dependencies
- [ ] Create API configuration file
- [ ] Create API service module
- [ ] Set up Auth context/state management
- [ ] Update all API calls to use new service
- [ ] Remove localStorage operations (handled by service)
- [ ] Test all authentication flows
- [ ] Test all CRUD operations
- [ ] Handle error messages from backend
- [ ] Add loading states
- [ ] Test role-based access
- [ ] Verify token expiration handling

## 🔑 Key Integration Points

### 1. Login/Register Flow
- Capture credentials from form
- Call `apiService.post('/auth/login', credentials)`
- Store returned token automatically
- Redirect to dashboard

### 2. Protected Routes
- Check `isAuthenticated` from Auth context
- Redirect to login if not authenticated
- Include token automatically in all API calls

### 3. User Dashboard
- Fetch data from `/users/dashboard`
- Display user statistics and recent bookings
- Update in real-time or on interval

### 4. Error Handling
- Catch errors from `apiService.request()`
- Display user-friendly error messages
- Handle 401 (unauthorized) errors with logout

## 🚀 Environment Configuration

Update or create `.env.local` file:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_JWT_STORAGE_KEY=token
```

## 📱 Testing the Integration

1. **Start backend**: `npm run dev` in backend folder
2. **Start frontend**: `npm start` in frontend folder
3. **Test login**: Try registering and logging in
4. **Test bookings**: Create a booking and verify in backend
5. **Test teams**: Create a team and verify in backend
6. **Check notifications**: Should appear in real-time

## 🐛 Troubleshooting

### CORS Errors
- Backend CORS is configured for `localhost:3000`
- If using different port, update `.env` FRONTEND_URL

### Token Not Persisting
- Check localStorage in DevTools
- Verify `setAuthToken()` is called after login

### API Not Responding
- Ensure backend is running on port 5000
- Check browser console for network errors
- Verify API endpoints match documentation

### 401 Unauthorized Errors
- Token might be expired
- Try logging in again
- Check Authorization header format

## ✅ Verification Checklist

- ✅ Backend running on `http://localhost:5000`
- ✅ Frontend can reach backend API
- ✅ Login/Register working
- ✅ JWT token stored in localStorage
- ✅ Authorization header included in API calls
- ✅ Bookings can be created
- ✅ Teams can be created
- ✅ Notifications display correctly
- ✅ Admin/Manager routes protected
- ✅ Error messages display properly

## 📚 Additional Resources

- Full API documentation: See `backend/API_DOCUMENTATION.md`
- Backend README: See `backend/README.md`
- Example frontend integration in this file above

---

The backend is now ready for integration! All endpoints are functional and documented. Start with authentication, then move to other features. Good luck! 🚀
