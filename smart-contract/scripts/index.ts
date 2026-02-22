/**
 * Demo Setup Scripts for Pulse
 *
 * This module provides scripts for initializing the Pulse smart contract
 * and creating demo data for testing.
 *
 * Usage:
 *   npm run init:config    - Initialize GlobalConfig (one-time)
 *   npm run create:demo   - Create sample events, tiers, and agents
 *   npm run setup:demo    - Run both init and create (full setup)
 *
 * Environment Variables:
 *   CLUSTER=devnet|testnet|mainnet-beta  (default: devnet)
 */

export { getPayer, getConnection, getCluster } from './utils';
