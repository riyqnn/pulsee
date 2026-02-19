import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { NeoButton } from './neo';

export const WalletButton = () => {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <NeoButton variant={publicKey ? 'primary' : 'accent'} onClick={handleClick}>
      {publicKey ? shortenAddress(publicKey.toBase58()) : 'CONNECT WALLET'}
    </NeoButton>
  );
};
