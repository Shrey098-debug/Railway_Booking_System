const express = require('express');
const { getUserContext } = require('../middlewares/getUserContext.middleware');
const {
     createBooking,
     getBooking,
     getUserBookings,
     verifyPayment,
} = require('../controllers/booking.controller');

const router = express.Router();

// All booking routes require authentication (user context from gateway)
router.post('/bookings', getUserContext, createBooking);
router.get('/bookings', getUserContext, getUserBookings);
router.get('/bookings/:bookingId', getUserContext, getBooking);
router.post('/bookings/:bookingId/verify-payment', getUserContext, verifyPayment);

module.exports = router;
