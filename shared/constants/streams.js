/**
 * Centralized Redis Stream definitions.
 *
 * Replaces the old Kafka topics. Every producing/consuming service imports
 * from here so stream names stay in sync. Only the streams that have a real
 * consumer are kept — dead events (booking.*, notification.*, search.*,
 * seat-availability) were removed when we dropped Kafka.
 */
const STREAMS = {
     // admin-service -> inventory-service (+ booking-service for cancellation)
     SCHEDULE_CREATED: 'admin.schedule-created',
     SCHEDULE_CANCELLED: 'admin.schedule-cancelled',

     // payment-service -> booking-service
     PAYMENT_SUCCESS: 'payment.success',
     PAYMENT_FAILED: 'payment.failed',
};

/**
 * Dead-letter streams — poison messages (failed after STREAM_MAX_RETRIES) land here.
 */
const DLQ_STREAMS = {
     INVENTORY: 'dlq.inventory-service',
     BOOKING: 'dlq.booking-service',
};

/**
 * Max deliveries before a message is considered poison and moved to its DLQ.
 */
const STREAM_MAX_RETRIES = 3;

module.exports = { STREAMS, DLQ_STREAMS, STREAM_MAX_RETRIES };
