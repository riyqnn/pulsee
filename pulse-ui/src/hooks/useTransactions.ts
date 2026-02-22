// Transaction Utilities Hook
// Handles transaction simulation, confirmation, and error mapping

import { useCallback, useState, useRef } from 'react';
import {
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import type { SendOptions, SignatureResult } from '@solana/web3.js';
import { useProgram } from './useProgram';
import { useWallet } from '@solana/wallet-adapter-react';
import { getErrorMessage } from '../types/pulse';

interface TransactionOptions extends SendOptions {
  skipPreflight?: boolean;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

interface TransactionError extends Error {
  code?: number;
  logs?: string[];
}

interface RecentTransaction {
  signature: string;
  timestamp: number;
  status: 'success' | 'error';
  description?: string;
}

interface UseTransactionsReturn {
  // Transaction Operations
  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    options?: TransactionOptions
  ) => Promise<string>;

  simulateTransaction: (
    transaction: Transaction | VersionedTransaction
  ) => Promise<boolean>;

  confirmTransaction: (
    signature: string,
    commitment?: 'processed' | 'confirmed' | 'finalized'
  ) => Promise<SignatureResult>;

  // Error Handling
  parseError: (error: unknown) => string;
  getUserFriendlyMessage: (error: unknown) => string;

  // Transaction History
  recentTransactions: RecentTransaction[];
  addTransaction: (tx: Omit<RecentTransaction, 'timestamp'>) => void;
  clearTransactions: () => void;

  // State
  isProcessing: boolean;
  processingCount: number;
}

export const useTransactions = (): UseTransactionsReturn => {
  const { connection } = useProgram();
  const { signTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const processingRef = useRef(0);

  /**
   * Send a transaction with automatic signing and confirmation
   */
  const sendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      options: TransactionOptions = {}
    ): Promise<string> => {
      if (!signTransaction) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      processingRef.current += 1;
      setProcessingCount(processingRef.current);

      try {
        // Sign the transaction
        let signedTx: Transaction | VersionedTransaction;

        if ('version' in transaction) {
          // VersionedTransaction
          signedTx = await signTransaction(transaction);
        } else {
          // Legacy Transaction
          signedTx = await signTransaction(transaction);
        }

        // Send the transaction
        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
          options
        );

        // Confirm the transaction
        const confirmation = await connection.confirmTransaction(
          signature,
          options.commitment ?? 'confirmed'
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return signature;
      } catch (err) {
        const error = err as Error;
        throw error;
      } finally {
        processingRef.current -= 1;
        setProcessingCount(processingRef.current);
        if (processingRef.current === 0) {
          setIsProcessing(false);
        }
      }
    },
    [connection, signTransaction]
  );

  /**
   * Simulate a transaction without sending it
   */
  const simulateTransaction = useCallback(
    async (transaction: Transaction | VersionedTransaction): Promise<boolean> => {
      try {
        let simulation;
        if ('version' in transaction) {
          simulation = await connection.simulateTransaction(transaction);
        } else {
          simulation = await connection.simulateTransaction(transaction);
        }

        if (simulation.value.err) {
          console.error('Simulation failed:', simulation.value.err);
          return false;
        }

        return true;
      } catch (err) {
        console.error('Simulation error:', err);
        return false;
      }
    },
    [connection]
  );

  /**
   * Confirm a transaction
   */
  const confirmTransaction = useCallback(
    async (
      signature: string,
      commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
    ): Promise<SignatureResult> => {
      const confirmation = await connection.confirmTransaction(signature, commitment);
      return confirmation.value;
    },
    [connection]
  );

  /**
   * Parse an error and return the error message
   */
  const parseError = useCallback((error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const err = error as TransactionError;

      // Check for program error code
      if ('code' in err && typeof err.code === 'number') {
        return getErrorMessage(err.code);
      }

      // Check for logs
      if ('logs' in err && Array.isArray(err.logs)) {
        const logError = err.logs.find((log) => log.includes('Error:'));
        if (logError) {
          return logError;
        }
      }

      return JSON.stringify(error);
    }

    return 'An unknown error occurred';
  }, []);

  /**
   * Get a user-friendly error message
   */
  const getUserFriendlyMessage = useCallback((error: unknown): string => {
    const parsedError = parseError(error);

    // Map common errors to friendly messages
    const friendlyMessages: Record<string, string> = {
      'User rejected the request': 'Transaction was cancelled',
      'Not enough SOL': 'Insufficient SOL balance. Please add more SOL to your wallet.',
      'Blockhash expired': 'Please try again. The transaction expired.',
    };

    for (const [key, message] of Object.entries(friendlyMessages)) {
      if (parsedError.includes(key)) {
        return message;
      }
    }

    return parsedError;
  }, [parseError]);

  /**
   * Add a transaction to recent history
   */
  const addTransaction = useCallback((tx: Omit<RecentTransaction, 'timestamp'>) => {
    const newTx: RecentTransaction = {
      ...tx,
      timestamp: Date.now(),
    };

    setRecentTransactions((prev) => {
      const updated = [newTx, ...prev].slice(0, 10); // Keep only last 10
      return updated;
    });
  }, []);

  /**
   * Clear transaction history
   */
  const clearTransactions = useCallback(() => {
    setRecentTransactions([]);
  }, []);

  return {
    // Transaction Operations
    sendTransaction,
    simulateTransaction,
    confirmTransaction,

    // Error Handling
    parseError,
    getUserFriendlyMessage,

    // Transaction History
    recentTransactions,
    addTransaction,
    clearTransactions,

    // State
    isProcessing,
    processingCount,
  };
};

// ============== Utility Functions ==============

/**
 * Get Solscan URL for a transaction signature
 */
export function getSolscanUrl(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/tx/${signature}${clusterParam}`;
}

/**
 * Get Solscan URL for an account
 */
export function getAccountSolscanUrl(address: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/account/${address}${clusterParam}`;
}
