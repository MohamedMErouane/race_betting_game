// Usage: node derive-key.mjs "word1 word2 word3 ... word12"
// Derives the Solana keypair from a BIP39 mnemonic (Phantom-compatible)
// and prints the secret key array for .env.local

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';

const mnemonic = process.argv[2];
if (!mnemonic) {
  console.error('Usage: node derive-key.mjs "word1 word2 word3 ... word12"');
  process.exit(1);
}

const seed = await bip39.mnemonicToSeed(mnemonic);
// Phantom default derivation path: m/44'/501'/0'/0'
const derived = derivePath("m/44'/501'/0'/0'", Buffer.from(seed).toString('hex'));
const keypair = Keypair.fromSeed(derived.key);

console.log('Wallet address:', keypair.publicKey.toBase58());
console.log('');
console.log('Add this to .env.local:');
console.log(`HOUSE_PRIVATE_KEY=${JSON.stringify(Array.from(keypair.secretKey))}`);
