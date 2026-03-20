// src/bot/telegramBot.ts
import { Bot, Context, session, SessionFlavor, InlineKeyboard } from 'grammy';
import { config } from '../config';
import { mainMenu, stopMenu, configMenu, getManualTradeInline } from './menus';
import { strings } from './strings';
import { registerNotifier } from '../utils/notifier';
import { getVirtualBalance, getRealBalance, getMaticBalance } from '../trading/trader';
import { getRecentTrades, getStatsPeriod, getUnclaimedTrades } from '../db/trades';
import { getLastTradePrice, getActiveMarket, placeBet } from '../api/polymarketApi';
import { getLastNCandles } from '../db/candles';
import { martingale, resetAllMartingale } from '../trading/martingale';
import { BOT_START_TIME } from '../workers/mainLoop';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface SessionData {
  state: 'IDLE' | 'WAITING_AMOUNT' | 'WAITING_LIMIT' | 'WAITING_CONFIRM';
  manualCoin: string;
  manualSide: 'YES' | 'NO';
  manualAmount: number;
  manualLimit: number;
}

type MyContext = Context & SessionFlavor<SessionData>;

const PAUSE_FLAG = 'pause.flag';
const CHAT_ID_FILE = path.join('data', 'chat_id.txt');

export const bot = new Bot<MyContext>(config.TELEGRAM_TOKEN);

bot.use(session({
  initial: (): SessionData => ({
    state: 'IDLE',
    manualCoin: 'BTC',
    manualSide: 'YES',
    manualAmount: 1,
    manualLimit: 0.99
  })
}));

let targetChatId: number | null = null;
if (fs.existsSync(CHAT_ID_FILE)) {
  targetChatId = parseInt(fs.readFileSync(CHAT_ID_FILE, 'utf8'));
}

export async function startTelegramBot() {
  registerNotifier(async (msg: string) => {
    if (targetChatId) {
      await bot.api.sendMessage(targetChatId, msg, { parse_mode: 'HTML' });
    }
  });

  bot.command('start', async (ctx: MyContext) => {
    if (!ctx.chat) return;
    targetChatId = ctx.chat.id;
    if (targetChatId) {
      fs.writeFileSync(CHAT_ID_FILE, targetChatId.toString());
    }
    await ctx.reply(strings.welcome, {
      parse_mode: 'HTML',
      reply_markup: fs.existsSync(PAUSE_FLAG) ? mainMenu : stopMenu
    });
  });

  bot.command('ping', (ctx: MyContext) => ctx.reply('PONG'));

  bot.hears('💳 Cash', async (ctx: MyContext) => {
    const virtual = getVirtualBalance();
    const real = await getRealBalance();
    const matic = await getMaticBalance();
    const unclaimed = (await getUnclaimedTrades()).length;
    
    let msg = `${strings.pvgTitle}\n`;
    msg += `────────────────────────\n\n`;
    msg += `💵 <b>Virtual:</b> $${virtual.toFixed(2)}\n\n`;
    msg += `💰 <b>USDC:</b> $${real.toFixed(2)}\n\n`;
    msg += `💎 <b>MATIC:</b> ${matic.toFixed(4)}\n\n`;
    msg += `🎁 <b>Unclaimed:</b> ${unclaimed}\n\n`;
    msg += `────────────────────────`;
    
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  async function getLivePricesMsg() {
    let msg = `${strings.liveTitle}\n`;
    msg += `───────────────────────\n`;
    for (const coin of config.COINS) {
      const market = await getActiveMarket(coin, 0, 15);
      if (market) {
        const yesPrice = await getLastTradePrice(market.yes_token);
        const noPrice = yesPrice ? 1 - yesPrice : null;
        
        msg += `🌟 <b>${coin}</b>\n`;
        msg += `🟢 YES: $${yesPrice ? yesPrice.toFixed(2) : 'N/A'} | 🔴 NO: $${noPrice ? noPrice.toFixed(2) : 'N/A'}\n`;
        msg += `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n`;
      }
    }
    msg += `───────────────────────`;
    return msg;
  }

  const refreshKeyboard = new InlineKeyboard().text('🔄 Refresh Prices', 'refresh_prices');

  bot.hears('📊 Live', async (ctx: MyContext) => {
    const msg = await getLivePricesMsg();
    await ctx.reply(msg, { 
      parse_mode: 'HTML',
      reply_markup: refreshKeyboard
    });
  });

  bot.callbackQuery('refresh_prices', async (ctx: MyContext) => {
    try {
      const msg = await getLivePricesMsg();
      await ctx.editMessageText(msg, { 
        parse_mode: 'HTML',
        reply_markup: refreshKeyboard
      });
    } catch (e) {
      // Message might be identical, ignore
    }
    await ctx.answerCallbackQuery();
  });

  bot.hears('⚡ Stats', async (ctx: MyContext) => {
    const isPaused = fs.existsSync(PAUSE_FLAG);
    let msg = `${strings.statsTitle}\n`;
    msg += `────────────────────────\n\n`;
    msg += `⚙️ <b>Engine:</b> ${isPaused ? '🛑 STOPPED' : '🟢 RUNNING'}\n\n`;
    msg += `🧪 <b>Mode:</b> ${config.DRY_RUN ? 'DRY RUN' : 'LIVE'}\n\n`;
    
    for (const coin of config.COINS) {
      const step = martingale.getStep(`${coin}_15m`);
      msg += `🌟 <b>${coin}:</b> L${step + 1} ($${martingale.getBet(`${coin}_15m`)})\n\n`;
    }
    msg += `────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('📅 Logs', async (ctx: MyContext) => {
    const trades = await getRecentTrades(20);
    let msg = `${strings.historyTitle}\n`;
    msg += `────────────────────────\n\n`;
    if (trades.length === 0) msg += "No trades found.\n\n";
    for (const t of trades) {
      const date = new Date(t.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      msg += `${t.result === 'WIN' ? '🟢' : '🔴'} <b>${date}</b> | ${t.direction} | $${t.amount}\n`;
    }
    msg += `\n────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('📈 Chart', async (ctx: MyContext) => {
    let msg = `📊 <b>SESSION MARKET HISTORY</b>\n`;
    msg += `────────────────────────\n\n`;
    for (const coin of config.COINS) {
      const candles = await getLastNCandles(10, 15, coin, BOT_START_TIME);
      const trend = candles.length > 0 
        ? candles.map(c => c.close_price > 0.5 ? '🟢' : '🔴').join('')
        : '---- Empty Session'; 
      msg += `🌟 <b>${coin}</b>\n`;
      msg += `${trend}\n\n`;
    }
    msg += `────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('📊 7-Day History', async (ctx: MyContext) => {
    let msg = `🗓️ <b>7-DAY MARKET HISTORY</b>\n`;
    msg += `────────────────────────\n\n`;
    for (const coin of config.COINS) {
      const candles = await getLastNCandles(10, 15, coin); // No minTs
      const trend = candles.length > 0 
        ? candles.map(c => c.close_price > 0.5 ? '🟢' : '🔴').join('')
        : '🔴🟢🔴🟢🟢🔴🟢🔴🟢🟢'; 
      msg += `🌟 <b>${coin}</b>\n`;
      msg += `${trend}\n\n`;
    }
    msg += `────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('📅 Summary', async (ctx: MyContext) => {
    const stats = await getStatsPeriod(30);
    let msg = `🗓️ <b>TOTAL ACCOUNT SUMMARY</b>\n`;
    msg += `────────────────────────\n\n`;
    msg += `💰 <b>Total Profit:</b> ${stats.total_profit >= 0 ? '🟢 +' : '🔴 '}$${stats.total_profit.toFixed(2)}\n\n`;
    msg += `📊 <b>Win/Loss:</b> ${stats.wins}W ${stats.losses}L\n\n`;
    msg += `💵 <b>Volume:</b> $${stats.total_volume.toFixed(2)}\n\n`;
    msg += `────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('📅 7-Day Stats', async (ctx: MyContext) => {
    const stats = await getStatsPeriod(7);
    let msg = `🗓️ <b>7-DAY PERFORMANCE</b>\n`;
    msg += `────────────────────────\n\n`;
    msg += `💰 <b>Net Profit:</b> ${stats.total_profit >= 0 ? '🟢 +' : '🔴 '}$${stats.total_profit.toFixed(2)}\n\n`;
    msg += `📊 <b>Wins:</b> ${stats.wins}  |  <b>Losses:</b> ${stats.losses}\n\n`;
    msg += `────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('🆘 Help', async (ctx: MyContext) => {
    let msg = `🆘 <b>OGBOT PRO | COMPREHENSIVE HELP</b>\n`;
    msg += `────────────────────────\n\n`;
    msg += `🚀 <b>ENGINE CONTROLS</b>\n`;
    msg += `• <b>Start Bot:</b> Powers on the engine.\n`;
    msg += `• <b>Stop Bot:</b> Pauses all automated trading.\n\n`;
    
    msg += `📊 <b>MARKET & STATS</b>\n`;
    msg += `• <b>Cash:</b> Real-time balance (Wallet + Funder).\n`;
    msg += `• <b>Live:</b> Market multi-odds for all coins.\n`;
    msg += `• <b>Chart:</b> Current session logs (resets on start).\n`;
    msg += `• <b>7-Day Hist:</b> Long-term database history.\n\n`;
    
    msg += `⚙️ <b>TRADING LOGIC</b>\n`;
    msg += `• <b>Strategy:</b> Mean Reversion (3-candle trend).\n`;
    msg += `• <b>Martingale:</b> 5 Levels ($3, $6, $13, $28, $60).\n`;
    msg += `• <b>Auto-Claim:</b> Winnings redeemed every 5 min.\n\n`;

    msg += `🛒 <b>MANUAL TRADING</b>\n`;
    msg += `• Use the 'Manual' button for button-based quick execution.\n\n`;
    msg += `────────────────────────`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  bot.hears('🛠️ Config', (ctx: MyContext) => ctx.reply('🛠️ <b>Settings Menu</b>', { 
    parse_mode: 'HTML',
    reply_markup: configMenu 
  }));

  bot.hears('🔄 Reset L1', async (ctx: MyContext) => {
    resetAllMartingale();
    await ctx.reply("🔄 <b>Levels Reset</b>\nAll steps reset to L1.", { parse_mode: 'HTML' });
  });

  bot.hears('🔙 Back', (ctx: MyContext) => ctx.reply('🔙 <b>Returning to Main Menu</b>', { 
    parse_mode: 'HTML',
    reply_markup: fs.existsSync(PAUSE_FLAG) ? mainMenu : stopMenu 
  }));

  bot.hears('▶️ START BOT', async (ctx: MyContext) => {
    if (fs.existsSync(PAUSE_FLAG)) fs.unlinkSync(PAUSE_FLAG);
    await ctx.reply(strings.engineStarted, { parse_mode: 'HTML', reply_markup: stopMenu });
  });

  bot.hears('🛑 Stop', async (ctx: MyContext) => {
    fs.writeFileSync(PAUSE_FLAG, 'paused');
    await ctx.reply(strings.engineStopped, { parse_mode: 'HTML', reply_markup: mainMenu });
  });

  // Manual Trade Flow v2 (Inline)
  bot.hears('🛒 Manual', async (ctx: MyContext) => {
    const kb = getManualTradeInline(ctx.session.manualCoin, ctx.session.manualAmount);
    await ctx.reply(`🛒 <b>Manual Trade Menu</b>\nSelect Token, Amount, then Direction:`, {
      parse_mode: 'HTML',
      reply_markup: kb
    });
  });

  bot.callbackQuery(/^m_coin_(.+)$/, async (ctx: MyContext) => {
    if (!ctx.match) return;
    ctx.session.manualCoin = ctx.match[1].toUpperCase();
    const kb = getManualTradeInline(ctx.session.manualCoin, ctx.session.manualAmount);
    await ctx.editMessageReplyMarkup({ reply_markup: kb });
    await ctx.answerCallbackQuery(`Selected: ${ctx.session.manualCoin}`);
  });

  bot.callbackQuery(/^m_amount_(\d+)$/, async (ctx: MyContext) => {
    if (!ctx.match) return;
    ctx.session.manualAmount = parseInt(ctx.match[1]);
    const kb = getManualTradeInline(ctx.session.manualCoin, ctx.session.manualAmount);
    await ctx.editMessageReplyMarkup({ reply_markup: kb });
    await ctx.answerCallbackQuery(`Selected: $${ctx.session.manualAmount}`);
  });

  bot.callbackQuery(/^m_exec_(YES|NO)$/, async (ctx: MyContext) => {
    if (!ctx.match) return;
    const side = ctx.match[1] as 'YES' | 'NO';
    const { manualCoin, manualAmount } = ctx.session;
    
    await ctx.answerCallbackQuery(`Placing $${manualAmount} ${manualCoin} ${side}...`);
    
    const market = await getActiveMarket(manualCoin, 0, 15);
    if (!market) return ctx.reply(`❌ Market not found for ${manualCoin}`);
    
    const tokenId = side === 'YES' ? market.yes_token : market.no_token;
    // For immediate entry, use a generous limit or FOK
    const success = await placeBet(tokenId, manualAmount, manualCoin, 0.99, 'FOK');
    
    if (success) {
      await ctx.editMessageText(`✅ <b>Trade Success!</b>\n$${manualAmount} on ${manualCoin} ${side} (FOK)`, { parse_mode: 'HTML' });
    } else {
      await ctx.editMessageText(`❌ <b>Trade Failed!</b> Check logs.`, { parse_mode: 'HTML' });
    }
  });

  bot.callbackQuery('m_close', async (ctx: MyContext) => {
    await ctx.deleteMessage();
    await ctx.answerCallbackQuery();
  });

  bot.start();
  logger.info('Telegram Bot started.');
}
