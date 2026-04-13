const Booking = require('../models/Booking');
const Court = require('../models/Court');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

/**
 * Auto-complete past bookings that are still 'confirmed'
 * Runs daily to ensure revenue is calculated correctly
 */
const completePastBookings = async () => {
  try {
    const now = new Date();
    console.log(`[Job] Running completePastBookings at ${now.toISOString()}`);

    // Find all confirmed bookings where date+time is in the past
    const pastBookings = await Booking.find({
      status: 'confirmed',
      date: { $lt: now }
    }).populate('court');

    if (pastBookings.length === 0) {
      console.log('[Job] No past bookings to complete');
      return;
    }

    console.log(`[Job] Found ${pastBookings.length} past bookings to complete`);

    let completedCount = 0;
    let revenueTotal = 0;

    for (const booking of pastBookings) {
      // Check if the booking date+time is actually past
      const bookingDateTime = new Date(booking.date);
      const [hours, minutes] = booking.startTime.split(':').map(Number);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      if (bookingDateTime < now) {
        // Mark booking as completed
        booking.status = 'completed';
        await booking.save();

        // Create transaction record for revenue
        await Transaction.create({
          user: booking.court.owner,
          type: 'booking',
          amount: booking.totalCost,
          paymentMethod: booking.paymentMethod,
          status: 'completed',
          reference: {
            referenceType: 'booking',
            referenceId: booking._id
          },
          description: `Auto-completed booking for court ${booking.court.name} on ${new Date(booking.date).toDateString()}`
        });

        // Add to court owner's wallet
        const courtOwner = await User.findById(booking.court.owner);
        if (courtOwner) {
          courtOwner.walletBalance += booking.totalCost;
          await courtOwner.save();
        }

        // Notify manager about revenue earned
        try {
          await Notification.create({
            user: booking.court.owner,
            type: 'revenue_earned',
            title: 'Revenue Earned',
            message: `You earned Rs.${booking.totalCost} from booking on "${booking.court.name}" (${new Date(booking.date).toDateString()})`,
            relatedEntity: {
              entityType: 'booking',
              entityId: booking._id
            }
          });
        } catch (notifyError) {
          console.log('Notification error:', notifyError.message);
        }

        completedCount++;
        revenueTotal += booking.totalCost;
        console.log(`[Job] Completed booking for court: ${booking.court.name}, Amount: Rs.${booking.totalCost}`);
      }
    }

    console.log(`[Job] Summary: ${completedCount} bookings completed, Total Revenue: Rs.${revenueTotal}`);
  } catch (error) {
    console.error('[Job] Error in completePastBookings:', error);
  }
};

module.exports = completePastBookings;