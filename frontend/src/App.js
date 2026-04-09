import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';

// Player Pages
import LoginPage from './components/PlayerPages/LoginPage';
import RegisterPage from './components/PlayerPages/RegisterPage';
import Dashboard from './components/PlayerPages/Dashboard';
import BookCourt from './components/PlayerPages/BookCourt';
import MyBookings from './components/PlayerPages/MyBookings';
import CreateTeam from './components/PlayerPages/CreateTeam';
import ManageTeam from './components/PlayerPages/ManageTeam';
import ManageMyTeams from './components/PlayerPages/ManageMyTeams'; // The new Hub page
import Profile from './components/PlayerPages/Profile';
import InviteFriends from './components/PlayerPages/InviteFriends';
import Tournaments from './components/PlayerPages/Tournaments';
import TournamentCreate from './components/ManagerPages/TournamentCreate';
import Matches from './components/PlayerPages/Matches';
import TeamsList from './components/PlayerPages/TeamsList';

// Manager Pages
import ManagerDashboard from './components/ManagerPages/ManagerDashboard';
import ManagerCourts from './components/ManagerPages/ManagerCourts';
import ManagerTeams from './components/ManagerPages/ManagerTeams';
import ManagerPlayers from './components/ManagerPages/ManagerPlayers';
import AdminPanel from './components/AdminPanel';
import ManagerProfile from './components/ManagerPages/ManagerProfile';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Redirect root path to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Auth routes (public) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Player routes (protected) */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/book-court" element={<ProtectedRoute><BookCourt /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/create-team" element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
          
          {/* TEAM MANAGEMENT ROUTES - Matches Header handleNavClick */}
          <Route path="/manage-my-teams" element={<ProtectedRoute><ManageMyTeams /></ProtectedRoute>} />
          <Route path="/manage-team/:id" element={<ProtectedRoute><ManageTeam /></ProtectedRoute>} />
          
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/invite-friends" element={<ProtectedRoute><InviteFriends /></ProtectedRoute>} />
          <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
          
          {/* Tournament Routes */}
          <Route path="/create-tournament" element={<ProtectedRoute><TournamentCreate /></ProtectedRoute>} />
          <Route path="/tournament-create" element={<ProtectedRoute><TournamentCreate /></ProtectedRoute>} />
          
          <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
          <Route path="/teams-list" element={<ProtectedRoute><TeamsList /></ProtectedRoute>} />
          
          {/* Manager routes (protected) */}
          <Route path="/manager-dashboard" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/manager-courts" element={<ProtectedRoute><ManagerCourts /></ProtectedRoute>} />
          <Route path="/manager-teams" element={<ProtectedRoute><ManagerTeams /></ProtectedRoute>} />
          <Route path="/manager-players" element={<ProtectedRoute><ManagerPlayers /></ProtectedRoute>} />
          <Route path="/manager-profile" element={<ProtectedRoute><ManagerProfile /></ProtectedRoute>} />
          
          {/* Admin routes (protected) */}
          <Route path="/admin-panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          
          {/* 404 fallback route - This is what causes logout if a route is missing */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;