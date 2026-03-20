// src/workers/redemptionWorker.ts
import { config } from '../config';
import { fetchRedeemablePositions, gaslessRedeem, redeemWinnings } from '../api/polymarketApi';
import { sendNotification } from '../utils/notifier';
import { logger } from '../utils/logger';

export function startRedemptionWorker(): void {
  setInterval(async () => {
    try {
      const wallets = [...new Set([config.WALLET_ADDRESS, config.FUNDER_ADDRESS].filter(Boolean))];
      for (const wallet of wallets) {
        if (!wallet) continue;
        const positions = await fetchRedeemablePositions(wallet);
        for (const pos of positions) {
          if (pos.payout <= 0) continue;
          
          const success = await gaslessRedeem(pos.condition_id, pos.outcome_index, wallet)
            || await redeemWinnings(pos.condition_id, pos.outcome_index);
            
          if (success) {
            sendNotification(`🎁 <b>AUTO-CLAIM COMPLETE</b>\n$${pos.payout.toFixed(2)} USDC claimed for ${wallet.substring(0, 6)}...`);
          }
        }
      }
    } catch (e) {
      logger.error('Redemption worker error:', e);
    }
  }, 300_000); // every 5 minutes
}
