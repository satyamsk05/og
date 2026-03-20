// src/workers/heartbeatWorker.ts
import { sendHeartbeat } from '../api/polymarketApi';
import { logger } from '../utils/logger';

export function startHeartbeatWorker(): void {
  setInterval(async () => {
    try {
      await sendHeartbeat();
    } catch (e) {
      logger.error('Heartbeat error:', e);
    }
  }, 7000); // every 7 seconds
}
