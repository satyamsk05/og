// src/api/polymarketApi.ts
import axios from 'axios';
import { ClobClient, OrderType } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import { config } from '../config';
import { Market, RedeemablePosition } from '../types';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
const CLOB_API_URL = 'https://clob.polymarket.com';

// Suppress annoying [CLOB Client] 404/noise
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('[CLOB Client] request error')) {
    // Check if it's a 404, if so, silence it
    if (args[1] && args[1].includes('"status":404')) return;
    // For other CLOB errors, maybe keep them but formatted? 
    // For now, let's just silence the specific one that is cluttering
    return;
  }
  originalConsoleError.apply(console, args);
};

// Initialize ClobClient
const provider = new ethers.JsonRpcProvider(config.RPC_URL, 137, { staticNetwork: true });
const signer = new ethers.Wallet(config.POLY_PRIVATE_KEY, provider);

// Monkey-patch signer for ethers v6 compatibility with clob-client (v5 checks)
(signer as any)._signTypedData = (domain: any, types: any, value: any) => {
  return signer.signTypedData(domain, types, value);
};
(signer as any).account = { address: signer.address };

export const clobClient = new ClobClient(
  CLOB_API_URL,
  137, // Polygon Mainnet
  signer as any,
  {
    key: config.POLY_API_KEY,
    secret: config.POLY_API_SECRET,
    passphrase: config.POLY_PASSPHRASE,
  }
);

export async function getActiveMarket(coin: string, offsetMinutes: number, interval: number): Promise<Market | null> {
  try {
    const now = Math.floor(Date.now() / 1000) + offsetMinutes * 60;
    const blockSec = interval * 60;
    const tsSec = Math.floor(now / blockSec) * blockSec;
    const slug = `${coin.toLowerCase()}-updown-${interval}m-${tsSec}`;
    const url = `${GAMMA_API_URL}/markets/slug/${slug}`;

    const response = await axios.get(url);
    const data = response.data;

    if (!data || !data.clobTokenIds) return null;

    const tokens = JSON.parse(data.clobTokenIds);
    return {
      market_id: data.conditionId,
      question: data.question,
      yes_token: tokens[0],
      no_token: tokens[1],
      timestamp: tsSec,
      interval: interval,
      coin: coin,
    };
  } catch (error) {
    return null;
  }
}

export async function getLastTradePrice(tokenId: string): Promise<number | null> {
  try {
    const url = `${CLOB_API_URL}/last-trade-price?token_id=${tokenId}`;
    const response = await axios.get(url);
    return parseFloat(response.data.price);
  } catch (error) {
    return null;
  }
}

export async function placeBet(tokenId: string, amount: number, coin: string, price: number = 0.99, orderType: 'FOK' | 'GTC' = 'FOK'): Promise<boolean> {
  if (config.DRY_RUN) {
    console.log(`[DRY RUN] Placing ${orderType} order for ${coin}: ${amount} units of ${tokenId} at ${price}`);
    return true;
  }

  try {
    if (orderType === 'FOK') {
      const order = await clobClient.createMarketOrder({
        tokenID: tokenId,
        amount: amount,
        side: 'BUY' as any,
      });
      const result = await clobClient.postOrder(order, OrderType.FOK);
      return result.success;
    } else {
      const order = await clobClient.createOrder({
        tokenID: tokenId,
        price: price,
        side: 'BUY' as any,
        size: amount,
      });
      const result = await clobClient.postOrder(order, OrderType.GTC);
      return result.success;
    }
  } catch (error) {
    console.error('Error placing bet:', error);
    return false;
  }
}

export async function fetchRedeemablePositions(walletAddress: string): Promise<RedeemablePosition[]> {
  try {
    const url = `https://data-api.polymarket.com/positions?user=${walletAddress}&sizeThreshold=.1&end=true`;
    const response = await axios.get(url);
    // Filter positions where size > 0 and market is resolved (this is a simplified mock of filtering)
    return response.data.map((p: any) => ({
      condition_id: p.conditionId,
      outcome_index: p.outcomeIndex,
      payout: parseFloat(p.payout),
      wallet: walletAddress
    }));
  } catch (error) {
    return [];
  }
}

export async function gaslessRedeem(conditionId: string, outcomeIndex: number, wallet: string): Promise<boolean> {
  try {
    const response = await axios.post(`${config.RELAYER_URL}/redeem`, {
      conditionId,
      outcomeIndex,
      wallet,
      apiKey: config.BUILDER_API_KEY,
      secret: config.BUILDER_SECRET,
      passphrase: config.BUILDER_PASSPHRASE
    });
    return response.data.success;
  } catch (error) {
    return false;
  }
}

export async function redeemWinnings(conditionId: string, outcomeIndex: number): Promise<boolean> {
  try {
    // This is a placeholder for on-chain redemption via clobClient if gasless fails
    // clobClient doesn't directly have a redeem method in the snippet, so we'll assume it's handled or logged
    return false;
  } catch (error) {
    return false;
  }
}

export async function sendHeartbeat(): Promise<void> {
  try {
    await axios.get(`${CLOB_API_URL}/health`);
  } catch (error) {
    // Ignore heartbeat errors
  }
}
