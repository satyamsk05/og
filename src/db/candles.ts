// src/db/candles.ts
import { readJson, writeJson } from './database';
import { Candle } from '../types';
import fs from 'fs';
import path from 'path';

const FILENAME = 'candles.json';

export async function saveCandle(candle: Candle): Promise<void> {
  const candles = readJson<Candle>(FILENAME);
  // Check uniqueness (coin, interval, timestamp)
  const exists = candles.some(c => c.coin === candle.coin && c.interval === candle.interval && c.timestamp === candle.timestamp);
  if (!exists) {
    candles.push(candle);
    writeJson(FILENAME, candles);
  }
}

export async function getLastNCandles(n: number, interval: number, coin: string, minTs: number = 0): Promise<Candle[]> {
  const candles = readJson<Candle>(FILENAME);
  const filtered = candles
    .filter(c => c.interval === interval && c.coin === coin && c.timestamp >= minTs)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, n);
  return filtered.reverse(); // Return in chronological order
}

export async function exportCandlesToFile(coin: string, days: number, interval: number): Promise<string> {
  const nDaysAgo = Math.floor(Date.now() / 1000) - (days * 86400);
  const candles = readJson<Candle>(FILENAME);
  const filtered = candles
    .filter(c => c.coin === coin && c.interval === interval && c.timestamp >= nDaysAgo)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  const csvContent = [
    'timestamp,market_id,token_id,close_price,interval,coin',
    ...filtered.map(r => `${r.timestamp},${r.market_id},${r.token_id},${r.close_price},${r.interval},${r.coin}`)
  ].join('\n');
  
  const filePath = path.join('data', `${coin}_${interval}m_history.csv`);
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}
