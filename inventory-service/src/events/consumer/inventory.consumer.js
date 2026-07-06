const { RedisClient } = require('../../config/redis');
const logger = require('../../config/logger');
const { createStreamConsumer } = require('../../../../shared/utils/streamBus');
const { STREAMS, DLQ_STREAMS } = require('../../../../shared/constants/streams');
const inventoryService = require('../../services/inventory.service');

// Blocking stream reads need a dedicated connection (separate from the shared
// one used for acks/DLQ writes). maxRetriesPerRequest:null keeps long BLOCK calls alive.
const consumerRedis = RedisClient.getInstance().duplicate({ maxRetriesPerRequest: null });

const consumer = createStreamConsumer({
     redis: consumerRedis,
     group: 'inventory-service',
     consumer: `inventory-${process.pid}`,
     logger,
     subscriptions: [
          {
               stream: STREAMS.SCHEDULE_CREATED,
               dlqStream: DLQ_STREAMS.INVENTORY,
               handler: async (_stream, message) => inventoryService.initializeInventory(message),
          },
          {
               stream: STREAMS.SCHEDULE_CANCELLED,
               dlqStream: DLQ_STREAMS.INVENTORY,
               handler: async (_stream, message) => inventoryService.cancelScheduleInventory(message),
          },
     ],
});

module.exports = { start: consumer.start, stop: consumer.stop };
