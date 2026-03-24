// src/workers/mainLoop.ts
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { getActiveMarket, getLastTradePrice, placeBet } from '../api/polymarketApi';
import { saveCandle, getLastNCandles } from '../db/candles';
import { saveTrade } from '../db/trades';
import { checkSignal } from '../trading/strategy';
import { martingale } from '../trading/martingale';
import { updateVirtualBalance } from '../trading/trader';
import { sendNotification } from '../utils/notifier';
import { logger } from '../utils/logger';
import { MarketState, PendingBet, ActiveSignal } from '../types';
import { getRealBalance, getMaticBalance } from '../trading/trader';
import { printDashboard } from '../utils/dashboard';

const PAUSE_FLAG = 'pause.flag';
export const BOT_START_TIME = Math.floor(Date.now() / 1000);

const marketStates: Map<string, MarketState> = new Map();
const lastLogs: string[] = [];
const sessionStats = { wins: 0, losses: 0, sessionProfit: 0 };

function logToDashboard(msg: string) {
  lastLogs.push(msg);
  if (lastLogs.length > 50) lastLogs.shift();
  logger.info(msg);
}

export async function startMainLoop() {
  logToDashboard('Starting main trading loop...');

  // Initialize states
  for (const coin of config.COINS) {
    const intervals = [5, 15]; // All possible
    for (const interval of intervals) {
      if (config.INTERVAL === interval) {
        const label = `${coin}_${interval}m`;
        marketStates.set(label, {
          last_ts: 0,
          processed_ts: 0,
          pending_bet: null,
          active_signal: null,
          startup_candles: 0,
          coin: coin,
          interval: interval,
          label: label,
          candles: []
        });
      }
    }
  }

  // Clear screen once at start
  process.stdout.write('\x1B[2J\x1B[H');
  logToDashboard('Starting main trading loop...');

  setInterval(tick, 1000);
}

async function tick() {
  try {
    const nowTs = Math.floor(Date.now() / 1000);

    for (const [label, state] of marketStates) {
      await processMarketStep(state, nowTs);
    }

    await handleExecution(nowTs);

    // 3. Update Dashboard
    const isPaused = fs.existsSync(PAUSE_FLAG);
    const realBal = await getRealBalance().catch(() => 0);
    const maticBal = await getMaticBalance().catch(() => 0);
    printDashboard(marketStates, realBal, maticBal, isPaused, lastLogs, sessionStats);

  } catch (error) {
    logger.error('Error in main tick loop:', error);
  }
}

async function processMarketStep(state: MarketState, nowTs: number) {
  const intervalSec = state.interval * 60;
  const floorTs = Math.floor(nowTs / intervalSec) * intervalSec;

  if (floorTs > state.last_ts) {
    state.last_ts = floorTs;

    // 1. Fetch closed market (offset = -interval)
    const closedMarket = await getActiveMarket(state.coin, -state.interval, state.interval);
    if (!closedMarket) return;

    const closePrice = await getLastTradePrice(closedMarket.yes_token);
    if (closePrice === null) return;

    // 2. Resolve pending bet
    if (state.pending_bet && state.pending_bet.timestamp === closedMarket.timestamp) {
      const { direction, amount, order_type, buy_price, shares } = state.pending_bet;
      const marketWon = direction === 'YES' ? closePrice > 0.5 : closePrice < 0.5;

      // For Limit orders, check if price actually reached the limit
      const orderFilled = order_type === 'FOK' ? true :
        (direction === 'YES' ? closePrice >= buy_price : (1 - closePrice) >= buy_price);

      if (orderFilled) {
        if (marketWon) {
          martingale.win(state.label);
          updateVirtualBalance(shares * 1.0);

          const pnlValue = shares - amount;
          sessionStats.wins++;
          sessionStats.sessionProfit += pnlValue;

          const msg = `✅ TRADE WON (${state.label}) | PnL: +$${pnlValue.toFixed(2)}`;
          logToDashboard(msg);
          await sendNotification(
            `✅ <b>TRADE WON (${state.label})</b>\n` +
            `───────────────────────\n` +
            `📊 <b>Result:</b> ${closePrice.toFixed(4)}\n` +
            `💰 <b>Payout:</b> +$${shares.toFixed(2)}\n` +
            `📈 <b>PnL:</b> +$${(shares - amount).toFixed(2)}\n` +
            `📝 <b>Level:</b> L1 Reset`
          );

          await saveTrade({
            timestamp: nowTs,
            market_id: closedMarket.market_id,
            direction,
            amount,
            result: 'WIN',
            payout: shares,
            order_type,
            interval: state.interval,
            claimed: 0,
            outcome_index: direction === 'YES' ? 0 : 1
          });
        } else {
          martingale.lose(state.label);

          const pnlValue = -amount;
          sessionStats.losses++;
          sessionStats.sessionProfit += pnlValue;

          const msg = `❌ TRADE LOST (${state.label}) | PnL: -$${amount.toFixed(2)}`;
          logToDashboard(msg);
          await sendNotification(
            `❌ <b>TRADE LOST (${state.label})</b>\n` +
            `───────────────────────\n` +
            `📊 <b>Result:</b> ${closePrice.toFixed(4)}\n` +
            `💰 <b>Loss:</b> -$${amount.toFixed(2)}\n` +
            `⚠️ <b>Action:</b> Moving to L${martingale.getStep(state.label) + 1}`
          );

          await saveTrade({
            timestamp: nowTs,
            market_id: closedMarket.market_id,
            direction,
            amount,
            result: 'LOSS',
            payout: 0,
            order_type,
            interval: state.interval,
            claimed: 0,
            outcome_index: direction === 'YES' ? 0 : 1
          });
        }
      } else {
        const msg = `⚠️ ORDER NOT FILLED (${state.label})`;
        logToDashboard(msg);
        await sendNotification(
          `⚠️ <b>ORDER NOT FILLED (${state.label})</b>\n` +
          `───────────────────────\n` +
          `Price did not reach ${buy_price}`
        );
      }
      state.pending_bet = null;
    }

    // 3. Save candle to DB
    await saveCandle({
      market_id: closedMarket.market_id,
      token_id: closedMarket.yes_token,
      timestamp: closedMarket.timestamp,
      close_price: closePrice,
      interval: state.interval,
      coin: state.coin
    });
    state.startup_candles++;

    // 4. Update trend in state (only since start as requested)
    const candles = await getLastNCandles(4, state.interval, state.coin, BOT_START_TIME);
    state.candles = candles.map(c => c.close_price > 0.5 ? '1' : '0');

    const closes = candles.slice(-3).map(c => c.close_price);
    const signal = checkSignal(closes);

    if (signal && !fs.existsSync(PAUSE_FLAG) && state.startup_candles >= 3) {
      const nextMarket = await getActiveMarket(state.coin, 0, state.interval);
      if (nextMarket) {
        state.active_signal = {
          direction: signal,
          retry_until: nowTs + 30,
          amount: martingale.getBet(state.label),
          timestamp: nextMarket.timestamp,
        };
        logToDashboard(`📈 signal generated: ${state.coin} ${signal}`);
      }
    }
  }
}

async function handleExecution(nowTs: number) {
  const anyPending = Array.from(marketStates.values()).some(s => s.pending_bet);
  if (anyPending) return;

  // Recovery lock: prioritize the coin with the highest martingale step
  let recoveryLabel: string | null = null;
  let maxStep = -1;
  for (const [label, state] of marketStates) {
    const step = martingale.getStep(label);
    if (step > 0 && step > maxStep) {
      maxStep = step;
      recoveryLabel = label;
    }
  }

  const candidates = Array.from(marketStates.entries())
    .filter(([_, s]) => s.active_signal && nowTs <= s.active_signal.retry_until)
    .map(([label]) => label);

  if (candidates.length === 0) return;

  let chosenLabel: string | null = null;
  if (recoveryLabel && candidates.includes(recoveryLabel)) {
    chosenLabel = recoveryLabel;
  } else if (!recoveryLabel) {
    // SOL priority as per spec
    chosenLabel = candidates.find(l => l.startsWith('SOL')) || candidates[0];
  }

  if (chosenLabel) {
    const state = marketStates.get(chosenLabel)!;
    const signal = state.active_signal!;
    const market = await getActiveMarket(state.coin, 0, state.interval);

    if (market && market.timestamp === signal.timestamp) {
      const targetToken = signal.direction === 'YES' ? market.yes_token : market.no_token;
      const currentStep = martingale.getStep(state.label);

      const orderType = currentStep === 0 ? 'FOK' : 'GTC';
      const limitPrice = currentStep === 0 ? 0.99 : (currentStep === 1 ? 0.49 : 0.50);

      logToDashboard(`🚀 Placing trade: ${state.coin} ${signal.direction} @ ${limitPrice} ($${signal.amount})`);
      const success = await placeBet(targetToken, signal.amount, state.coin, limitPrice, orderType);
      if (success) {
        state.pending_bet = {
          direction: signal.direction,
          timestamp: signal.timestamp,
          amount: signal.amount,
          shares: signal.amount / limitPrice,
          order_type: orderType,
          buy_price: limitPrice,
        };
        state.active_signal = null;

        logToDashboard(`✅ Trade placed successfully!`);
        await sendNotification(
          `🚀 <b>BUY SIGNAL FILLED</b>\n` +
          `───────────────────────\n` +
          `📦 <b>Asset:</b> ${state.coin} (${state.interval}m)\n` +
          `↔️ <b>Side:</b> ${signal.direction}\n` +
          `📊 <b>Level:</b> L${currentStep + 1}\n` +
          `💰 <b>Price:</b> $${limitPrice.toFixed(2)}\n` +
          `💵 <b>Amount:</b> $${signal.amount.toFixed(2)}\n` +
          `✅ <b>Status:</b> Filled`
        );
      } else {
        logToDashboard(`❌ Trade placement failed.`);
      }
    }

    // Clear other signals to prevent multiple entries (mutual exclusion)
    for (const label of candidates) {
      marketStates.get(label)!.active_signal = null;
    }
  }
}
