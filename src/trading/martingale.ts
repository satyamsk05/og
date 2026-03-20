// src/trading/martingale.ts
import fs from 'fs';
import path from 'path';

const BET_SEQUENCE = [3, 6, 13, 28, 60];  // USDC amounts per level
const STATE_FILE = path.join('data', 'martingale_state.json');

export class Martingale {
  private loadAll(): Record<string, number> {
    if (!fs.existsSync(STATE_FILE)) return {};
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      return {};
    }
  }

  private saveAll(state: Record<string, number>): void {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  getBet(coin: string): number {
    const step = this.getStep(coin);
    return BET_SEQUENCE[step] || BET_SEQUENCE[0];
  }

  getStep(coin: string): number {
    const state = this.loadAll();
    return state[coin] || 0;
  }

  win(coin: string): void {
    const state = this.loadAll();
    state[coin] = 0; // Reset to L1
    this.saveAll(state);
  }

  lose(coin: string): void {
    const state = this.loadAll();
    let step = state[coin] || 0;
    if (step < BET_SEQUENCE.length - 1) {
      step++;
    } else {
      step = 0; // Max reached, reset
    }
    state[coin] = step;
    this.saveAll(state);
  }

  resetAll(): void {
    this.saveAll({});
  }

  getMaxSteps(): number {
    return BET_SEQUENCE.length;
  }
}

export const martingale = new Martingale();
export const resetAllMartingale = () => martingale.resetAll();
export { BET_SEQUENCE };
