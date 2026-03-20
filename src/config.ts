import dotenv from 'dotenv';
import { ethers } from 'ethers';
dotenv.config();

export const config = {
  // Telegram
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN!,

// Polymarket API
  POLY_API_KEY: process.env.POLY_API_KEY || process.env.API_KEY || '',
  POLY_API_SECRET: process.env.POLY_API_SECRET || process.env.API_SECRET || '',
  POLY_PASSPHRASE: process.env.POLY_PASSPHRASE || process.env.PASSPHRASE || '',
  POLY_PRIVATE_KEY: process.env.POLY_PRIVATE_KEY || process.env.PRIVATE_KEY || '',
  FUNDER_ADDRESS: process.env.POLY_FUNDER || process.env.FUNDER_ADDRESS || '',
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || 
    (process.env.POLY_PRIVATE_KEY || process.env.PRIVATE_KEY ? 
      new ethers.Wallet(process.env.POLY_PRIVATE_KEY || process.env.PRIVATE_KEY!).address : ''),

  // Builder API (gasless redemption)
  BUILDER_API_KEY: process.env.BUILDER_API_KEY || '',
  BUILDER_SECRET: process.env.BUILDER_SECRET || '',
  BUILDER_PASSPHRASE: process.env.BUILDER_PASSPHRASE || '',
  RELAYER_URL: process.env.RELAYER_URL || 'https://relayer-v2.polymarket.com',

  // Network
  RPC_URL: process.env.RPC_URL || 'https://rpc.ankr.com/polygon',

  // Strategy
  DRY_RUN: (process.env.DRY_RUN || 'true').toLowerCase() === 'true',
  INTERVAL: parseInt(process.env.INTERVAL || '15'),
  INITIAL_BET_AMOUNT: parseInt(process.env.INITIAL_BET_AMOUNT || '3'),
  VIRTUAL_BALANCE_START: parseFloat(process.env.VIRTUAL_BALANCE_START || '500'),

  // Hardcoded & Dynamic
  COINS: (process.env.COINS || 'BTC,ETH,SOL,XRP').split(',').map(s => s.trim().toUpperCase()),
  ENABLE_5M: parseInt(process.env.INTERVAL || '15') === 5,
  ENABLE_15M: parseInt(process.env.INTERVAL || '15') === 15,
};
