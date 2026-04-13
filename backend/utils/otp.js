// backend/utils/otp.js - NEW FILE
const crypto = require('crypto');

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Store OTP with email and expiry (5 minutes)
const storeOTP = (email) => {
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  otpStore.set(email, { otp, expiresAt });
  
  // Auto cleanup after 5 minutes
  setTimeout(() => {
    if (otpStore.get(email)?.expiresAt === expiresAt) {
      otpStore.delete(email);
    }
  }, 5 * 60 * 1000);
  
  return otp;
};

// Verify OTP
const verifyOTP = (email, enteredOtp) => {
  const record = otpStore.get(email);
  if (!record) return false;
  if (record.expiresAt < Date.now()) return false;
  if (record.otp !== enteredOtp) return false;
  
  otpStore.delete(email); // Remove after successful verification
  return true;
};

module.exports = { storeOTP, verifyOTP };