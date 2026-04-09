const validator = require('validator');

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  // Password must be at least 6 characters
  return password && password.length >= 6;
};

const validatePhoneNumber = (phone) => {
  // Simple phone number validation (can be enhanced)
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
};

const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

const validateTimeFormat = (time) => {
  // Validate HH:MM format
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

const validateDateRange = (startDate, endDate) => {
  return new Date(startDate) < new Date(endDate);
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateCoordinates,
  validateTimeFormat,
  validateDateRange
};
