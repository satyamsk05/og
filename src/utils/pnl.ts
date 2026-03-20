import { logger } from "./logger";

interface TradeRecord {
  asset: string;
  timeframe: string;
  direction: string;
  buyPrice: number;
  sellPrice: number;
  amount: number;
  pnl: number;
  reason: string;
  time: Date;
}

class PnLTracker {
  private trades: TradeRecord[] = [];
  private sessionStart: Date = new Date();

  record(trade: TradeRecord): void {
    this.trades.push(trade);
    this.printSummary(trade);
  }

  private printSummary(latest: TradeRecord): void {
    const totalPnL = this.getTotalPnL();
    const wins = this.trades.filter((t) => t.pnl > 0).length;
    const losses = this.trades.filter((t) => t.pnl <= 0).length;
    const sign = latest.pnl >= 0 ? "+" : "";

    logger.info(
      `Trade #${this.trades.length} | ${latest.asset} ${latest.timeframe} ${latest.direction} | ` +
      `Buy: $${latest.buyPrice.toFixed(2)} → Sell: $${latest.sellPrice.toFixed(2)} | ` +
      `PnL: ${sign}$${latest.pnl.toFixed(4)} | ` +
      `Session: $${totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(4)} | ` +
      `W/L: ${wins}/${losses}`
    );
  }

  getTotalPnL(): number {
    return this.trades.reduce((sum, t) => sum + t.pnl, 0);
  }

  printFinalSummary(openCount: number = 0): void {
    const total = this.getTotalPnL();
    const wins = this.trades.filter((t) => t.pnl > 0).length;
    const losses = this.trades.filter((t) => t.pnl <= 0).length;
    const winRate = this.trades.length > 0 ? ((wins / this.trades.length) * 100).toFixed(1) : "0";
    const elapsed = ((Date.now() - this.sessionStart.getTime()) / 1000 / 60).toFixed(1);

    console.log("\n" + "═".repeat(60));
    console.log("SESSION SUMMARY");
    console.log("═".repeat(60));
    console.log(`Duration       : ${elapsed} minutes`);
    console.log(`Completed Trades: ${this.trades.length}`);
    console.log(`Open Positions : ${openCount}`);
    console.log(`Wins / Losses  : ${wins} / ${losses}`);
    console.log(`Win Rate       : ${winRate}%`);
    console.log(`Total P&L      : ${total >= 0 ? "+" : ""}$${total.toFixed(4)}`);
    console.log("═".repeat(60) + "\n");
  }
}

export const pnl = new PnLTracker();
