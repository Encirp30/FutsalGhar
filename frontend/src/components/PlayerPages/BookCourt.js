import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import './BookCourt.css';
import Layout from '../Layout';

const BookCourt = () => {
  const navigate = useNavigate();
  
  const [bookingData, setBookingData] = useState({
    selectedDate: null,
    selectedCourt: null,
    selectedTime: null,
    bookingNotes: ''
  });

  const [errors, setErrors] = useState({
    date: '',
    court: '',
    time: '',
    form: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); 
  const [availableDates, setAvailableDates] = useState([]);
  const [courts, setCourts] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);

  // Generate slots: using HH:mm format for backend compatibility
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
      const timeString = hour < 10 ? `0${hour}:00` : `${hour}:00`;
      const displayTime = hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
      slots.push({
        id: hour,
        time: timeString,
        display: displayTime,
        available: true, 
        hour24: hour
      });
    }
    return slots;
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        id: i,
        date: new Date(date),
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        available: true
      });
    }
    return dates;
  };

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }
        const courtsData = await api.getCourts();
        setCourts(courtsData.data || []);
      } catch (error) {
        console.error('Error fetching courts:', error);
        setCourts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourts();
    setTimeSlots(generateTimeSlots());
    setAvailableDates(generateDates());
    
    const dates = generateDates();
    if (dates.length > 0) {
      setBookingData(prev => ({ ...prev, selectedDate: dates[0] }));
    }
  }, [navigate]);

  // Fetch booked slots when date or court changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!bookingData.selectedDate || !bookingData.selectedCourt) {
        setBookedSlots([]);
        return;
      }

      try {
        const dateStr = bookingData.selectedDate.date.toISOString().split('T')[0];
        const courtId = bookingData.selectedCourt._id || bookingData.selectedCourt.id;
        
        const response = await api.getBookedSlots(courtId, dateStr);
        if (response.success && response.bookedSlots) {
          setBookedSlots(response.bookedSlots);
        }
      } catch (error) {
        console.error('Error fetching booked slots:', error);
        setBookedSlots([]);
      }
    };

    fetchBookedSlots();
  }, [bookingData.selectedDate, bookingData.selectedCourt]);

  const handleDateSelect = (date) => {
    setBookingData(prev => ({ ...prev, selectedDate: date }));
    setErrors(prev => ({ ...prev, date: '' }));
  };

  const handleCourtSelect = (court) => {
    setBookingData(prev => ({ ...prev, selectedCourt: court }));
    setErrors(prev => ({ ...prev, court: '' }));
  };

  const handleTimeSelect = (time) => {
    setBookingData(prev => ({ ...prev, selectedTime: time }));
    setErrors(prev => ({ ...prev, time: '' }));
  };

  const handleNotesChange = (e) => {
    setBookingData(prev => ({ ...prev, bookingNotes: e.target.value }));
  };

  const validateStep = (step) => {
    if (step === 1 && !bookingData.selectedDate) {
      setErrors(prev => ({ ...prev, date: 'Please select a date' }));
      return false;
    }
    if (step === 2 && !bookingData.selectedCourt) {
      setErrors(prev => ({ ...prev, court: 'Please select a court' }));
      return false;
    }
    if (step === 3 && !bookingData.selectedTime) {
      setErrors(prev => ({ ...prev, time: 'Please select a time slot' }));
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, form: '' }));
    
    try {
      const courtId = bookingData.selectedCourt?._id || bookingData.selectedCourt?.id;
      
      // Auto-calculate 1 hour duration for backend requirement
      const startHour = bookingData.selectedTime.hour24;
      const endHour = startHour + 1;
      const endTime = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;

      const bookingPayload = {
        courtId: courtId, 
        date: bookingData.selectedDate.date.toISOString().split('T')[0],
        startTime: bookingData.selectedTime.time,
        endTime: endTime,
        paymentMethod: 'cash', // Hardcoded for now until Khalti is added
        notes: bookingData.bookingNotes
      };
      
      await api.createBooking(bookingPayload);
      
      setErrors({
        date: '', court: '', time: '',
        form: `Booking confirmed! ${bookingData.selectedCourt.name} at ${bookingData.selectedTime.display}`
      });
      
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/my-bookings');
      }, 2000);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        form: error.response?.data?.message || error.message || 'Failed to create booking.'
      }));
    } finally {
        setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return bookingData.selectedCourt ? bookingData.selectedCourt.pricePerHour : 0;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.date.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  // Check if a time slot is already booked
  const isTimeSlotBooked = (timeSlot) => {
    const slotStartTime = timeSlot.time; // e.g., "17:00"
    const nextHour = (timeSlot.hour24 + 1) % 24;
    const slotEndTime = nextHour < 10 ? `0${nextHour}:00` : `${nextHour}:00`;

    return bookedSlots.some(booked => 
      booked.startTime === slotStartTime && booked.endTime === slotEndTime
    );
  };

  return (
    <Layout activePage="courts">
      <main className="dashboard-content">
        <div className="book-court-wrapper">
          {/* Progress Tracker */}
          <div className="progress-steps">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-circle">1</div>
              <span className="step-label">Select Date</span>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span className="step-label">Choose Court</span>
            </div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span className="step-label">Pick Time</span>
            </div>
            <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
              <div className="step-circle">4</div>
              <span className="step-label">Confirm</span>
            </div>
          </div>

          {errors.form && (
            <div className={`form-message ${errors.form.includes('confirmed') ? 'success' : 'error'}`}>
              {errors.form}
            </div>
          )}

          <div className="booking-main-content">
            <div className="booking-form-container">
              {currentStep === 1 && (
                <div className="step-section active">
                  <div className="step-header">
                    <h2>Select Date</h2>
                    <p className="step-description">Choose a date (Available for next 7 days)</p>
                  </div>
                  <div className="dates-grid">
                    {availableDates.map(date => (
                      <button
                        key={date.id}
                        type="button"
                        className={`date-card ${bookingData.selectedDate?.id === date.id ? 'selected' : ''}`}
                        onClick={() => handleDateSelect(date)}
                      >
                        <div className="date-day">{date.day}</div>
                        <div className="date-num">{date.dateNum}</div>
                        <div className="date-month">{date.month}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="step-section active">
                  <div className="step-header">
                    <h2>Choose Court</h2>
                  </div>
                  <div className="courts-grid">
                    {courts.map(court => (
                      <button
                        key={court._id || court.id}
                        type="button"
                        className={`court-card ${(bookingData.selectedCourt?._id === court._id || bookingData.selectedCourt?.id === court.id) ? 'selected' : ''}`}
                        onClick={() => handleCourtSelect(court)}
                        disabled={court.status !== 'open'}
                      >
                        <div className="court-header">
                          <h3>{court.name}</h3>
                          <span className="court-type">{court.type}</span>
                        </div>
                        <div className="court-details">
                          <p><strong>Size:</strong> {court.size}</p>
                          <p><strong>Surface:</strong> {court.surface}</p>
                          <p><strong>Price:</strong> Rs. {court.pricePerHour}/hour</p>
                        </div>
                        {court.status !== 'open' && (
                          <div className="court-unavailable">Currently Closed</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="step-section active">
                  <div className="step-header">
                    <h2>Select Time Slot</h2>
                  </div>
                  <div className="time-slots-grid">
                    {timeSlots.map(slot => {
                      const isBooked = isTimeSlotBooked(slot);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className={`time-slot ${bookingData.selectedTime?.id === slot.id ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
                          onClick={() => !isBooked && handleTimeSelect(slot)}
                          disabled={isBooked}
                          title={isBooked ? 'This slot is already booked' : ''}
                        >
                          {slot.display}
                          {isBooked && <span className="booked-label">Booked</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="step-section active">
                  <div className="step-header">
                    <h2>Review Your Booking</h2>
                  </div>
                  <div className="booking-summary">
                    <div className="summary-card">
                      <h3>Booking Summary</h3>
                      <div className="summary-details">
                        <div className="summary-item">
                          <span className="label">Date:</span>
                          <span className="value">{formatDate(bookingData.selectedDate)}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Court:</span>
                          <span className="value">{bookingData.selectedCourt?.name}</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">Time:</span>
                          <span className="value">{bookingData.selectedTime?.display}</span>
                        </div>
                        <div className="summary-item total">
                          <span className="label">Total Amount:</span>
                          <span className="value">Rs. {calculateTotal()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="notes-section">
                      <label htmlFor="bookingNotes">Additional Notes (Optional)</label>
                      <textarea
                        id="bookingNotes"
                        value={bookingData.bookingNotes}
                        onChange={handleNotesChange}
                        placeholder="Any special requirements..."
                        rows="3"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="booking-navigation">
                {currentStep > 1 && (
                  <button type="button" className="nav-btn prev-btn" onClick={handlePreviousStep} disabled={isSubmitting}>
                    ← Previous
                  </button>
                )}
                {currentStep < 4 ? (
                  <button type="button" className="nav-btn next-btn" onClick={handleNextStep} disabled={isSubmitting}>
                    Next Step →
                  </button>
                ) : (
                  <button type="button" className="nav-btn confirm-btn" onClick={handleSubmitBooking} disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                  </button>
                )}
              </div>
            </div>

            <div className="info-panel">
              <h3>Booking Information</h3>
              <ul>
                <li>1-hour time slots only</li>
                <li>Payment at the venue</li>
                <li>Nepali Currency (Rs.) accepted</li>
              </ul>
              
              {bookingData.selectedCourt && (
                <div className="price-summary">
                  <h4>Price Summary</h4>
                  <div className="price-item">
                    <span>{bookingData.selectedCourt.name}</span>
                    <span>Rs. {bookingData.selectedCourt.pricePerHour}</span>
                  </div>
                  <div className="price-total">
                    <strong>Total</strong>
                    <strong>Rs. {calculateTotal()}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default BookCourt;