# FutsalPro Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer {token}
```

---

## 1. AUTH ENDPOINTS

### Register User
- **POST** `/auth/register`
- **Body**: `{ fullName, email, password, confirmPassword }`
- **Response**: `{ success, token, user }`

### Login User
- **POST** `/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ success, token, user }`

### Get Current User
- **GET** `/auth/me`
- **Auth**: Required
- **Response**: `{ success, user }`

### Update Profile
- **PUT** `/auth/profile`
- **Auth**: Required
- **Body**: `{ fullName, phone, location, bio, skillLevel, preferredPosition }`
- **Response**: `{ success, user }`

### Change Password
- **POST** `/auth/change-password`
- **Auth**: Required
- **Body**: `{ currentPassword, newPassword, confirmPassword }`
- **Response**: `{ success }`

### Request Password Reset
- **POST** `/auth/forgot-password`
- **Body**: `{ email }`
- **Response**: `{ success }`

### Reset Password
- **POST** `/auth/reset-password`
- **Body**: `{ token, password, confirmPassword }`
- **Response**: `{ success }`

---

## 2. COURT ENDPOINTS

### Get All Courts
- **GET** `/courts?type=indoor&city=kathmandu&minPrice=500&maxPrice=2000&page=1&limit=10`
- **Response**: `{ success, data, pagination }`

### Get Court By ID
- **GET** `/courts/:id?date=2024-01-15`
- **Response**: `{ success, court, availability }`

### Create Court (Manager)
- **POST** `/courts`
- **Auth**: Manager/Admin
- **Body**: `{ name, description, type, location, images, facilities, pricePerHour, openingTime, closingTime }`
- **Response**: `{ success, court }`

### Update Court (Manager)
- **PUT** `/courts/:id`
- **Auth**: Manager/Admin
- **Body**: `{ name, description, ...updates }`
- **Response**: `{ success, court }`

### Get Manager Courts
- **GET** `/courts/manager/courts`
- **Auth**: Manager
- **Response**: `{ success, courts }`

### Block Time Slot
- **POST** `/courts/:id/block-slot`
- **Auth**: Manager/Admin
- **Body**: `{ date, startTime, endTime, reason }`
- **Response**: `{ success }`

---

## 3. BOOKING ENDPOINTS

### Create Booking
- **POST** `/bookings`
- **Auth**: Required
- **Body**: `{ courtId, date, startTime, endTime, paymentMethod }`
- **Response**: `{ success, booking }`

### Get User Bookings
- **GET** `/bookings/my-bookings?status=confirmed&page=1&limit=10`
- **Auth**: Required
- **Response**: `{ success, bookings, pagination }`

### Get Booking Details
- **GET** `/bookings/:id`
- **Auth**: Required
- **Response**: `{ success, booking }`

### Cancel Booking
- **PUT** `/bookings/:id/cancel`
- **Auth**: Required
- **Body**: `{ reason }`
- **Response**: `{ success, refundAmount }`

### Reschedule Booking
- **PUT** `/bookings/:id/reschedule`
- **Auth**: Required
- **Body**: `{ newDate, newStartTime, newEndTime }`
- **Response**: `{ success, booking }`

### Add Review
- **POST** `/bookings/:id/review`
- **Auth**: Required
- **Body**: `{ rating(1-5), comment }`
- **Response**: `{ success, booking }`

---

## 4. TEAM ENDPOINTS

### Create Team
- **POST** `/teams`
- **Auth**: Required
- **Body**: `{ name, bio, level, visibility }`
- **Response**: `{ success, team }`

### Get Public Teams
- **GET** `/teams?search=name&level=intermediate&page=1&limit=10`
- **Response**: `{ success, teams, pagination }`

### Get Team Details
- **GET** `/teams/:id`
- **Response**: `{ success, team }`

### Get User Teams
- **GET** `/teams/user/teams`
- **Auth**: Required
- **Response**: `{ success, teams }`

### Send Join Request
- **POST** `/teams/:id/join-request`
- **Auth**: Required
- **Body**: `{ message }`
- **Response**: `{ success }`

### Approve Join Request
- **POST** `/teams/:id/approve-request/:requestId`
- **Auth**: Required (Captain)
- **Response**: `{ success }`

### Reject Join Request
- **POST** `/teams/:id/reject-request/:requestId`
- **Auth**: Required (Captain)
- **Response**: `{ success }`

### Update Team
- **PUT** `/teams/:id`
- **Auth**: Required (Captain)
- **Body**: `{ name, bio, level, visibility }`
- **Response**: `{ success, team }`

### Remove Player
- **PUT** `/teams/:id/remove-player/:playerId`
- **Auth**: Required (Captain)
- **Response**: `{ success }`

### Leave Team
- **PUT** `/teams/:id/leave`
- **Auth**: Required
- **Response**: `{ success }`

---

## 5. TOURNAMENT ENDPOINTS

### Get All Tournaments
- **GET** `/tournaments?status=registration_open&page=1&limit=10`
- **Response**: `{ success, tournaments, pagination }`

### Get Tournament Details
- **GET** `/tournaments/:id`
- **Response**: `{ success, tournament }`

### Create Tournament (Manager/Admin)
- **POST** `/tournaments`
- **Auth**: Manager/Admin
- **Body**: `{ name, description, venue, startDate, endDate, format, maxTeams, priceDistribution, entryFee, rulesDescription }`
- **Response**: `{ success, tournament }`

### Register Team
- **POST** `/tournaments/:id/register`
- **Auth**: Required (Team Captain)
- **Body**: `{ teamId }`
- **Response**: `{ success, tournament }`

### Update Tournament Status
- **PUT** `/tournaments/:id/status`
- **Auth**: Manager/Admin
- **Body**: `{ status }`
- **Response**: `{ success, tournament }`

### Declare Winner
- **PUT** `/tournaments/:id/declare-winner`
- **Auth**: Manager/Admin
- **Body**: `{ winnerId, runnerUpId, thirdPlaceId }`
- **Response**: `{ success, tournament }`

---

## 6. MATCH ENDPOINTS

### Get All Matches
- **GET** `/matches?status=scheduled&page=1&limit=10`
- **Response**: `{ success, matches, pagination }`

### Get Match Details
- **GET** `/matches/:id`
- **Response**: `{ success, match }`

### Get Team Matches
- **GET** `/matches/team/matches?teamId=xyz&status=completed`
- **Response**: `{ success, matches }`

### Get Player Statistics
- **GET** `/matches/player/statistics?playerId=xyz`
- **Response**: `{ success, stats }`

### Create Match (Manager/Admin)
- **POST** `/matches`
- **Auth**: Manager/Admin
- **Body**: `{ tournament, teamA, teamB, court, scheduledDate, startTime, endTime }`
- **Response**: `{ success, match }`

### Update Match Result
- **PUT** `/matches/:id/result`
- **Auth**: Manager/Admin
- **Body**: `{ teamAScore, teamBScore, goalScorers, cards, playerRatings, manOfTheMatch, ...}`
- **Response**: `{ success, match }`

---

## 7. TEAM CHALLENGE ENDPOINTS

### Send Challenge
- **POST** `/challenges`
- **Auth**: Required (Team Captain)
- **Body**: `{ challengedTeamId, proposedDate, proposedStartTime, proposedEndTime, preferredCourt, message }`
- **Response**: `{ success, challenge }`

### Get Incoming Challenges
- **GET** `/challenges/incoming`
- **Auth**: Required
- **Response**: `{ success, challenges }`

### Get Outgoing Challenges
- **GET** `/challenges/outgoing`
- **Auth**: Required
- **Response**: `{ success, challenges }`

### Accept Challenge
- **PUT** `/challenges/:id/accept`
- **Auth**: Required
- **Body**: `{ date, startTime, endTime }`
- **Response**: `{ success, match }`

### Reject Challenge
- **PUT** `/challenges/:id/reject`
- **Auth**: Required
- **Response**: `{ success }`

### Propose Alternative Dates
- **PUT** `/challenges/:id/propose-dates`
- **Auth**: Required
- **Body**: `{ dates: [{ date, startTime, endTime }] }`
- **Response**: `{ success }`

### Cancel Challenge
- **PUT** `/challenges/:id/cancel`
- **Auth**: Required
- **Response**: `{ success }`

---

## 8. REFERRAL ENDPOINTS

### Get Referral Link
- **GET** `/referrals/link`
- **Auth**: Required
- **Response**: `{ success, referralCode, referralLink }`

### Send Invite
- **POST** `/referrals/send-invite`
- **Auth**: Required
- **Body**: `{ email, message }`
- **Response**: `{ success }`

### Share Referral Link
- **POST** `/referrals/share`
- **Auth**: Required
- **Body**: `{ platform }` (whatsapp, facebook, twitter, email)
- **Response**: `{ success, referralLink, shareUrl }`

### Get Referral Statistics
- **GET** `/referrals/stats`
- **Auth**: Required
- **Response**: `{ success, stats }`

### Get Referral History
- **GET** `/referrals/history?page=1&limit=10`
- **Auth**: Required
- **Response**: `{ success, referrals, pagination }`

### Verify Referral Code
- **POST** `/referrals/verify`
- **Body**: `{ referralCode }`
- **Response**: `{ success }`

---

## 9. USER ENDPOINTS

### Get Dashboard
- **GET** `/users/dashboard`
- **Auth**: Required
- **Response**: `{ success, dashboard }`

### Get Notifications
- **GET** `/users/notifications?page=1&limit=20`
- **Auth**: Required
- **Response**: `{ success, notifications, pagination }`

### Mark Notification as Read
- **PUT** `/users/notifications/:id/read`
- **Auth**: Required
- **Response**: `{ success, notification }`

### Mark All Notifications as Read
- **PUT** `/users/notifications/mark-all-read`
- **Auth**: Required
- **Response**: `{ success }`

### Get User Statistics
- **GET** `/users/statistics`
- **Auth**: Required
- **Response**: `{ success, statistics }`

### Get Upcoming Matches
- **GET** `/users/upcoming-matches`
- **Auth**: Required
- **Response**: `{ success, matches }`

### Get Booking Trends
- **GET** `/users/booking-trends?months=6`
- **Auth**: Required
- **Response**: `{ success, trends }`

---

## 10. MANAGER ENDPOINTS

### Get Manager Bookings
- **GET** `/manager/bookings?status=confirmed&page=1&limit=10`
- **Auth**: Manager
- **Response**: `{ success, bookings, pagination }`

### Confirm Booking
- **PUT** `/manager/bookings/:id/confirm`
- **Auth**: Manager
- **Response**: `{ success, booking }`

### Complete Booking
- **PUT** `/manager/bookings/:id/complete`
- **Auth**: Manager
- **Response**: `{ success, booking }`

### Get Revenue
- **GET** `/manager/revenue?startDate=2024-01-01&endDate=2024-12-31`
- **Auth**: Manager
- **Response**: `{ success, revenue }`

### Get Wallet
- **GET** `/manager/wallet`
- **Auth**: Manager
- **Response**: `{ success, wallet }`

### Request Withdrawal
- **POST** `/manager/withdrawal-request`
- **Auth**: Manager
- **Body**: `{ amount, bankAccount, accountHolder, bankName, bankCode }`
- **Response**: `{ success, request }`

### Get Withdrawal Requests
- **GET** `/manager/withdrawals`
- **Auth**: Manager
- **Response**: `{ success, requests }`

### Get Transaction History
- **GET** `/manager/transactions?page=1&limit=10`
- **Auth**: Manager
- **Response**: `{ success, transactions, pagination }`

### Get Court Utilization
- **GET** `/manager/court-utilization?courtId=xyz&startDate=2024-01-01&endDate=2024-12-31`
- **Auth**: Manager
- **Response**: `{ success, utilization }`

---

## 11. ADMIN ENDPOINTS

### Get All Users
- **GET** `/admin/users?role=user&page=1&limit=10`
- **Auth**: Admin
- **Response**: `{ success, users, pagination }`

### Update User Role
- **PUT** `/admin/users/:id/role`
- **Auth**: Admin
- **Body**: `{ role }` (user, manager, admin)
- **Response**: `{ success, user }`

### Disable User
- **PUT** `/admin/users/:id/disable`
- **Auth**: Admin
- **Response**: `{ success, user }`

### Enable User
- **PUT** `/admin/users/:id/enable`
- **Auth**: Admin
- **Response**: `{ success, user }`

### Get All Courts
- **GET** `/admin/courts?page=1&limit=10`
- **Auth**: Admin
- **Response**: `{ success, courts, pagination }`

### Delete Court
- **DELETE** `/admin/courts/:id`
- **Auth**: Admin
- **Response**: `{ success }`

### Assign Court to Manager
- **POST** `/admin/courts/assign`
- **Auth**: Admin
- **Body**: `{ courtId, managerId }`
- **Response**: `{ success, court }`

### Get System Statistics
- **GET** `/admin/statistics`
- **Auth**: Admin
- **Response**: `{ success, statistics }`

### Get All Transactions
- **GET** `/admin/transactions?status=completed&page=1&limit=10`
- **Auth**: Admin
- **Response**: `{ success, transactions, pagination }`

### Get Withdrawal Requests
- **GET** `/admin/withdrawals?status=pending&page=1&limit=10`
- **Auth**: Admin
- **Response**: `{ success, requests, pagination }`

### Approve Withdrawal
- **PUT** `/admin/withdrawals/:id/approve`
- **Auth**: Admin
- **Body**: `{ notes }`
- **Response**: `{ success, request }`

### Reject Withdrawal
- **PUT** `/admin/withdrawals/:id/reject`
- **Auth**: Admin
- **Body**: `{ reason }`
- **Response**: `{ success, request }`

### Get Revenue Report
- **GET** `/admin/revenue-report?startDate=2024-01-01&endDate=2024-12-31`
- **Auth**: Admin
- **Response**: `{ success, report }`

---

## Error Responses

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized (Invalid/Missing token)
- `403`: Forbidden (Not authorized to access)
- `404`: Not Found
- `500`: Server Error

---

## Installation & Running

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables** (`.env` file already configured)

3. **Run the server**
   ```bash
   npm run dev  # For development with nodemon
   npm start    # For production
   ```

4. **Server runs on** `http://localhost:5000`

---

## Database Models

The backend uses MongoDB with the following collections:

- **User**: Player/Manager/Admin users with profile and authentication
- **Court**: Sports courts with pricing and availability
- **Booking**: Court bookings with payment tracking
- **Team**: Teams with members and statistics
- **Tournament**: Tournaments with team registrations
- **Match**: Match results with player statistics
- **TeamChallenge**: Team challenges with acceptance/rejection
- **Referral**: Referral tracking for rewards
- **Transaction**: Payment transactions
- **Notification**: User notifications
- **WithdrawalRequest**: Manager withdrawal requests

---

## Key Features Implemented

### Player Features:
✅ Authentication & Profile Management
✅ Court Browsing & Booking
✅ Team Creation & Management
✅ Tournament Registration
✅ Match Results & Statistics
✅ Team Challenges
✅ Referral System
✅ Notifications & Dashboard
✅ Wallet & Payment Tracking

### Manager Features:
✅ Court Management
✅ Booking Management
✅ Revenue Tracking
✅ Wallet & Withdrawals
✅ Court Utilization Analytics

### Admin Features:
✅ User Management
✅ Court Management
✅ System Statistics
✅ Transaction Management
✅ Withdrawal Approvals
✅ Revenue Reports

---

## Next Steps for Frontend Integration

1. Update frontend API calls to use these endpoints
2. Store JWT token in local storage after login
3. Include Authorization header in all protected requests
4. Handle error responses appropriately
5. Update UI components to display data from these APIs

All endpoints are ready for integration with the frontend React application.
