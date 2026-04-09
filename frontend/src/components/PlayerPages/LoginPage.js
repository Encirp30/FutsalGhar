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
      
      // Store token
      setAuthToken(response.token);
      
      // Extract name dynamically based on backend structure
      const userToSave = {
        ...response.user,
        username: response.user?.profile?.fullName || response.user?.username || formData.username || 'User'
      };
      
      localStorage.setItem('futsalUser', JSON.stringify(userToSave));
      
      // Navigate based on role
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
      <div className="login-container">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Enter your details to access the pitch.</p>
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
              className={errors.username ? 'input-error' : ''}
              disabled={isSubmitting}
            />
            {errors.username && (
              <div className="error-text">{errors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={errors.password ? 'input-error' : ''}
                disabled={isSubmitting}
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && (
              <div className="error-text">{errors.password}</div>
            )}
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
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
          Don't have an account? 
          <button 
            onClick={goToRegister}
            className="create-link"
            disabled={isSubmitting}
          >
            Create Account
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
          <p style={{ margin: '0', color: '#64748b' }}>Demo Credentials:</p>
          <p style={{ margin: '5px 0 0 0', color: '#3b82f6' }}>User: test@test.com / 123456</p>
          <p style={{ margin: '2px 0', color: '#f59e0b' }}>Manager: manager / manager123</p>
          <p style={{ margin: '2px 0', color: '#ef4444' }}>Admin: admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;