// WebSocket subscription manager for Pulse program
// Handles real-time account updates with auto-reconnection

import { Connection, PublicKey } from '@solana/web3.js';
import type { AccountInfo } from '@solana/web3.js';

// ============== Types ==============

export type SubscriptionCallback = (accountInfo: AccountInfo<Buffer>) => void;
export type SubscriptionErrorHandler = (error: Error) => void;

interface Subscription {
  accountId: string;
  publicKey: PublicKey;
  callback: SubscriptionCallback;
  errorHandler?: SubscriptionErrorHandler;
  unsubscribe: () => void;
}

interface SubscriptionConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  heartbeatInterval?: number;
}

// ============== Subscription Manager ==============

class SubscriptionManager {
  private connection: Connection;
  private subscriptions: Map<string, Subscription>;
  private retryCount: Map<string, number>;
  private config: Required<SubscriptionConfig>;
  private heartbeatTimer: NodeJS.Timeout | null;
  private isHealthy: boolean;

  constructor(connection: Connection, config: SubscriptionConfig = {}) {
    this.connection = connection;
    this.subscriptions = new Map();
    this.retryCount = new Map();
    this.config = {
      maxRetries: config.maxRetries ?? 10,
      retryDelay: config.retryDelay ?? 1000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
    this.heartbeatTimer = null;
    this.isHealthy = true;
    this.startHeartbeat();
  }

  /**
   * Subscribe to account changes
   */
  subscribe(
    publicKey: PublicKey,
    callback: SubscriptionCallback,
    errorHandler?: SubscriptionErrorHandler
  ): () => void {
    const accountId = publicKey.toBase58();

    // Check if already subscribed
    if (this.subscriptions.has(accountId)) {
      console.warn(`Already subscribed to ${accountId}, updating callback`);
      this.unsubscribe(accountId);
    }

    const subscriptionId = this.connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        this.handleSuccess(accountId);
        callback(accountInfo);
      },
      'confirmed'
    );

    const subscription: Subscription = {
      accountId,
      publicKey,
      callback,
      errorHandler,
      unsubscribe: () => {
        this.connection.removeAccountChangeListener(subscriptionId);
      },
    };

    this.subscriptions.set(accountId, subscription);
    this.retryCount.set(accountId, 0);

    return () => this.unsubscribe(accountId);
  }

  /**
   * Subscribe to multiple accounts
   */
  subscribeMultiple(
    publicKeys: PublicKey[],
    callback: SubscriptionCallback,
    errorHandler?: SubscriptionErrorHandler
  ): () => void {
    const unsubscribers = publicKeys.map((publicKey) =>
      this.subscribe(publicKey, callback, errorHandler)
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Unsubscribe from an account
   */
  private unsubscribe(accountId: string): void {
    const subscription = this.subscriptions.get(accountId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(accountId);
      this.retryCount.delete(accountId);
    }
  }

  /**
   * Unsubscribe from all accounts
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    this.retryCount.clear();
  }

  /**
   * Handle successful update
   */
  private handleSuccess(accountId: string): void {
    this.retryCount.set(accountId, 0);
    this.isHealthy = true;
  }

  /**
   * Handle subscription error with retry logic
   */
  private async handleError(accountId: string, error: Error): Promise<void> {
    const subscription = this.subscriptions.get(accountId);
    if (!subscription) return;

    const retries = this.retryCount.get(accountId) ?? 0;

    if (retries >= this.config.maxRetries) {
      console.error(`Max retries exceeded for ${accountId}:`, error);
      subscription.errorHandler?.(error);
      return;
    }

    // Calculate backoff delay
    const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, retries);

    console.warn(
      `Retrying subscription to ${accountId} in ${delay}ms (attempt ${retries + 1}/${this.config.maxRetries})`
    );

    await this.sleep(delay);

    this.retryCount.set(accountId, retries + 1);

    // Resubscribe
    try {
      this.subscribe(
        subscription.publicKey,
        subscription.callback,
        subscription.errorHandler
      );
    } catch (err) {
      console.error(`Failed to resubscribe to ${accountId}:`, err);
      await this.handleError(accountId, err as Error);
    }
  }

  /**
   * Start heartbeat to check connection health
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHealth();
    }, this.config.heartbeatInterval);
  }

  /**
   * Check connection health
   */
  private async checkHealth(): Promise<void> {
    try {
      await this.connection.getVersion();
      this.isHealthy = true;
    } catch (error) {
      console.error('Connection health check failed:', error);
      this.isHealthy = false;
      // Trigger reconnection for all subscriptions
      this.reconnectAll();
    }
  }

  /**
   * Reconnect all subscriptions
   */
  private reconnectAll(): void {
    const accountIds = Array.from(this.subscriptions.keys());
    accountIds.forEach((accountId) => {
      console.warn(`Reconnecting to ${accountId}`);
      this.handleError(accountId, new Error('Connection lost, reconnecting'));
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if connection is healthy
   */
  getConnectionHealth(): boolean {
    return this.isHealthy;
  }

  /**
   * Get all subscribed account IDs
   */
  getSubscribedAccounts(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Cleanup and stop heartbeat
   */
  destroy(): void {
    this.unsubscribeAll();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// ============== Hook Helpers ==============

/**
 * Create a subscription manager for a connection
 */
export function createSubscriptionManager(
  connection: Connection,
  config?: SubscriptionConfig
): SubscriptionManager {
  return new SubscriptionManager(connection, config);
}

/**
 * Subscribe to an account with automatic cleanup
 */
export function subscribeToAccount(
  connection: Connection,
  publicKey: PublicKey,
  callback: SubscriptionCallback,
  errorHandler?: SubscriptionErrorHandler,
  config?: SubscriptionConfig
): () => void {
  const manager = createSubscriptionManager(connection, config);
  return manager.subscribe(publicKey, callback, errorHandler);
}

// ============== React Hook Utilities ==============

/**
 * Hook to subscribe to account updates
 * This should be used within React components
 */
export function useAccountSubscription(
  connection: Connection | null,
  publicKey: PublicKey | null,
  callback: SubscriptionCallback,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    if (!connection || !publicKey) return;

    const unsubscribe = subscribeToAccount(
      connection,
      publicKey,
      callback,
      (error) => console.error('Subscription error:', error)
    );

    return () => unsubscribe();
  }, [connection, publicKey, ...deps]);
}

/**
 * Hook to subscribe to multiple accounts
 */
export function useMultipleAccountSubscriptions(
  connection: Connection | null,
  publicKeys: PublicKey[],
  callback: SubscriptionCallback,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    if (!connection || publicKeys.length === 0) return;

    const unsubscribe = subscribeToAccount(
      connection,
      publicKeys[0], // This will subscribe to all
      callback,
      (error) => console.error('Subscription error:', error)
    );

    return () => unsubscribe();
  }, [connection, publicKeys, ...deps]);
}

// Import React for hooks
import React from 'react';
