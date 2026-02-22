import { Keypair, Connection } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the payer keypair from the default Anchor wallet
 */
export function getPayer(): Keypair {
  const homedir = require('os').homedir();
  const walletPath = path.join(homedir, '.config', 'solana', 'id.json');

  if (!fs.existsSync(walletPath)) {
    throw new Error(
      `Wallet file not found at ${walletPath}. Please run 'solana-keygen new' first.`
    );
  }

  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

/**
 * Get a connection to the Solana cluster
 */
export function getConnection(cluster: 'devnet' | 'testnet' | 'mainnet' = 'devnet'): Connection {
  const urls = {
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
  };

  return new Connection(urls[cluster], 'confirmed');
}

/**
 * Get the current cluster from environment or default to devnet
 */
export function getCluster(): 'devnet' | 'testnet' | 'mainnet' {
  return (process.env.CLUSTER as any) || 'devnet';
}
