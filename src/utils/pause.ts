import * as fs from "fs";
import { logger } from "./logger";

const PAUSE_FILE = "./pause.flag";

export const pauseManager = {
  /**
   * Returns true if the bot is currently paused.
   */
  isPaused(): boolean {
    return fs.existsSync(PAUSE_FILE);
  },

  /**
   * Toggles the paused state and returns the new state.
   */
  toggle(): boolean {
    const paused = this.isPaused();
    if (paused) {
      if (fs.existsSync(PAUSE_FILE)) fs.unlinkSync(PAUSE_FILE);
      logger.info("Bot RESUMED via Control");
      return false;
    } else {
      fs.writeFileSync(PAUSE_FILE, "paused");
      logger.warn("Bot PAUSED via Control");
      return true;
    }
  },

  /**
   * Set explicit state.
   */
  setPaused(state: boolean): void {
    if (state) {
      if (!fs.existsSync(PAUSE_FILE)) fs.writeFileSync(PAUSE_FILE, "paused");
    } else {
      if (fs.existsSync(PAUSE_FILE)) fs.unlinkSync(PAUSE_FILE);
    }
  }
};
