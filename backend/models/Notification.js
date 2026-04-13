const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who receives notification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      // Player notifications
      'booking_confirmation',
      'booking_reminder',
      'booking_cancelled',
      'booking_rescheduled',
      'team_created',
      'team_join_request',
      'team_join_approved',
      'team_join_rejected',
      'challenge_received',
      'challenge_accepted',
      'challenge_rejected',
      'match_scheduled',
      'match_result',
      'referral_joined',
      'reward_earned',
      'tournament_registration_approved',
      
      // Manager notifications
      'court_created',
      'court_deleted',
      'court_status_updated',
      'new_booking',
      'booking_completed',
      'revenue_earned',
      'team_registered_for_tournament',
      
      // Admin notifications
      'new_manager_registered',
      'new_court_created',
      'tournament_created',
      'system_alert',
      'user_report',
      
      // General
      'withdrawal_approved',
      'general'
    ],
    required: true
  },
  
  // Notification title and message
  title: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  // Related entity
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['booking', 'team', 'match', 'tournament', 'user', 'challenge', 'court']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Notification channel
  channel: {
    type: String,
    enum: ['in_app', 'email', 'push'],
    default: 'in_app'
  },
  
  // Delivery status (for email)
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: Date
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);