import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// ── House Wallet ───────────────────────────────────────────────────────────
// Single server-controlled wallet that:
//   1. Receives 100% of all bets from players
//   2. Pays out winners from the pool
//   3. Keeps losers' bets as house profit
//
// Set HOUSE_PRIVATE_KEY in .env.local to use your own wallet.
// If not set, a keypair is auto-generated (dev/testing mode).
// Use globalThis to survive HMR / Fast Refresh in dev mode.

const globalHouse = globalThis as typeof globalThis & { __houseKeypair?: Keypair };

if (!globalHouse.__houseKeypair) {
  // Priority: HOUSE_PRIVATE_KEY > ESCROW_PRIVATE_KEY (legacy) > auto-generate
  const HOUSE_KEY_ENV = process.env.HOUSE_PRIVATE_KEY ?? process.env.ESCROW_PRIVATE_KEY;
  if (HOUSE_KEY_ENV) {
    const secretKey = Uint8Array.from(JSON.parse(HOUSE_KEY_ENV));
    globalHouse.__houseKeypair = Keypair.fromSecretKey(secretKey);
    console.log('[House] Loaded house wallet from env:', globalHouse.__houseKeypair.publicKey.toBase58());
  } else {
    globalHouse.__houseKeypair = Keypair.generate();
    const pubkey = globalHouse.__houseKeypair.publicKey.toBase58();
    console.log('[House] ⚠️  Generated NEW house wallet (dev mode):', pubkey);
    console.log('[House] ⚠️  Set HOUSE_PRIVATE_KEY in .env.local to use your own wallet');

    // Auto-save to .env.local so it persists across restarts
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      const keyJson = JSON.stringify(Array.from(globalHouse.__houseKeypair.secretKey));
      const envLine = `HOUSE_PRIVATE_KEY=${keyJson}\n`;
      if (fs.existsSync(envPath)) {
        const existing = fs.readFileSync(envPath, 'utf8');
        if (!existing.includes('HOUSE_PRIVATE_KEY')) {
          fs.appendFileSync(envPath, envLine);
          console.log('[House] Saved keypair to .env.local');
        }
      } else {
        fs.writeFileSync(envPath, envLine);
        console.log('[House] Created .env.local with keypair');
      }
    } catch (err) {
      console.warn('[House] Could not auto-save keypair to .env.local:', err instanceof Error ? err.message : err);
      console.log('[House] Secret key (save manually):', JSON.stringify(Array.from(globalHouse.__houseKeypair.secretKey)));
    }
  }
}

const houseKeypair = globalHouse.__houseKeypair;
console.log('[House] House wallet address:', houseKeypair.publicKey.toBase58());

// Legacy alias: "escrow" still exported so existing imports don't break
export const escrow = {
  keypair: houseKeypair,
  publicKey: houseKeypair.publicKey,
  address: houseKeypair.publicKey.toBase58(),
};

// Direct house wallet exports
export const houseWallet = escrow;
export const HOUSE_WALLET = houseKeypair.publicKey;

// Solana connection (server-side)
export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Airdrop SOL to house wallet if balance is low (Devnet only)
export async function ensureEscrowFunded(minBalance = 0.5): Promise<void> {
  const balance = await connection.getBalance(houseWallet.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`[House] Balance: ${solBalance} SOL`);

  if (solBalance < minBalance) {
    console.log(`[House] Balance low (${solBalance} SOL), requesting airdrop...`);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const sig = await connection.requestAirdrop(houseWallet.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
        console.log('[House] Airdrop confirmed');
        return;
      } catch {
        console.warn(`[House] Airdrop attempt ${attempt + 1}/3 failed — rate limited`);
        if (attempt < 2) await new Promise(r => setTimeout(r, 3000));
      }
    }
    console.warn(`[House] ⚠️  House wallet has ${solBalance} SOL — fund manually at: https://faucet.solana.com`);
    console.warn(`[House] ⚠️  House wallet address: ${houseWallet.address}`);
  }
}
