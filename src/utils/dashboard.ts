// src/utils/dashboard.ts
import chalk from 'chalk';
import { MarketState } from '../types';
import { martingale } from '../trading/martingale';
import { config } from '../config';
import readline from 'readline';

export function printDashboard(
  marketStates: Map<string, MarketState>,
  totalBalance: number,
  maticBalance: number,
  isPaused: boolean,
  lastLogs: string[],
  stats: { wins: number; losses: number; sessionProfit: number }
) {
  readline.cursorTo(process.stdout, 0, 0);
  process.stdout.write('\x1B[?25l'); // Hide cursor

  const now = new Date().toLocaleTimeString('en-US', { hour12: true });
  const width = 76;

  // 1. TOP HEADER BOX
  console.log(chalk.blue(` ╔${'═'.repeat(width - 2)}╗`));
  console.log(chalk.blue(` ║ `) + chalk.bold.white(' OGBOT PRO TERMINAL v5.8 ').padEnd(width - 24) + chalk.gray(`│ `) + chalk.cyan(now) + chalk.blue(` ║`));
  console.log(chalk.blue(` ╠${'═'.repeat(width - 2)}╣`));

  // 2. METRICS BOX
  const modeStr = config.DRY_RUN ? chalk.bold.bgYellow.black(' DRY RUN ') : chalk.bold.bgRed.white('  LIVE   ');
  const engineStr = isPaused 
    ? chalk.bold.red(' ● STOPPED ') 
    : chalk.bold.green(' ● RUNNING ');
  
  const profitColor = stats.sessionProfit >= 0 ? chalk.green : chalk.red;
  const pnlVal = `$${Math.abs(stats.sessionProfit).toFixed(2)}`;
  
  // Manual spacing to avoid ANSI padEnd issues
  const balStr = `BALANCE: ${chalk.green(`$${totalBalance.toFixed(2)}`)}`;
  const pnlStr = `PNL: ${profitColor(pnlVal)}`;
  const maticStr = `MATIC:   ${chalk.magenta(maticBalance.toFixed(4))}`;
  const wlStr = `W/L: ${chalk.green(stats.wins)}W - ${chalk.red(stats.losses)}L`;
  const modePart = `MODE: ${modeStr}`;
  const enginePart = `ENGINE: ${engineStr}`;

  console.log(chalk.blue(` ║ `) + balStr.padEnd(30 + 10) + pnlStr.padEnd(25 + 10) + modePart.padEnd(12) + chalk.blue(`║`));
  console.log(chalk.blue(` ║ `) + maticStr.padEnd(30 + 10) + wlStr.padEnd(25 + 10) + enginePart.padEnd(12) + chalk.blue(`║`));
  console.log(chalk.blue(` ╠${'═'.repeat(width - 2)}╣`));

  // 3. MARKET DATA BOX
  console.log(chalk.blue(` ║ `) + chalk.bold.cyan(`${'INSTRUMENT'.padEnd(17)}${'LVL'.padEnd(8)}${'BET'.padEnd(12)}${'HISTORY'.padEnd(12)}${'STATUS'}`) + chalk.blue(` ║`));
  console.log(chalk.blue(` ╟${'─'.repeat(width - 2)}╢`));

  for (const [label, state] of Array.from(marketStates.entries())) {
    const step = martingale.getStep(label);
    const levelStr = `L${step}`.padEnd(8);
    const betStr = `$${martingale.getBet(label)}`.padEnd(12);
    const trend = state.candles.join('') || chalk.gray('----');
    
    let status = chalk.gray('● SCANNING');
    if (state.pending_bet) {
      const side = state.pending_bet.direction === 'YES' ? chalk.green('YES') : chalk.red('NO');
      status = chalk.bold.yellow(`🚀 ${side} FILLED`);
    } else if (state.active_signal) {
      const side = state.active_signal.direction === 'YES' ? chalk.green('UP') : chalk.red('DOWN');
      status = chalk.bold.cyan(`📊 ${side} SIGNAL`);
    }

    const coinRow = `${state.coin} (${state.interval}m)`.padEnd(17);
    const line = `${coinRow}${levelStr}${betStr}${trend.padEnd(12)}${status}`;
    console.log(chalk.blue(` ║ `) + line.padEnd(width - 4) + chalk.blue(` ║`));
  }

  // 4. LOGS BOX
  console.log(chalk.blue(` ╠${'═'.repeat(width - 2)}╣`));
  console.log(chalk.blue(` ║ `) + chalk.bold.yellow(' [ LIVE SESSION LOGS ] ').padEnd(width - 4) + chalk.blue(` ║`));
  
  const displayLogs = lastLogs.slice(-4);
  for (let i = 0; i < 4; i++) {
    const logLine = displayLogs[i] || '';
    const formatted = logLine ? `${chalk.gray('»')} ${logLine.substring(0, width - 8)}` : '';
    console.log(chalk.blue(` ║ `) + formatted.padEnd(width - 4) + chalk.blue(` ║`));
  }

  console.log(chalk.blue(` ╚${'═'.repeat(width - 2)}╝`));
  process.stdout.write('\x1B[K'); // Prevent trailing artifacts
}
