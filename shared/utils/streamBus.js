/**
 * Lightweight event bus built on Redis Streams (replaces Kafka/KafkaJS).
 *
 * Producers:  publishToStream(redis, stream, message)
 * Consumers:  createStreamConsumer({ redis, group, consumer, subscriptions, logger })
 *
 * Delivery semantics (mirrors the old Kafka + DLQ behaviour):
 *   - Consumer groups give each service its own independent cursor on a stream,
 *     so the same stream (e.g. admin.schedule-cancelled) can be read by both
 *     inventory-service and booking-service.
 *   - A handler that throws leaves the message UN-acked. It stays in the group's
 *     Pending Entries List (PEL) and is re-delivered by the reclaim loop after
 *     RECLAIM_MIN_IDLE_MS. After STREAM_MAX_RETRIES deliveries it is published
 *     to the service's DLQ stream and ack'd, so it never blocks the consumer.
 *   - Messages are stored as a single `data` field holding the JSON payload.
 */

const { STREAM_MAX_RETRIES } = require('../constants/streams');

const RECLAIM_MIN_IDLE_MS = 10000; // re-deliver a failed/stuck message after 10s
const BLOCK_MS = 5000;             // how long XREADGROUP blocks waiting for new messages
const BATCH = 10;                  // max messages pulled per read
const STREAM_MAXLEN = 10000;       // cap stream length (approx) to bound Redis memory

// Redis returns stream fields as a flat array: ['data', '<json>'] -> { data: '<json>' }
function fieldsToObject(fieldArr) {
     const obj = {};
     for (let i = 0; i < fieldArr.length; i += 2) {
          obj[fieldArr[i]] = fieldArr[i + 1];
     }
     return obj;
}

/**
 * Publish a message to a stream. Caps the stream length so old events don't
 * grow Redis memory without bound.
 */
async function publishToStream(redis, stream, message) {
     return redis.xadd(stream, 'MAXLEN', '~', STREAM_MAXLEN, '*', 'data', JSON.stringify(message));
}

async function ensureGroup(redis, stream, group, logger) {
     try {
          // '$' = only new messages from now on. MKSTREAM creates the stream if absent.
          await redis.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
          logger.info(`Created consumer group "${group}" on stream "${stream}"`);
     } catch (err) {
          if (err.message && err.message.includes('BUSYGROUP')) return; // already exists
          throw err;
     }
}

async function handleEntry(redis, sub, group, id, fieldArr, logger) {
     const { stream, dlqStream, handler } = sub;

     // XAUTOCLAIM can return tombstones ([id, null]) for messages that were trimmed
     // by MAXLEN while still pending — nothing to process, just ack and move on.
     if (!fieldArr) {
          await redis.xack(stream, group, id);
          return;
     }

     const fields = fieldsToObject(fieldArr);

     let message;
     try {
          message = JSON.parse(fields.data);
     } catch (e) {
          logger.error(`Unparseable message on ${stream} → DLQ`, { id, error: e.message });
          await redis.xadd(dlqStream, '*', 'data', fields.data || '', 'error', `parse_error: ${e.message}`, 'source', stream);
          await redis.xack(stream, group, id);
          return;
     }

     try {
          await handler(stream, message);
          await redis.xack(stream, group, id);
     } catch (err) {
          // How many times has this message been delivered? (XPENDING gives the count)
          let deliveries = 1;
          try {
               const pending = await redis.xpending(stream, group, id, id, 1);
               if (pending && pending[0]) deliveries = Number(pending[0][3]);
          } catch (_) { /* fall back to 1 */ }

          if (deliveries >= STREAM_MAX_RETRIES) {
               logger.error(`Message on ${stream} exhausted ${STREAM_MAX_RETRIES} retries → DLQ`, { id, error: err.message });
               await redis.xadd(dlqStream, '*', 'data', fields.data, 'error', err.message, 'source', stream);
               await redis.xack(stream, group, id);
          } else {
               logger.warn(`Handler failed on ${stream} (delivery ${deliveries}/${STREAM_MAX_RETRIES}), will retry`, { id, error: err.message });
               // leave un-acked — the reclaim loop re-delivers it after RECLAIM_MIN_IDLE_MS
          }
     }
}

/**
 * Create a stream consumer.
 *
 * @param {object}   opts
 * @param {object}   opts.redis          Dedicated ioredis connection (used for blocking reads)
 * @param {string}   opts.group          Consumer group name (one per service)
 * @param {string}   opts.consumer       Consumer name (unique per instance)
 * @param {object}   opts.logger         Winston logger
 * @param {Array}    opts.subscriptions  [{ stream, dlqStream, handler(stream, message) }]
 * @returns {{ start: Function, stop: Function }}
 */
function createStreamConsumer({ redis, group, consumer, subscriptions, logger }) {
     let running = false;
     const byStream = new Map(subscriptions.map(s => [s.stream, s]));
     const streams = subscriptions.map(s => s.stream);

     async function loop() {
          while (running) {
               try {
                    // 1) Reclaim previously failed/stuck messages and retry them.
                    for (const sub of subscriptions) {
                         const res = await redis.xautoclaim(sub.stream, group, consumer, RECLAIM_MIN_IDLE_MS, '0', 'COUNT', BATCH);
                         const entries = (res && res[1]) ? res[1] : [];
                         for (const [id, fieldArr] of entries) {
                              await handleEntry(redis, sub, group, id, fieldArr, logger);
                         }
                    }

                    // 2) Read brand-new messages (blocking up to BLOCK_MS).
                    const args = [
                         'GROUP', group, consumer,
                         'COUNT', BATCH,
                         'BLOCK', BLOCK_MS,
                         'STREAMS', ...streams, ...streams.map(() => '>'),
                    ];
                    const result = await redis.xreadgroup(...args);
                    if (result) {
                         for (const [stream, entries] of result) {
                              const sub = byStream.get(stream);
                              for (const [id, fieldArr] of entries) {
                                   await handleEntry(redis, sub, group, id, fieldArr, logger);
                              }
                         }
                    }
               } catch (err) {
                    logger.error(`Stream consumer loop error (${group})`, { error: err.message });
                    await new Promise(r => setTimeout(r, 1000)); // back off, then retry
               }
          }
     }

     async function start() {
          for (const sub of subscriptions) {
               await ensureGroup(redis, sub.stream, group, logger);
          }
          running = true;
          logger.info(`Stream consumer "${group}" running on: ${streams.join(', ')}`);
          loop(); // fire-and-forget background loop
     }

     function stop() {
          running = false;
          logger.info(`Stream consumer "${group}" stopped`);
     }

     return { start, stop };
}

module.exports = { publishToStream, createStreamConsumer };
