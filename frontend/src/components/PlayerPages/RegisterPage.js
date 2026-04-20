import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setAuthToken } from '../../services/api';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get referral code from URL
  const getReferralCodeFromUrl = () => {
    const params = new URLSearchParams(location.search);
    return params.get('ref');
  };

  // State for form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // State for error messages
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
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
    
    // Reset OTP state if email changes
    if (name === 'email') {
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
      setOtpVerified(false);
      setErrors(prev => ({ ...prev, otp: '' }));
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

  // Validate ONLY email for sending OTP
  const validateEmailOnly = () => {
    let isValid = true;

    if (!formData.email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      isValid = false;
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }

    return isValid;
  };

  // Validate ALL form fields for final submission
  const validateAllFields = () => {
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

    // OTP verification check
    if (!otpVerified) {
      newErrors.otp = 'Please verify your email with OTP first';
      isValid = false;
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };

  // Send OTP to email (validate ONLY email)
  const handleSendOTP = async () => {
    // Only validate email
    if (!validateEmailOnly()) {
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    setErrors(prev => ({ ...prev, otp: '' }));
    
    try {
      await api.sendOTP(formData.email);
      setOtpSent(true);
    } catch (error) {
      setErrors(prev => ({ ...prev, email: error.message || 'Failed to send OTP. Please try again.' }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP (validate ONLY OTP code)
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 4) {
      setErrors(prev => ({ ...prev, otp: 'Please enter a valid 4-digit OTP' }));
      return;
    }

    setIsVerifying(true);
    setErrors(prev => ({ ...prev, otp: '' }));
    
    try {
      await api.verifyOTP(formData.email, otpCode);
      setOtpVerified(true);
      setErrors(prev => ({ ...prev, otp: '' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, otp: error.message || 'Invalid or expired OTP' }));
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle final registration (validate ALL fields)
  const handleFinalSubmit = async () => {
    // Validate all fields including OTP verification
    if (!validateAllFields()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const referralCode = getReferralCodeFromUrl();
      
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };
      
      // Add referral code if present
      if (referralCode) {
        userData.referralCode = referralCode;
      }
      
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
        otp: '',
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
      setIsSubmitting(false);
    }
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
          
          <form onSubmit={(e) => e.preventDefault()} noValidate>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting || otpVerified}
                  style={{ flex: 1 }}
                />
                {!otpSent && !otpVerified ? (
                  <button
                    type="button"
                    className="send-otp-btn"
                    onClick={handleSendOTP}
                    disabled={isSendingOtp || isSubmitting}
                  >
                    {isSendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                ) : otpVerified ? (
                  <span className="otp-verified-badge">✓ Email Verified</span>
                ) : (
                  <span className="otp-sent-badge">✓ OTP Sent</span>
                )}
              </div>
              {errors.email && (
                <div className="error-text">{errors.email}</div>
              )}
            </div>

            {/* OTP Verification Section */}
            {otpSent && !otpVerified && (
              <div className="input-group otp-section">
                <label className="input-label">Enter OTP</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Enter 4-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.slice(0, 4))}
                    className="form-input"
                    maxLength="4"
                    disabled={isVerifying || isSubmitting}
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }}
                  />
                  <button
                    type="button"
                    className="verify-otp-btn"
                    onClick={handleVerifyOTP}
                    disabled={isVerifying || isSubmitting || otpCode.length !== 4}
                  >
                    {isVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {errors.otp && (
                  <div className="error-text">{errors.otp}</div>
                )}
                <div className="otp-hint">
                  Enter the 4-digit code sent to your email. Valid for 5 minutes.
                </div>
              </div>
            )}

            {/* Show success message when verified */}
            {otpVerified && (
              <div className="otp-success-message">
                ✓ Email verified successfully! You can now create your account.
              </div>
            )}

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

            {/* SUBMIT BUTTON - Only validates all fields on click */}
            <button 
              type="button"
              className="submit-btn"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Submit'}
            </button>
            
            <div className="register-note">
              By clicking "Submit", you agree to our Terms of Service and Privacy Policy.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;