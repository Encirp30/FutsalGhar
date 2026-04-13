import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../../services/api';
import './LoginPage.css';

const Login = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({
    username: '',
    password: '',
    form: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.username.trim()) {
      newErrors.username = 'Please enter your username';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const credentials = {
        username: formData.username,
        password: formData.password
      };
      
      const response = await api.login(credentials);
      
      setAuthToken(response.token);
      
      const userToSave = {
        ...response.user,
        username: response.user?.profile?.fullName || response.user?.username || formData.username || 'User'
      };
      
      localStorage.setItem('futsalUser', JSON.stringify(userToSave));
      
      const role = response.user?.role;
      if (role === 'admin') {
        navigate('/admin-panel');
      } else if (role === 'manager') {
        navigate('/manager-dashboard');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      setErrors(prev => ({
        ...prev,
        form: error.message || 'Invalid username or password'
      }));
    }
    
    setIsSubmitting(false);
  };

  const goToRegister = () => {
    navigate('/register');
  };

  const isSuccessMessage = errors.form && errors.form.includes('successfully');

  return (
    <div className="login-page">
      <div className="login-grid">
        {/* Left Side - Branding Section */}
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h1 className="brand-title">FutsalGhar</h1>
            <p className="brand-tagline">Your Ultimate Futsal Platform</p>
            <div className="brand-features">
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Book Courts Instantly</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Join Tournaments</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Track Team Stats</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Connect with Players</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-container">
          <div className="login-form-wrapper">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {errors.form && (
              <div className={`form-message ${isSuccessMessage ? 'success' : 'error'}`}>
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className={`username-input ${errors.username ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.username && (
                  <div className="error-text">{errors.username}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={`password-input ${errors.password ? 'input-error' : ''}`}
                    disabled={isSubmitting}
                  />
                  <button 
                    type="button"
                    className="eye-btn"
                    onClick={togglePasswordVisibility}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="error-text">{errors.password}</div>
                )}
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="signin-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="create-account">
              <p>Don't have an account?</p>
              <button 
                onClick={goToRegister}
                className="create-link"
                disabled={isSubmitting}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;