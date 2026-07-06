const { RedisClient } = require('../../config/redis');
const logger = require('../../config/logger');
const { createStreamConsumer } = require('../../../../shared/utils/streamBus');
const { STREAMS, DLQ_STREAMS } = require('../../../../shared/constants/streams');
const bookingService = require('../../services/booking.service');

// Dedicated connection for blocking stream reads (separate from the shared
// Redis connection used for locks/idempotency).
const consumerRedis = RedisClient.getInstance().duplicate({ maxRetriesPerRequest: null });

const consumer = createStreamConsumer({
     redis: consumerRedis,
     group: 'booking-service',
     consumer: `booking-${process.pid}`,
     logger,
     subscriptions: [
          {
               stream: STREAMS.PAYMENT_SUCCESS,
               dlqStream: DLQ_STREAMS.BOOKING,
               handler: async (_stream, message) =>
                    bookingService.handlePaymentSuccess(message.paymentOrderId, message.gatewayPaymentId, message.amount),
          },
          {
               stream: STREAMS.PAYMENT_FAILED,
               dlqStream: DLQ_STREAMS.BOOKING,
               handler: async (_stream, message) =>
                    bookingService.handlePaymentFailure(message.paymentOrderId, message.reason),
          },
          {
               stream: STREAMS.SCHEDULE_CANCELLED,
               dlqStream: DLQ_STREAMS.BOOKING,
               handler: async (_stream, message) =>
                    bookingService.handleScheduleCancelled(message.scheduleId),
          },
     ],
});

module.exports = { start: consumer.start, stop: consumer.stop };
