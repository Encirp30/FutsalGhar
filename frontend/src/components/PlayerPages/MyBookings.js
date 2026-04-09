import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import './MyBookings.css';
import Layout from '../Layout';

const MyBookings = () => {
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  
  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 4; 

  const getBookingStatus = (booking) => {
    if (booking.status === 'cancelled') {
      return { text: 'Cancelled', class: 'cancelled' };
    }

    const now = new Date();
    let bookingDate;
    if (typeof booking.date === 'string') {
      bookingDate = booking.date.split('T')[0];
    } else if (booking.date instanceof Date) {
      bookingDate = booking.date.toISOString().split('T')[0];
    } else {
      bookingDate = new Date(booking.date).toISOString().split('T')[0];
    }

    let hours = 0, minutes = 0;
    const timeStr = booking.startTime.trim();
    
    if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
      const [h, m] = timeStr.split(':').map(Number);
      hours = h;
      minutes = m;
    } else {
      const timeRegex = /(\d+):(\d+)\s*(AM|PM)/i;
      const match = timeStr.match(timeRegex);
      if (match) {
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      }
    }

    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    if (bookingDateTime < now) {
      return { text: 'Completed', class: 'completed' };
    }
    if (booking.status === 'completed') {
      return { text: 'Completed', class: 'completed' };
    }

    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (bookingDateTime < twoHoursFromNow) {
      return { text: 'Starting Soon', class: 'soon' };
    }

    return { text: 'Upcoming', class: 'upcoming' };
  };

  const fetchBookings = async (page = 1, currentFilter = 'all') => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await api.getBookings(page, itemsPerPage, currentFilter);
      
      if (response.success) {
        setBookings(response.bookings || []);
        setTotalPages(response.pagination?.pages || 1);

        if (response.stats) {
          setGlobalStats({
            total: response.stats.total || 0,
            upcoming: response.stats.upcoming || 0,
            completed: response.stats.completed || 0,
            cancelled: response.stats.cancelled || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(currentPage, filter);
  }, [currentPage, filter]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); 
  };

  const handleCancelBooking = async (bookingId) => {
    if(!window.confirm("Are you sure you want to cancel?")) return;
    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId, "Cancelled by user");
      await fetchBookings(currentPage, filter);
    } catch (err) {
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  // NEW: Handle Reschedule
  const handleOpenReschedule = (booking) => {
    setRescheduleBooking(booking);
    // Set default date to current booking date
    const currentDate = new Date(booking.date);
    const formattedDate = currentDate.toISOString().split('T')[0];
    setNewDate(formattedDate);
    setNewStartTime(booking.startTime);
    setNewEndTime(booking.endTime);
    setShowRescheduleModal(true);
  };

  // Fetch available slots when date changes
  const fetchAvailableSlots = async (date) => {
    if (!rescheduleBooking || !date) return;
    try {
      const response = await api.getBookedSlots(rescheduleBooking.court._id, date);
      if (response.success) {
        setAvailableSlots(response.bookedSlots || []);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setNewDate(date);
    fetchAvailableSlots(date);
  };

  const handleSubmitReschedule = async (e) => {
    e.preventDefault();
    
    if (!newDate || !newStartTime || !newEndTime) {
      alert('Please fill all fields');
      return;
    }

    // Check if slot is available
    const isSlotBooked = availableSlots.some(
      slot => slot.startTime === newStartTime && slot.endTime === newEndTime
    );
    
    if (isSlotBooked) {
      alert('This time slot is already booked. Please select another time.');
      return;
    }

    setIsRescheduling(true);
    try {
      const response = await api.rescheduleBooking(rescheduleBooking._id, {
        newDate,
        newStartTime,
        newEndTime
      });
      
      if (response.success) {
        alert('Booking rescheduled successfully!');
        setShowRescheduleModal(false);
        setRescheduleBooking(null);
        await fetchBookings(currentPage, filter);
      }
    } catch (err) {
      alert(err.message || 'Failed to reschedule booking');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Handle Review Submission
  const handleOpenReview = (booking) => {
    setSelectedBooking(booking);
    setRating(5);
    setComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const response = await api.addReview(selectedBooking._id, { rating, comment });
      if (response.success) {
        setShowReviewModal(false);
        fetchBookings(currentPage, filter);
        alert("Review submitted successfully!");
      }
    } catch (err) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // Generate time slots (9 AM to 9 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      const startHour = hour;
      const endHour = hour + 1;
      const startTime = `${startHour.toString().padStart(2, '0')}:00`;
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      slots.push({ startTime, endTime });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Check if a time slot is available
  const isSlotAvailable = (startTime, endTime) => {
    return !availableSlots.some(slot => slot.startTime === startTime && slot.endTime === endTime);
  };

  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchTerm.toLowerCase();
    const courtName = booking.court?.name?.toLowerCase() || '';
    return !searchTerm || courtName.includes(searchLower) || booking._id.includes(searchLower);
  });

  const totalSpentOnPage = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.totalCost || 0), 0);

  if (loading && bookings.length === 0) return <div className="loading-container"><div className="loading-spinner"></div><p>Loading...</p></div>;

  return (
    <Layout activePage="bookings">
      <main className="dashboard-content">
        <div className="my-bookings-wrapper">         
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total"><span>📋</span></div>
                <div className="stat-content">
                  <h3>{globalStats.total}</h3>
                  <p>Total Bookings</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon upcoming"><span>⏳</span></div>
                <div className="stat-content">
                  <h3>{globalStats.upcoming}</h3>
                  <p>Upcoming</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon completed"><span>✅</span></div>
                <div className="stat-content">
                  <h3>{globalStats.completed}</h3>
                  <p>Completed</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon cancelled"><span>❌</span></div>
                <div className="stat-content">
                  <h3>{globalStats.cancelled}</h3>
                  <p>Cancelled</p>
                </div>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-tabs">
              {['all', 'upcoming', 'past', 'cancelled'].map(tab => (
                <button 
                  key={tab}
                  className={`filter-tab ${filter === tab ? 'active' : ''}`}
                  onClick={() => handleFilterChange(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="search-sort">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search by court or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>
              <button className="new-booking-btn" onClick={() => navigate('/book-court')}>
                + New Booking
              </button>
            </div>
          </div>

          <div className="bookings-content">
            <div className="bookings-list">
              {filteredBookings.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No {filter !== 'all' ? filter : ''} bookings found</h3>
                </div>
              ) : (
                <>
                  {filteredBookings.map(booking => {
                    const status = getBookingStatus(booking);
                    return (
                      <div key={booking._id} className="booking-card">
                        <div className="booking-header">
                          <div className="booking-info">
                            <h3>{booking.court?.name || 'Futsal Court'}</h3>
                            <div className={`status-badge ${status.class}`}>
                              {status.text}
                            </div>
                          </div>
                          <div className="booking-price">
                            <span className="price-label"></span>
                            <span className="price-amount">Rs. {booking.totalCost}</span>
                          </div>
                        </div>

                        <div className="booking-details">
                          <div className="detail-item">
                            <span className="detail-label">Date</span>
                            <span className="detail-value">{formatDisplayDate(booking.date)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Time Slot</span>
                            <span className="detail-value">{booking.startTime} - {booking.endTime}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Type</span>
                            <span className="detail-value">{booking.court?.type || 'Standard'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Booking ID</span>
                            <span className="detail-value code">#{booking._id.slice(-6)}</span>
                          </div>
                        </div>

                        <div className="booking-actions">
                          {status.text === 'Upcoming' || status.text === 'Starting Soon' ? (
                            <>
                              <button className="action-btn reschedule-btn" onClick={() => handleOpenReschedule(booking)}>Reschedule</button>
                              <button 
                                  className="action-btn cancel-btn" 
                                  onClick={() => handleCancelBooking(booking._id)}
                                  disabled={cancellingId === booking._id}
                              >
                                  {cancellingId === booking._id ? '...' : 'Cancel'}
                              </button>
                            </>
                          ) : status.text === 'Completed' ? (
                            booking.review?.rating ? (
                              <span className="reviewed-tag">⭐ Reviewed ({booking.review.rating}/5)</span>
                            ) : (
                              <button 
                                className="action-btn review-btn" 
                                onClick={() => handleOpenReview(booking)}
                              >
                                Write Review
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* PAGINATION */}
                  <div className="pagination-container">
                    <button className="page-nav-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&laquo; Prev</button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button key={i + 1} className={`page-number ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => handlePageChange(i + 1)}>{i + 1}</button>
                    ))}
                    <button className="page-nav-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next &raquo;</button>
                  </div>
                </>
              )}
            </div>

            <div className="bookings-summary">
              <div className="summary-card">
                <h3>Summary</h3>
                <div className="summary-stats">
                  <div className="summary-stat">
                    <span className="stat-label">Total Spent (On this page)</span>
                    <span className="stat-value">Rs. {totalSpentOnPage}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESCHEDULE MODAL */}
        {showRescheduleModal && rescheduleBooking && (
          <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
            <div className="reschedule-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Reschedule Booking</h2>
                <button className="close-modal" onClick={() => setShowRescheduleModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleSubmitReschedule}>
                <div className="form-group">
                  <label>Court: {rescheduleBooking.court?.name}</label>
                </div>
                <div className="form-group">
                  <label>Select New Date *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Select New Time Slot *</label>
                  <div className="time-slots-grid">
                    {timeSlots.map((slot, index) => {
                      const isAvailable = isSlotAvailable(slot.startTime, slot.endTime);
                      const isSelected = newStartTime === slot.startTime && newEndTime === slot.endTime;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`time-slot-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                          onClick={() => {
                            if (isAvailable) {
                              setNewStartTime(slot.startTime);
                              setNewEndTime(slot.endTime);
                            }
                          }}
                          disabled={!isAvailable}
                        >
                          {slot.startTime} - {slot.endTime}
                          {!isAvailable && <span className="booked-tag">(Booked)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isRescheduling}>
                    {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        {showReviewModal && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Rate your experience at {selectedBooking?.court?.name}</h2>
                <button className="close-modal" onClick={() => setShowReviewModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleSubmitReview}>
                <div className="rating-input">
                  <label>Select Rating:</label>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <span 
                        key={num} 
                        className={`star ${rating >= num ? 'active' : ''}`}
                        onClick={() => setRating(num)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <div className="comment-input">
                  <label>Your Feedback:</label>
                  <textarea 
                    placeholder="Tell others about the court quality, lights, or service..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={submittingReview}>
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
};

export default MyBookings;