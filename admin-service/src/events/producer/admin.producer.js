const { redis } = require('../../config/redis');
const logger = require('../../config/logger');
const { publishToStream } = require('../../../../shared/utils/streamBus');
const { STREAMS } = require('../../../../shared/constants/streams');

/**
 * Admin event producer (Redis Streams).
 *
 * Only schedule lifecycle events are published — they drive inventory creation
 * and booking cancellation. Station/train/route events were dropped (they had
 * no consumer after the Elasticsearch search-service was removed).
 */
class AdminProducer {
     async publishScheduleCreated(scheduleData) {
          const id = await publishToStream(redis, STREAMS.SCHEDULE_CREATED, scheduleData);
          logger.info(`Published ${STREAMS.SCHEDULE_CREATED}`, { scheduleId: scheduleData.scheduleId, id });
          return id;
     }

     async publishScheduleCancelled(schedule) {
          const payload = {
               scheduleId: schedule.id,
               trainId: schedule.trainId,
               status: 'CANCELLED',
          };
          const id = await publishToStream(redis, STREAMS.SCHEDULE_CANCELLED, payload);
          logger.info(`Published ${STREAMS.SCHEDULE_CANCELLED}`, { scheduleId: schedule.id, id });
          return id;
     }
}

module.exports = new AdminProducer();
