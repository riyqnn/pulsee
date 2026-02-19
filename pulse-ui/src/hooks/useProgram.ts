import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import pulseIDL from '../idl/pulse.json';

// This would be the IDL type - you'd normally generate this from the IDL
export interface PulseIDL {
  version: string;
  name: string;
  instructions: any[];
  accounts: any[];
  events: any[];
  errors: any[];
  types: any[];
}

export const useProgram = () => {
  const wallet = useWallet();

  const connection = useMemo(() => {
    // Use devnet for development, switch to mainnet-beta for production
    return new Connection('https://api.devnet.solana.com', 'confirmed');
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

    // Load the IDL from the imported JSON
    // Anchor Program expects: (idl, provider)
    // The programId is inferred from the IDL or can be overridden in the provider
    return new Program(
      pulseIDL as unknown as PulseIDL,
      provider
    );
  }, [provider]);

  return {
    program,
    connection,
    provider,
    isConnected: !!wallet.publicKey,
    publicKey: wallet.publicKey,
  };
};

export const useAIAgent = () => {
  const { program, isConnected } = useProgram();

  const createAgent = async (agentConfig: {
    agentId: string;
    name: string;
    maxBudgetPerTicket: number;
    totalBudget: number;
    autoPurchaseEnabled: boolean;
    autoPurchaseThreshold: number;
    maxTicketsPerEvent: number;
  }) => {
    if (!program || !isConnected) {
      throw new Error('Wallet not connected');
    }

    // This would call the actual smart contract
    // For now, it's a placeholder implementation
    console.log('Creating AI Agent:', agentConfig);

    // TODO: Implement actual transaction
    // const tx = await program.methods
    //   .createAIAgent(...)
    //   .accounts({...})
    //   .rpc();

    return { success: true };
  };

  const getAgents = async () => {
    if (!program) return [];

    // TODO: Fetch agents from the blockchain
    return [];
  };

  return {
    createAgent,
    getAgents,
    isReady: !!program,
  };
};
