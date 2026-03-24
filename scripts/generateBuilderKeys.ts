import { ethers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

/**
 * Script to generate or retrieve Polymarket Builder API keys.
 * These keys are used for gasless redemption and trading.
 */
async function main() {
    const pk = process.env.POLY_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!pk) {
        console.error("❌ ERROR: PRIVATE_KEY not found in .env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/polygon');
    const signer = new ethers.Wallet(pk, provider);
    
    // Monkey-patch for clob-client (v5 checks)
    (signer as any)._signTypedData = (domain: any, types: any, value: any) => {
        return signer.signTypedData(domain, types, value);
    };
    (signer as any).account = { address: signer.address };

    console.log(`\n🔹 Wallet Address: ${signer.address}`);

    const host = 'https://clob.polymarket.com';
    const chainId = 137;

    // 1. Get standard API keys if needed
    // We'll prioritize derivation if standard keys fail later, or just start with them
    let apiKey = process.env.POLY_API_KEY || process.env.API_KEY;
    let apiSecret = process.env.POLY_API_SECRET || process.env.API_SECRET;
    let apiPassphrase = process.env.POLY_PASSPHRASE || process.env.PASSPHRASE;

    // Use throwOnError: true to catch API errors
    const client = new ClobClient(host, chainId, signer as any, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);

    async function getValidCreds() {
        if (apiKey && apiSecret && apiPassphrase) {
            console.log("🔸 Testing existing API keys...");
            try {
                const authed = new ClobClient(host, chainId, signer as any, { key: apiKey, secret: apiSecret, passphrase: apiPassphrase }, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
                await authed.getApiKeys();
                console.log("✅ Existing API keys are valid.");
                return { key: apiKey, secret: apiSecret, passphrase: apiPassphrase };
            } catch (e) {
                console.log("⚠️ Existing API keys are invalid. Attempting to derive new ones...");
            }
        }

        try {
            const creds = await client.deriveApiKey();
            console.log("✅ Derived Standard API Keys.");
            return creds;
        } catch (e: any) {
            console.log("🔸 Derivation failed, creating new API keys...");
            const creds = await client.createApiKey();
            console.log("✅ Created New Standard API Keys.");
            return creds;
        }
    }

    const creds = await getValidCreds();
    apiKey = creds.key;
    apiSecret = creds.secret;
    apiPassphrase = creds.passphrase;

    // 2. Initialize with standard creds for L2 auth
    const authedClient = new ClobClient(host, chainId, signer as any, {
        key: apiKey,
        secret: apiSecret,
        passphrase: apiPassphrase
    }, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);

    console.log("🔍 Checking for existing Builder API keys...");
    try {
        const builderKeys: any[] = await authedClient.getBuilderApiKeys();
        if (builderKeys && builderKeys.length > 0) {
            console.log("\n⚠️  Existing Builder API Key found, but secrets (Secret & Passphrase) cannot be retrieved for security reasons.");
            console.log(`Key: ${builderKeys[0].key || builderKeys[0].apiKey}`);
            console.log("\nIf you don't have the secret/passphrase, you must generate a NEW one.");
        }
    } catch (e) {
        // Fall through to creation if none exist
    }

    console.log("\n🔸 Generating a NEW Builder API Key (this will not revoke old one)...");
    try {
        const newBuilder: any = await authedClient.createBuilderApiKey();
        // Check if response has property key or apiKey
        const finalKey = newBuilder.key || newBuilder.apiKey;
        
        if (!finalKey || !newBuilder.secret) {
             throw new Error("API returned incomplete credentials. Check if you already have a key.");
        }

        console.log("\n🚀 New Builder API Key generated successfully:");
        console.log(`-----------------------------------`);
        console.log(`BUILDER_API_KEY=${finalKey}`);
        console.log(`BUILDER_SECRET=${newBuilder.secret}`);
        console.log(`BUILDER_PASSPHRASE=${newBuilder.passphrase}`);
        console.log(`-----------------------------------`);
        console.log("\n✅ Step 1: Add these values to your .env file.");
        console.log("✅ Step 2: Also update your standard API keys if they were changed:");
        console.log(`API_KEY=${apiKey}`);
        console.log(`API_SECRET=${apiSecret}`);
        console.log(`PASSPHRASE=${apiPassphrase}`);
    } catch (error: any) {
        console.error("\n❌ Failed to create Builder API key.");
        console.error("Reason:", error.message || error);
        console.log("\nTry manually at: https://polymarket.com/settings/api-keys");
    }
}

main().catch((err) => {
    console.error("❌ Fatal Error:", err);
});
