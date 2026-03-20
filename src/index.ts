// src/index.ts
import { initDb } from './db/database';
import { startMainLoop } from './workers/mainLoop';
import { startTelegramBot } from './bot/telegramBot';
import { startHeartbeatWorker } from './workers/heartbeatWorker';
import { startRedemptionWorker } from './workers/redemptionWorker';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger';

async function main() {
  logger.info('Tredebot v5.1 starting...');
  
  // Ensure dirs exist
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });
  
  // Init DB
  try {
    await initDb();
    logger.info('Database initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
  }
  
  // Start everything
  startHeartbeatWorker();
  startRedemptionWorker();
  
  await startTelegramBot();
  await startMainLoop();
}

main().catch((error) => {
  logger.error('Fatal error in main:', error);
});
