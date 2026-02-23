import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, type Idl } from '@coral-xyz/anchor';
import { useMemo, useState, useEffect, useCallback } from 'react';
import pulseIDL from '../idl/pulse.json';

// Export the program ID constant
export const PROGRAM_ID = new PublicKey('5fQA4eCdUtCJPDhjGfb6nn47RhVfKJT2dW5iHuQaeH2n');

interface ConnectionStatus {
  connected: boolean;
  blockHeight?: number;
  slot?: number;
}

export const useProgram = () => {
  const wallet = useWallet();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });

  const connection = useMemo(() => {
    // Use devnet for development, switch to mainnet-beta for production
    return new Connection('https://api.devnet.solana.com', {
      commitment: 'confirmed',
      wsEndpoint: 'wss://api.devnet.solana.com',
    });
  }, []);

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;

    return new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;

    return new Program(pulseIDL as Idl, provider);
  }, [provider]);

  // Monitor connection status
  useEffect(() => {
    let mounted = true;

    const updateConnectionStatus = async () => {
      try {
        const epochInfo = await connection.getEpochInfo();
        if (mounted) {
          setConnectionStatus({
            connected: true,
            blockHeight: epochInfo.blockHeight,
            slot: epochInfo.absoluteSlot,
          });
        }
      } catch (error) {
        console.error('Failed to get connection status:', error);
        if (mounted) {
          setConnectionStatus({ connected: false });
        }
      }
    };

    updateConnectionStatus();

    // Update every 30 seconds
    const interval = setInterval(updateConnectionStatus, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [connection]);

  // Refresh connection status
  const refreshStatus = useCallback(async () => {
    try {
      const epochInfo = await connection.getEpochInfo();
      setConnectionStatus({
        connected: true,
        blockHeight: epochInfo.blockHeight,
        slot: epochInfo.absoluteSlot,
      });
    } catch (error) {
      console.error('Failed to refresh connection status:', error);
      setConnectionStatus({ connected: false });
    }
  }, [connection]);

  return {
    program,
    connection,
    provider,
    programId: PROGRAM_ID,
    isConnected: !!wallet.publicKey,
    publicKey: wallet.publicKey,
    connectionStatus,
    refreshStatus,
  };
};
