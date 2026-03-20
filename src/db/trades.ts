// src/db/trades.ts
import { readJson, writeJson } from './database';
import { Trade, StatsResult } from '../types';

const FILENAME = 'trades.json';

export async function saveTrade(trade: Omit<Trade, 'id'>): Promise<void> {
  const trades = readJson<any>(FILENAME);
  const newTrade = { id: trades.length + 1, ...trade };
  trades.push(newTrade);
  writeJson(FILENAME, trades);
}

export async function getRecentTrades(limit: number): Promise<Trade[]> {
  const trades = readJson<Trade>(FILENAME);
  return trades.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function getStatsPeriod(days: number): Promise<StatsResult> {
  const nDaysAgo = Math.floor(Date.now() / 1000) - (days * 86400);
  const trades = readJson<Trade>(FILENAME);
  const filtered = trades.filter(t => t.timestamp >= nDaysAgo);
  
  return {
    wins: filtered.filter(t => t.result === 'WIN').length,
    losses: filtered.filter(t => t.result === 'LOSS').length,
    total_profit: filtered.reduce((acc, t) => acc + (t.payout - t.amount), 0),
    total_volume: filtered.reduce((acc, t) => acc + t.amount, 0)
  };
}

export async function getUnclaimedTrades(): Promise<Trade[]> {
  const trades = readJson<Trade>(FILENAME);
  return trades.filter(t => t.result === 'WIN' && t.claimed === 0);
}

export async function markTradeClaimed(id: number): Promise<void> {
  const trades = readJson<Trade>(FILENAME);
  const trade = trades.find(t => t.id === id);
  if (trade) {
    trade.claimed = 1;
    writeJson(FILENAME, trades);
  }
}
