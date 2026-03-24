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
        
        logger.info(`🔍 Checking redeemable winnings for ${wallet.substring(0, 10)}...`);
        const positions = await fetchRedeemablePositions(wallet);
        
        const redeemable = positions.filter(p => p.payout > 0);
        if (redeemable.length === 0) {
          // logger.info(`No winners found for ${wallet.substring(0,6)}`);
          continue;
        }

        for (const pos of redeemable) {
          logger.info(`🎁 Winner detected! Condition: ${pos.condition_id.substring(0, 8)} | Payout: $${pos.payout.toFixed(2)}`);
          
          const success = await gaslessRedeem(pos.condition_id, pos.outcome_index, wallet)
            || await redeemWinnings(pos.condition_id, pos.outcome_index);
            
          if (success) {
            logger.info(`✅ Successfully claimed $${pos.payout.toFixed(2)} for ${wallet}`);
            sendNotification(`🎁 <b>AUTO-CLAIM COMPLETE</b>\n$${pos.payout.toFixed(2)} USDC claimed successfully!`);
          } else {
            logger.error(`❌ Failed to claim winnings for ${pos.condition_id}. Check Builder API keys.`);
          }
        }
      }
    } catch (e) {
      logger.error('Redemption worker error:', e);
    }
  }, 300_000); // every 5 minutes
}
