const { redis } = require('../../config/redis');
const logger = require('../../config/logger');
const { publishToStream } = require('../../../../shared/utils/streamBus');
const { STREAMS } = require('../../../../shared/constants/streams');

/**
 * Payment event producer (Redis Streams).
 * booking-service consumes these to drive the booking saga.
 */
class PaymentProducer {
     async publishPaymentSuccess(paymentOrderId, bookingId, gatewayPaymentId, amount) {
          const id = await publishToStream(redis, STREAMS.PAYMENT_SUCCESS, {
               paymentOrderId,
               bookingId,
               gatewayPaymentId,
               amount,
               capturedAt: new Date().toISOString(),
          });
          logger.info(`Published ${STREAMS.PAYMENT_SUCCESS}`, { paymentOrderId, id });
          return id;
     }

     async publishPaymentFailed(paymentOrderId, bookingId, reason) {
          const id = await publishToStream(redis, STREAMS.PAYMENT_FAILED, {
               paymentOrderId,
               bookingId,
               reason,
               failedAt: new Date().toISOString(),
          });
          logger.info(`Published ${STREAMS.PAYMENT_FAILED}`, { paymentOrderId, id });
          return id;
     }
}

module.exports = new PaymentProducer();
