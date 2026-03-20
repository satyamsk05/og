// src/types.ts

export interface Market {
  market_id: string;
  question: string;
  yes_token: string;
  no_token: string;
  timestamp: number;   // Unix timestamp of candle start
  interval: number;    // 5 or 15
  coin: string;        // "BTC", "ETH", etc.
}

export interface Candle {
  id?: number;
  market_id: string;
  token_id: string;
  timestamp: number;
  close_price: number;  // YES token price 0.00–1.00
  interval: number;
  coin: string;
}

export interface Trade {
  id?: number;
  timestamp: number;
  market_id: string;
  direction: 'YES' | 'NO';
  amount: number;
  result: 'WIN' | 'LOSS';
  payout: number;
  order_type: 'FOK' | 'GTC' | 'Manual' | 'Manual Limit' | 'Auto';
  interval: number;
  claimed: 0 | 1;
  outcome_index: number | null;
}

export interface PendingBet {
  direction: 'YES' | 'NO';
  timestamp: number;
  amount: number;
  shares: number;
  order_type: 'FOK' | 'GTC' | 'Manual' | 'Manual Limit';
  buy_price: number;
}

export interface ActiveSignal {
  direction: 'YES' | 'NO';
  retry_until: number;   // Unix timestamp — expire after 30s
  amount: number;
  timestamp: number;     // market timestamp this signal is for
}

export interface MarketState {
  last_ts: number;
  processed_ts: number;
  pending_bet: PendingBet | null;
  active_signal: ActiveSignal | null;
  startup_candles: number;
  coin: string;
  interval: number;
  label: string;   // e.g. "BTC_15m"
  candles: string[]; // e.g. ["🟢", "🔴", "🟢"]
}

export interface StatsResult {
  wins: number;
  losses: number;
  total_profit: number;
  total_volume: number;
}

export interface RedeemablePosition {
  condition_id: string;
  outcome_index: number;
  payout: number;
  wallet: string;
}
