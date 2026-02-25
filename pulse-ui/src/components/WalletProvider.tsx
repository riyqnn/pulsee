import { 
  ConnectionProvider, 
  WalletProvider as SolanaWalletProvider 
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const endpoint = useMemo(() => "https://api.devnet.solana.com", []);
  
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};