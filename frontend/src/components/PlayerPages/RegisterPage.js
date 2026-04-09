import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../../services/api';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // State for error messages
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    form: ''
  });

  // State for UI controls
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  // Get password strength text
  const getStrengthText = (strength) => {
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return levels[strength] || 'Very Weak';
  };

  // Get password strength color
  const getStrengthColor = (strength) => {
    if (strength === 0) return '#e2e8f0';
    if (strength === 1) return '#ef4444';
    if (strength === 2) return '#f59e0b';
    if (strength === 3) return '#3b82f6';
    return '#10b981';
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    if (errors.form) {
      setErrors(prev => ({ ...prev, form: '' }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
      isValid = false;
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
      isValid = false;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };
      
      const response = await api.register(userData);
      
      // Store token if provided
      if (response.token) {
        setAuthToken(response.token);
      }
      
      setErrors({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        form: 'Registration successful! Redirecting to dashboard...'
      });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        form: error.message || 'Registration failed. Please try again.'
      }));
    }
    
    setIsSubmitting(false);
  };

  // Navigate to login page
  const goToLogin = () => {
    navigate('/login');
  };

  const passwordsMatch = formData.password && formData.confirmPassword && 
                        formData.password === formData.confirmPassword;

  return (
    <div className="register-container">
      <div className="left-section">
        <h1 className="main-title">Join the league of champions.</h1>
        <p className="subtitle">
          Manage your team, track stats, and find matches easily.
        </p>
        
        <div className="stars">
          ★ ★ ★ ★ ★
        </div>
        
        <div className="testimonial">
          <p className="quote">
            "The best platform for organizing our weekend matches. Simple and effective."
          </p>
        </div>
      </div>

      <div className="right-section">
        <div className="form-container">
          <h2 className="form-title">Create your account</h2>
          
          {errors.form && (
            <div className={`form-message ${errors.form.includes('successful') ? 'success' : 'error'}`}>
              {errors.form}
            </div>
          )}
          
          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                className={`form-input ${errors.username ? 'input-error' : ''}`}
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.username && (
                <div className="error-text">{errors.username}</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.email && (
                <div className="error-text">{errors.email}</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
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
              
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${(passwordStrength / 4) * 100}%`,
                        backgroundColor: getStrengthColor(passwordStrength)
                      }}
                    />
                  </div>
                  <span className="strength-text">
                    Strength: {getStrengthText(passwordStrength)}
                  </span>
                  <div className="password-requirements">
                    Requirements: 6+ characters, 1 uppercase letter, 1 number
                  </div>
                </div>
              )}
              
              {errors.password && (
                <div className="error-text">{errors.password}</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={isSubmitting}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {passwordsMatch && (
                <div className="success-text">Passwords match</div>
              )}
              
              {errors.confirmPassword && (
                <div className="error-text">{errors.confirmPassword}</div>
              )}
            </div>

            <div className="login-prompt">
              Already have an account? 
              <button 
                type="button"
                onClick={goToLogin}
                className="login-link"
                disabled={isSubmitting}
              >
                Log In
              </button>
            </div>

            <div className="divider"></div>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;