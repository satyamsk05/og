import fs from 'fs';
import path from 'path';
import { clobClient } from '../api/polymarketApi';
import { config } from '../config';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

const VIRTUAL_BALANCE_FILE = path.join('data', 'virtual_balance.json');

export function getVirtualBalance(): number {
  if (!fs.existsSync(VIRTUAL_BALANCE_FILE)) {
    return config.VIRTUAL_BALANCE_START;
  }
  try {
    const data = JSON.parse(fs.readFileSync(VIRTUAL_BALANCE_FILE, 'utf8'));
    return data.balance;
  } catch {
    return config.VIRTUAL_BALANCE_START;
  }
}

export function updateVirtualBalance(delta: number): void {
  const current = getVirtualBalance();
  const next = current + delta;
  fs.writeFileSync(VIRTUAL_BALANCE_FILE, JSON.stringify({ balance: next }, null, 2));
}

let cachedRealBalance = 0;
let cachedRealTs = 0;
let cachedMaticBalance = 0;
let cachedMaticTs = 0;

export async function getRealBalance(): Promise<number> {
  const now = Date.now();
  if (now - cachedRealTs < 60_000 && cachedRealTs !== 0) {
    return cachedRealBalance;
  }

  const provider = new ethers.JsonRpcProvider(config.RPC_URL, 137, { staticNetwork: true });
  try {
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const usdcNativeInfo = { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' };
    const usdcBridgedInfo = { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' };

    const usdcNative = new ethers.Contract(usdcNativeInfo.address, abi, provider);
    const usdcBridged = new ethers.Contract(usdcBridgedInfo.address, abi, provider);

    const balNative = await usdcNative.balanceOf(config.WALLET_ADDRESS).catch(() => BigInt(0));
    const balBridged = await usdcBridged.balanceOf(config.WALLET_ADDRESS).catch(() => BigInt(0));
    
    const native = parseFloat(ethers.formatUnits(balNative, 6));
    const bridged = parseFloat(ethers.formatUnits(balBridged, 6));
    
    // Check CLOB Collateral
    let clobVal = 0;
    try {
      const resp = await clobClient.getBalanceAllowance({ asset_type: 'collateral' as any });
      clobVal = parseFloat((resp as any).collateral || '0');
    } catch (e) {}

    // Check Proxy
    let proxyBal = 0;
    try {
      const profile = await (clobClient as any).get(`${(clobClient as any).host}/profile`).catch(() => null);
      if (profile && profile.proxyAddress) {
        const pNative = await usdcNative.balanceOf(profile.proxyAddress).catch(() => BigInt(0));
        const pBridged = await usdcBridged.balanceOf(profile.proxyAddress).catch(() => BigInt(0));
        proxyBal = parseFloat(ethers.formatUnits(pNative, 6)) + parseFloat(ethers.formatUnits(pBridged, 6));
      }
    } catch (e) {}

    // Check Funder
    let funderBal = 0;
    if (config.FUNDER_ADDRESS) {
      const fNative = await usdcNative.balanceOf(config.FUNDER_ADDRESS).catch(() => BigInt(0));
      const fBridged = await usdcBridged.balanceOf(config.FUNDER_ADDRESS).catch(() => BigInt(0));
      funderBal = parseFloat(ethers.formatUnits(fNative, 6)) + parseFloat(ethers.formatUnits(fBridged, 6));
    }

    cachedRealBalance = native + bridged + clobVal + proxyBal + funderBal;
    cachedRealTs = now;
    return cachedRealBalance;
  } catch (error) {
    return cachedRealBalance; // return last known on error
  }
}

export async function getMaticBalance(): Promise<number> {
  const now = Date.now();
  if (now - cachedMaticTs < 60_000 && cachedMaticTs !== 0) {
    return cachedMaticBalance;
  }

  try {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL, 137, { staticNetwork: true });
    const balance = await provider.getBalance(config.WALLET_ADDRESS);
    cachedMaticBalance = parseFloat(ethers.formatEther(balance));
    cachedMaticTs = now;
    return cachedMaticBalance;
  } catch (error) {
    return cachedMaticBalance;
  }
}
